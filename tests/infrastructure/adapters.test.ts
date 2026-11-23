import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BN, BorshInstructionCoder, Program, utils } from '@anchor-lang/core';
import {
  BPF_LOADER_PROGRAM_ID, Connection, Keypair, PublicKey, SendTransactionError,
  Transaction,
} from '@solana/web3.js';
import type {
  AccountInfo, BlockheightBasedTransactionConfirmationStrategy, GetProgramAccountsFilter,
  RpcResponseAndContext, SignatureResult,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import { RepositoryError } from '../../frontend/src/domain/errors';
import { createRepositories } from '../../frontend/src/infrastructure/anchor/client';
import { mapError } from '../../frontend/src/infrastructure/anchor/errors';
import { IDL } from '../../frontend/src/infrastructure/anchor/generated/khiputrace';
import type { Khiputrace } from '../../frontend/src/infrastructure/anchor/generated/khiputrace';
import { AccountReader } from '../../frontend/src/infrastructure/anchor/accounts';
import { mapAudit, mapFinding, rustTrim } from '../../frontend/src/infrastructure/anchor/mappers';
import type { AuditAccount, FindingAccount } from '../../frontend/src/infrastructure/anchor/mappers';
import { networkConfig } from '../../frontend/src/infrastructure/solana/config';
import type { ChainGateway } from '../../frontend/src/infrastructure/solana/gateway';
import { auditPda, encodeId, findingPda, MAX_U64 } from '../../frontend/src/infrastructure/solana/pdas';
import { ChainSession, DEVNET_GENESIS } from '../../frontend/src/infrastructure/solana/session';

const programId = new PublicKey(IDL.address); // Identidad compilada, nunca despliegue de prueba inventado.
const config = networkConfig({ cluster: 'localnet', programId: IDL.address });
const program = new Program<Khiputrace>(IDL, { connection: new Connection(config.endpoint) });
const info = (data: Buffer, owner = programId): AccountInfo<Buffer> => ({
  data, owner, lamports: 10000000, executable: false, rentEpoch: 0,
});
const code = (expected: RepositoryError['code']) => (error: unknown) => error instanceof RepositoryError && error.code === expected;

class FakeRpc implements ChainGateway {
  genesis = 'genesis-exclusivo-del-harness-local';
  accounts = new Map<string, AccountInfo<Buffer>>();
  entries: { pubkey: PublicKey; account: AccountInfo<Buffer> }[] = [];
  filters: GetProgramAccountsFilter[] = [];
  sent: Transaction[] = [];
  validity = { blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 100 };
  confirmed: BlockheightBasedTransactionConfirmationStrategy | null = null;
  confirmation: () => Promise<RpcResponseAndContext<SignatureResult>> = async () => ({ context: { slot: 2 }, value: { err: null } });
  sendError: Error | null = null;
  listError: Error | null = null;
  constructor() {
    this.accounts.set(IDL.address, { ...info(Buffer.alloc(0), BPF_LOADER_PROGRAM_ID), executable: true });
  }
  async getGenesisHash() { return this.genesis; }
  async getAccountInfo(address: PublicKey) { return this.accounts.get(address.toBase58()) ?? null; }
  async getProgramAccounts(_programId: PublicKey, query: { filters: GetProgramAccountsFilter[] }) {
    if (this.listError) throw this.listError;
    this.filters = query.filters;
    return this.entries;
  }
  async getLatestBlockhash() { return this.validity; }
  async sendRawTransaction(raw: Uint8Array) {
    if (this.sendError) throw this.sendError;
    const transaction = Transaction.from(raw);
    this.sent.push(transaction);
    assert(transaction.signature);
    return utils.bytes.bs58.encode(transaction.signature);
  }
  async confirmTransaction(strategy: BlockheightBasedTransactionConfirmationStrategy) {
    this.confirmed = strategy;
    return this.confirmation();
  }
}

function fixture() {
  const rpc = new FakeRpc();
  const key = Keypair.generate();
  const wallet = { publicKey: key.publicKey, async signTransaction(transaction: Transaction) {
    transaction.partialSign(key);
    return transaction;
  } };
  const ports = createRepositories(config, () => wallet, rpc);
  const reader = new AccountReader(new ChainSession(rpc, config), program);
  return { rpc, key, wallet, ports, reader };
}

function auditRaw(authority = Keypair.generate().publicKey, id = 42n): AuditAccount {
  return { version: 1, authority, auditId: new BN(id.toString()), title: 'Auditoría sintética',
    nextFindingId: new BN(2), activeFindings: new BN(1), openFindings: new BN(1),
    bump: auditPda(programId, authority, id)[1] };
}
function findingRaw(audit: PublicKey): FindingAccount {
  return { version: 1, audit, findingId: new BN(1), title: 'Hallazgo sintético', description: 'Descripción sintética',
    severity: { high: {} }, status: { open: {} }, remediationNote: '', bump: findingPda(programId, audit, 1n)[1] };
}
async function encoded(name: 'audit' | 'finding', raw: AuditAccount | FindingAccount) {
  const bytes = await program.coder.accounts.encode(name, raw);
  const result = Buffer.alloc(name === 'audit' ? 174 : 1184);
  bytes.copy(result);
  return info(result);
}

test('IDL coincide con Rust, sus discriminators y cinco instrucciones', () => {
  const rust = readFileSync('programs/khiputrace/src/lib.rs', 'utf8');
  assert(rust.includes(`declare_id!("${IDL.address}")`));
  const raw = JSON.parse(readFileSync('frontend/src/infrastructure/anchor/generated/khiputrace.json', 'utf8')) as {
    instructions: { name: string; discriminator: number[] }[];
  };
  assert.equal(raw.instructions.length, 5);
  for (const instruction of raw.instructions) {
    assert(rust.includes(`pub fn ${instruction.name}(`));
    assert.deepEqual(instruction.discriminator, [...createHash('sha256').update(`global:${instruction.name}`).digest().subarray(0, 8)]);
  }
});

test('PDAs e IDs u64 little-endian, sin conversión a number', () => {
  const authority = Keypair.generate().publicKey;
  for (const id of [0n, 1n, 256n, 9007199254740993n, MAX_U64]) {
    assert.equal(encodeId(id).readBigUInt64LE(), id);
    const expected = PublicKey.findProgramAddressSync([Buffer.from('audit'), authority.toBuffer(), encodeId(id)], programId);
    assert.deepEqual(auditPda(programId, authority, id), expected);
    assert.notEqual(findingPda(programId, expected[0], id)[0].toBase58(), expected[0].toBase58());
  }
  assert.throws(() => encodeId(-1n), RangeError);
  assert.throws(() => encodeId(MAX_U64 + 1n), RangeError);
});

test('mapeos Audit/Finding preservan u64, enums y acción correctiva', () => {
  const raw = auditRaw(undefined, 9007199254740993n);
  const address = auditPda(programId, raw.authority, BigInt(raw.auditId.toString()))[0];
  const audit = mapAudit(programId, address, raw);
  assert.equal(audit.id, 9007199254740993n);
  const finding = findingRaw(address);
  const pda = findingPda(programId, address, 1n)[0];
  assert.equal(mapFinding(programId, pda, finding, audit).correctiveAction, null);
  const resolved = { ...finding, status: { resolved: {} }, remediationNote: '🦙'.repeat(10) };
  assert.equal(mapFinding(programId, pda, resolved, audit).correctiveAction, '🦙'.repeat(10));
  for (const invalid of [
    { ...raw, version: 2 }, { ...raw, bump: (raw.bump + 1) % 256 },
    { ...raw, openFindings: new BN(3) }, { ...raw, title: 'é'.repeat(49) },
  ]) assert.throws(() => mapAudit(programId, address, invalid), code('invalidAccount'));
  for (const invalid of [
    { ...finding, remediationNote: 'inesperada' }, { ...resolved, remediationNote: '🦙'.repeat(9) },
    { ...resolved, remediationNote: 'é'.repeat(257) },
    { ...finding, findingId: new BN(2) }, { ...finding, audit: raw.authority },
    { ...finding, severity: { unknown: {} } } as unknown as FindingAccount,
    { ...finding, status: { open: {}, resolved: {} } } as unknown as FindingAccount,
  ]) assert.throws(() => mapFinding(programId, pda, invalid, audit), code('invalidAccount'));
  assert.equal(rustTrim('\u0085acción correctiva\u0085'), 'acción correctiva');
  assert.equal(rustTrim('\ufeffacción correctiva'), '\ufeffacción correctiva');
});

test('IDL decodifica cuentas reales de la evidencia SBF 1.3, sin presentarlas como Devnet', () => {
  const report = JSON.parse(readFileSync('docs/evidence/1.3-sbf-transactions.json', 'utf8')) as {
    runtime: string; program_id: string; transactions: { state_after: Record<string, string | null> }[];
  };
  assert(report.runtime.includes('sin RPC'));
  // La evidencia histórica conserva owner y PDAs de su identidad original.
  // Solo el esquema IDL se comparte; no convertirla al despliegue actual.
  const historicalProgramId = new PublicKey(report.program_id);
  let audits = 0, findings = 0, resolved = 0;
  for (const transaction of report.transactions) {
    const state = new Map<string, AccountInfo<Buffer>>();
    for (const [address, value] of Object.entries(transaction.state_after)) {
      if (!value) continue;
      const account = JSON.parse(value) as { owner: string; data: number[]; executable: boolean; lamports: number; rentEpoch: number };
      if (account.owner === report.program_id) state.set(address, {
        ...info(Buffer.from(account.data), historicalProgramId), executable: account.executable,
      });
    }
    // Solo ciclo positivo: los fixtures numéricos corruptos son otros casos.
    if (audits > 0 && findings > 0 && resolved > 0) break;
    for (const [address, account] of state) {
      if (account.data.length !== 174) continue;
      const audit = mapAudit(historicalProgramId, new PublicKey(address),
        program.coder.accounts.decode<AuditAccount>('audit', account.data));
      audits++;
      for (const [key, candidate] of state) {
        if (candidate.data.length !== 1184) continue;
        const finding = mapFinding(historicalProgramId, new PublicKey(key),
          program.coder.accounts.decode<FindingAccount>('finding', candidate.data), audit);
        findings++;
        if (finding.status === 'resolved') resolved++;
      }
    }
  }
  assert(audits > 0 && findings > 0 && resolved > 0);
});

test('lecturas y listados validan cuentas y filtros, y distinguen ausencia de fallo RPC', async () => {
  const { rpc, ports } = fixture();
  const raw = auditRaw();
  const address = auditPda(programId, raw.authority, 42n)[0];
  const auditInfo = await encoded('audit', raw);
  rpc.accounts.set(address.toBase58(), auditInfo);
  const finding = findingRaw(address);
  const pda = findingPda(programId, address, 1n)[0];
  const findingInfo = await encoded('finding', finding);
  rpc.accounts.set(pda.toBase58(), findingInfo);
  assert.equal((await ports.auditReader.getAudit(address.toBase58()))?.id, 42n);
  assert.equal((await ports.findingReader.getFinding({ audit: address.toBase58(), id: 1n }))?.severity, 'high');
  assert.equal(await ports.findingReader.getFinding({ audit: address.toBase58(), id: 0n }), null);
  rpc.entries = [{ pubkey: address, account: auditInfo }];
  assert.equal((await ports.auditReader.listAudits(raw.authority.toBase58())).length, 1);
  assert.deepEqual(rpc.filters[2], { memcmp: { offset: 9, bytes: raw.authority.toBase58() } });
  await assert.rejects(ports.auditReader.listAudits(Keypair.generate().publicKey.toBase58()), code('invalidAccount'));
  rpc.entries = [{ pubkey: pda, account: findingInfo }];
  assert.equal((await ports.findingReader.listFindings(address.toBase58())).length, 1);
  rpc.listError = new Error('RPC sintético caído');
  await assert.rejects(ports.findingReader.listFindings(address.toBase58()), code('network'));
});

test('rechaza owner, discriminator, espacio y PDA al leer', async () => {
  const { reader } = fixture();
  const raw = auditRaw();
  const address = auditPda(programId, raw.authority, 42n)[0];
  const valid = await encoded('audit', raw);
  for (const invalid of [
    { ...valid, owner: PublicKey.default }, { ...valid, executable: true },
    { ...valid, data: Buffer.alloc(174) }, { ...valid, data: valid.data.subarray(0, 100) },
  ]) assert.throws(() => reader.audit(address, invalid), code('invalidAccount'));
  assert.throws(() => reader.audit(raw.authority, valid), code('invalidAccount'));
});

test('configuración sin Program ID por defecto, coherente con IDL y redes permitidas', async () => {
  for (const input of [
    { cluster: 'mainnet-beta', programId: IDL.address }, { cluster: 'devnet', programId: '' },
    { cluster: 'devnet', programId: PublicKey.default.toBase58() },
    { cluster: 'localnet', programId: IDL.address, endpoint: 'https://api.mainnet-beta.solana.com' },
    { cluster: 'devnet', programId: IDL.address, endpoint: 'https://api.testnet.solana.com' },
    { cluster: 'localnet', programId: IDL.address, endpoint: 'http://localhost.evil:8899' },
  ]) assert.throws(() => networkConfig(input), code('configuration'));
  const { rpc, ports } = fixture();
  rpc.genesis = DEVNET_GENESIS;
  await assert.rejects(ports.auditReader.listAudits(Keypair.generate().publicKey.toBase58()), code('configuration'));
  rpc.genesis = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
  await assert.rejects(ports.auditReader.getAudit(IDL.address), code('configuration'));
  rpc.genesis = 'genesis-exclusivo-del-harness-local';
  rpc.accounts.delete(IDL.address);
  await assert.rejects(ports.auditWriter.createAudit({ id: 0n, title: 'Ejemplo' }), code('programUnavailable'));
  assert.equal(rpc.sent.length, 0);
});

test('cinco escrituras usan instrucciones tipadas, PDAs y confirmación con blockhash', async () => {
  const { rpc, ports, key } = fixture();
  const id = 9007199254740993n;
  const audit = auditPda(programId, key.publicKey, id)[0].toBase58();
  const identity = { audit, id: 7n };
  await ports.auditWriter.createAudit({ id, title: 'Auditoría' });
  await ports.findingWriter.createFinding({ audit, expectedNextId: 7n, title: 'Hallazgo', description: 'Detalle', severity: 'critical' });
  await ports.findingWriter.updateFinding({ ...identity, title: 'Actualizado', description: 'Detalle', severity: 'low' });
  await ports.findingWriter.resolveFinding({ ...identity, correctiveAction: 'Corrección aplicada' });
  const receipt = await ports.findingWriter.closeFinding(identity);
  assert.equal(rpc.sent.length, 5);
  const names = ['createAudit', 'createFinding', 'updateFinding', 'resolveFinding', 'closeFinding'];
  rpc.sent.forEach((transaction, index) => {
    const ix = transaction.instructions[0];
    assert(ix);
    assert(ix.programId.equals(programId));
    const decoded = new BorshInstructionCoder(IDL).decode(ix.data);
    assert.equal(decoded?.name, names[index]);
    if (index > 0) assert(ix.keys[2]?.pubkey.equals(findingPda(programId, new PublicKey(audit), 7n)[0]));
  });
  assert.deepEqual(rpc.confirmed, { signature: receipt.reference, ...rpc.validity });
  const first = rpc.sent[0]?.instructions[0];
  assert(first);
  assert.equal(first.data.readBigUInt64LE(8), id);
});

test('no devuelve éxito antes de confirmar', async () => {
  const { rpc, ports } = fixture();
  let resolveConfirmation: ((value: RpcResponseAndContext<SignatureResult>) => void) | undefined;
  let entered: (() => void) | undefined;
  const waiting = new Promise<void>((resolve) => { entered = resolve; });
  rpc.confirmation = () => { entered?.(); return new Promise((resolve) => { resolveConfirmation = resolve; }); };
  let completed = false;
  const operation = ports.auditWriter.createAudit({ id: 1n, title: 'Auditoría' }).then((receipt) => { completed = true; return receipt; });
  await waiting;
  assert.equal(completed, false);
  assert(resolveConfirmation);
  resolveConfirmation({ context: { slot: 4 }, value: { err: null } });
  assert((await operation).reference);
});

test('errores confirmados y confirmación incierta conservan firma sin éxito ni reenvío', async () => {
  const { rpc, ports } = fixture();
  rpc.confirmation = async () => ({ context: { slot: 3 }, value: { err: { InstructionError: [0, { Custom: 6004 }] } } });
  await assert.rejects(ports.auditWriter.createAudit({ id: 1n, title: 'Ejemplo' }), (error: unknown) =>
    error instanceof RepositoryError && error.code === 'programRejected' && error.programCode === 6004 && error.reference !== null);
  rpc.confirmation = async () => { throw new Error('Timeout sintético'); };
  await assert.rejects(ports.auditWriter.createAudit({ id: 2n, title: 'Ejemplo' }), (error: unknown) =>
    error instanceof RepositoryError && error.code === 'confirmationUnknown' && error.reference !== null);
  assert.equal(rpc.sent.length, 2);
  rpc.sendError = new Error('Conexión interrumpida tras envío posible');
  await assert.rejects(ports.auditWriter.createAudit({ id: 3n, title: 'Ejemplo' }), (error: unknown) =>
    error instanceof RepositoryError && error.code === 'confirmationUnknown' && error.reference !== null);
});

test('errores Anchor de simulación y rechazo de wallet no se confunden con confirmación', async () => {
  const logs = [
    `Program ${IDL.address} invoke [1]`,
    'Program log: AnchorError occurred. Error Code: Unauthorized. Error Number: 6000. Error Message: La wallet no es la autoridad de la auditoría..',
    `Program ${IDL.address} failed: custom program error: 0x1770`,
  ];
  const { rpc, ports } = fixture();
  rpc.sendError = new SendTransactionError({ action: 'simulate', signature: '', transactionMessage: 'Rechazo sintético', logs });
  await assert.rejects(ports.auditWriter.createAudit({ id: 1n, title: 'Ejemplo' }), code('programRejected'));
  assert.equal(mapError({ code: 4001 }).code, 'walletRejected');
  const noWallet = createRepositories(config, () => null, rpc);
  await assert.rejects(noWallet.auditWriter.createAudit({ id: 1n, title: 'Ejemplo' }), code('walletUnavailable'));
});

test('wallet modificada o red cambiada durante firma se rechazan antes del envío', async () => {
  const { rpc, wallet } = fixture();
  const changed = { publicKey: wallet.publicKey, async signTransaction(transaction: Transaction) {
    transaction.recentBlockhash = Keypair.generate().publicKey.toBase58();
    return wallet.signTransaction(transaction);
  } };
  await assert.rejects(createRepositories(config, () => changed, rpc).auditWriter.createAudit({ id: 1n, title: 'Ejemplo' }), code('walletRejected'));
  const networkChange = { publicKey: wallet.publicKey, async signTransaction(transaction: Transaction) {
    const signed = await wallet.signTransaction(transaction);
    rpc.genesis = DEVNET_GENESIS;
    return signed;
  } };
  await assert.rejects(createRepositories(config, () => networkChange, rpc).auditWriter.createAudit({ id: 1n, title: 'Ejemplo' }), code('configuration'));
  assert.equal(rpc.sent.length, 0);
});

test('transporte JSON-RPC real de web3.js funciona con jayson corregido y respuestas sintéticas', async () => {
  const calls: string[] = [];
  const connection = new Connection('http://127.0.0.1:8899', { fetch: async (_url, init) => {
    const request = JSON.parse(String(init?.body)) as { method: string; id: string };
    calls.push(request.method);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: DEVNET_GENESIS }), { status: 200 });
  } });
  assert.equal(await connection.getGenesisHash(), DEVNET_GENESIS);
  assert.deepEqual(calls, ['getGenesisHash']);
});

test('cambio de wallet o firma ausente se rechazan sin enviar', async () => {
  const { rpc, wallet } = fixture();
  let current = wallet;
  const switching = { publicKey: wallet.publicKey, async signTransaction(transaction: Transaction) {
    const signed = await wallet.signTransaction(transaction);
    const next = Keypair.generate();
    current = { publicKey: next.publicKey, async signTransaction(tx: Transaction) { tx.partialSign(next); return tx; } };
    return signed;
  } };
  current = switching;
  await assert.rejects(createRepositories(config, () => current, rpc).auditWriter.createAudit({ id: 1n, title: 'Ejemplo' }), code('walletRejected'));
  const unsigned = { publicKey: wallet.publicKey, async signTransaction(transaction: Transaction) { return transaction; } };
  await assert.rejects(createRepositories(config, () => unsigned, rpc).auditWriter.createAudit({ id: 1n, title: 'Ejemplo' }), code('walletRejected'));
  const rejected = { publicKey: wallet.publicKey, async signTransaction(): Promise<Transaction> { throw new Error('Wallet sintética sin código 4001'); } };
  await assert.rejects(createRepositories(config, () => rejected, rpc).auditWriter.createAudit({ id: 1n, title: 'Ejemplo' }), code('walletRejected'));
  assert.equal(rpc.sent.length, 0);
});

test('el programa debe ser ejecutable, el genesis Devnet debe coincidir y entradas inválidas fallan', async () => {
  const { rpc, ports } = fixture();
  rpc.accounts.set(IDL.address, { ...info(Buffer.alloc(0)), executable: false });
  await assert.rejects(ports.auditReader.getAudit(IDL.address), code('programUnavailable'));
  rpc.accounts.set(IDL.address, { ...info(Buffer.alloc(0), PublicKey.default), executable: true });
  await assert.rejects(ports.auditReader.getAudit(IDL.address), code('programUnavailable'));
  const devnet = networkConfig({ cluster: 'devnet', programId: IDL.address });
  await assert.rejects(createRepositories(devnet, () => null, rpc).auditReader.getAudit(IDL.address), code('configuration'));
  const healthy = fixture();
  await assert.rejects(healthy.ports.auditReader.getAudit('dirección inválida'), code('configuration'));
  await assert.rejects(healthy.ports.auditWriter.createAudit({ id: MAX_U64 + 1n, title: 'Ejemplo' }), code('configuration'));
  assert.equal(healthy.rpc.sent.length, 0);
});

test('cambio de wallet durante la última comprobación RPC impide el envío', async () => {
  const { rpc, wallet } = fixture();
  let current: typeof wallet | null = wallet;
  let reads = 0;
  const original = rpc.getGenesisHash.bind(rpc);
  rpc.getGenesisHash = async () => {
    const genesis = await original();
    if (++reads === 2) current = null;
    return genesis;
  };
  await assert.rejects(createRepositories(config, () => current, rpc).auditWriter.createAudit({ id: 1n, title: 'Auditoría sintética' }), code('walletUnavailable'));
  assert.equal(reads, 2);
  assert.equal(rpc.sent.length, 0);
});
