import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { AnchorError, BN, Program, Wallet } from '@anchor-lang/core';
import { Connection, PublicKey, SendTransactionError, SystemProgram, Transaction } from '@solana/web3.js';
import type { TransactionInstruction } from '@solana/web3.js';
import { createAppServices } from '../../frontend/src/composition/create-services';
import type { Audit, Finding } from '../../frontend/src/domain/entities';
import { RepositoryError } from '../../frontend/src/domain/errors';
import { AccountReader } from '../../frontend/src/infrastructure/anchor/accounts';
import { createRepositories } from '../../frontend/src/infrastructure/anchor/client';
import { IDL } from '../../frontend/src/infrastructure/anchor/generated/khiputrace';
import type { Khiputrace } from '../../frontend/src/infrastructure/anchor/generated/khiputrace';
import type { FindingAccount } from '../../frontend/src/infrastructure/anchor/mappers';
import { networkConfig } from '../../frontend/src/infrastructure/solana/config';
import { auditPda, findingPda } from '../../frontend/src/infrastructure/solana/pdas';
import { ChainSession, DEVNET_GENESIS } from '../../frontend/src/infrastructure/solana/session';

interface Snapshot {
  slot: number;
  accounts: Record<string, { owner: string; executable: boolean; lamports: number; base64: string } | null>;
  audits: Record<string, Audit>;
  findings: Record<string, Finding>;
}
interface CaseRecord {
  id: string; expected: string; status: 'pending' | 'running' | 'passed' | 'failed';
  initial?: Snapshot; final?: Snapshot; observed?: unknown; signature?: string | null;
  explorer?: string | null; error?: unknown;
  reconciled?: unknown;
}
const destination = 'docs/evidence/4.2-devnet-acceptance.json';
const resume = process.argv.includes('--resume');
const report: Record<string, unknown> = resume ? JSON.parse(readFileSync(destination, 'utf8')) as Record<string, unknown>
  : { startedAtUtc: new Date().toISOString(), network: 'devnet', programId: IDL.address, cases: [],
    scope: 'Application/Infrastructure reales y rechazos firmados en preflight Devnet; no extensión de navegador.' };
const cases = report.cases as CaseRecord[];
const stringify = (value: unknown) => JSON.stringify(value, (_key, entry: unknown) => typeof entry === 'bigint' ? entry.toString() : entry, 2);
function save() { writeFileSync(destination, `${stringify(report)}\n`); }
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function read<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error: unknown) {
      if (attempt >= 2) throw error;
      console.log(`Reintento de lectura RPC ${attempt + 1}: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(1000 * (attempt + 1));
    }
  }
}

function localWallet(path: string) {
  const previous = process.env.ANCHOR_WALLET;
  process.env.ANCHOR_WALLET = path;
  try { return Wallet.local(); }
  finally { if (previous === undefined) delete process.env.ANCHOR_WALLET; else process.env.ANCHOR_WALLET = previous; }
}

async function main() {
  assert(process.argv.includes('--execute'));
  const config = networkConfig({ cluster: 'devnet', programId: IDL.address });
  const rpc = new Connection(config.endpoint, 'confirmed');
  assert.equal(await rpc.getGenesisHash(), DEVNET_GENESIS);
  const authority = localWallet(`${homedir()}/.local/share/khiputrace/devnet/deployer-keypair.json`);
  const outsider = localWallet(`${homedir()}/.local/share/khiputrace/devnet/4.2-unauthorized-keypair.json`);
  assert.equal(authority.publicKey.toBase58(), 'Bd6Xa9JV3x3hZVkEnuGnH323MZxhYuCXuRe6DFSK3LKT');
  assert(!outsider.publicKey.equals(authority.publicKey));
  const balanceStart = resume ? report.balanceStartLamports as number : await read(() => rpc.getBalance(authority.publicKey, 'confirmed'));
  assert.equal(typeof balanceStart, 'number');
  assert(balanceStart > 100000000, 'Se requiere margen para pruebas Devnet.');
  const program = new Program<Khiputrace>(IDL, { connection: rpc });
  const session = new ChainSession(rpc, config);
  await session.assertReady();
  const reader = new AccountReader(session, program);
  const services = createAppServices(createRepositories(config, () => authority, rpc));
  const audit = auditPda(config.programId, authority.publicKey, 202611220420n)[0];
  const other = auditPda(config.programId, authority.publicKey, 202611220421n)[0];
  const invalidAudit = auditPda(config.programId, authority.publicKey, 202611220422n)[0];
  const finding0 = findingPda(config.programId, audit, 0n)[0];
  const finding1 = findingPda(config.programId, audit, 1n)[0];
  const tracked = [audit, other, invalidAudit, finding0, finding1];
  let minimumSlot = 0;
  async function snapshot(): Promise<Snapshot> {
    const result = await read(() => rpc.getMultipleAccountsInfoAndContext(tracked, { commitment: 'confirmed', minContextSlot: minimumSlot }));
    minimumSlot = Math.max(minimumSlot, result.context.slot);
    const value: Snapshot = { slot: result.context.slot, accounts: {}, audits: {}, findings: {} };
    for (const [index, key] of tracked.entries()) {
      const info = result.value[index] ?? null;
      value.accounts[key.toBase58()] = info === null ? null : { owner: info.owner.toBase58(), executable: info.executable,
        lamports: info.lamports, base64: info.data.toString('base64') };
      if (info?.data.length === 174) value.audits[key.toBase58()] = reader.audit(key, info);
    }
    for (const [index, key] of tracked.entries()) {
      const info = result.value[index];
      if (info?.data.length !== 1184) continue;
      const raw = program.coder.accounts.decode<FindingAccount>('finding', info.data);
      const parent = value.audits[raw.audit.toBase58()];
      assert(parent, 'Auditoría del hallazgo ausente en snapshot.');
      value.findings[key.toBase58()] = reader.finding(key, info, parent);
    }
    return value;
  }
  const initial = await snapshot();
  if (!resume) assert(tracked.every((key) => initial.accounts[key.toBase58()] === null), 'Ya existen cuentas del recorrido; no repetir automáticamente.');
  else { assert.equal(report.programId, IDL.address); report.resumeStartedAtUtc = new Date().toISOString(); }
  const loader = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
  const [dataKey] = PublicKey.findProgramAddressSync([config.programId.toBuffer()], loader);
  const data = await rpc.getAccountInfo(dataKey, 'confirmed');
  assert(data);
  assert(data.owner.equals(loader));
  const local = readFileSync('target/sbf/khiputrace.so');
  assert(data.data.subarray(45).equals(local), 'Código remoto diferente del ELF probado.');
  Object.assign(report, { endpoint: config.endpoint, genesis: DEVNET_GENESIS, authority: authority.publicKey.toBase58(),
    unauthorizedWallet: outsider.publicKey.toBase58(), audit: audit.toBase58(), otherAudit: other.toBase58(),
    finding0: finding0.toBase58(), finding1: finding1.toBase58(), ...(resume ? { resumeSnapshot: initial } : { initial }),
    programSha256: createHash('sha256').update(local).digest('hex'), balanceStartLamports: balanceStart,
    budgetLamports: 100000000 });
  save();
  async function budget() {
    const current = await read(() => rpc.getBalance(authority.publicKey, 'confirmed'));
    assert(balanceStart - current + 20000000 < 100000000, 'Presupuesto operativo de 0,1 SOL agotado.');
  }
  async function transaction(reference: string) {
    let tx = await read(() => rpc.getTransaction(reference, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }));
    for (let attempt = 0; tx === null && attempt < 8; attempt++) {
      await sleep(1000);
      tx = await read(() => rpc.getTransaction(reference, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }));
    }
    assert(tx?.meta, 'Transacción no disponible; conservar firma antes de continuar.');
    assert.equal(tx.meta.err, null);
    minimumSlot = Math.max(minimumSlot, tx.slot);
    return { slot: tx.slot, error: tx.meta.err, feeLamports: tx.meta.fee, logs: tx.meta.logMessages };
  }
  async function sendInstruction(instruction: TransactionInstruction, wallet = authority) {
    const validity = await rpc.getLatestBlockhash('confirmed');
    const signed = await wallet.signTransaction(new Transaction({ feePayer: wallet.publicKey, ...validity }).add(instruction));
    const signature = await rpc.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 3 });
    const confirmed = await rpc.confirmTransaction({ signature, ...validity }, 'confirmed');
    assert.equal(confirmed.value.err, null);
    return { signature, transaction: await transaction(signature) };
  }
  // Fondos de prueba para que el rechazo no sea causado por saldo/cuenta inexistente.
  if (!resume) {
    assert.equal(await read(() => rpc.getBalance(outsider.publicKey, 'confirmed')), 0);
    await budget();
    report.funding = await sendInstruction(SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: outsider.publicKey, lamports: 30000000 }));
    report.unauthorizedWalletFundedLamports = await read(() => rpc.getBalance(outsider.publicKey, 'confirmed'));
  } else {
    const funding = report.funding as { signature: string };
    await transaction(funding.signature);
    assert(await read(() => rpc.getBalance(outsider.publicKey, 'confirmed')) >= 10000000);
  }
  save();

  async function runCase(id: string, expected: string, operation: (record: CaseRecord, before: Snapshot) => Promise<unknown>, verify: (after: Snapshot) => void = () => {}) {
    const existing = cases.find((entry) => entry.id === id);
    if (existing?.status === 'passed') return;
    if (existing) {
      assert(existing.signature, 'Resultado sin firma: requiere revisión manual antes de repetir.');
      const tx = await transaction(existing.signature);
      const final = await snapshot(); verify(final);
      existing.reconciled = { atUtc: new Date().toISOString(), originalError: existing.error,
        operationResent: false, transaction: tx };
      existing.observed = tx; existing.final = final; existing.status = 'passed';
      delete existing.error;
      save(); console.log(`RECONCILIADA ${id}, sin reenvío`); return;
    }
    const record: CaseRecord = { id, expected, status: 'running', signature: null, explorer: null };
    cases.push(record);
    record.initial = await snapshot(); save();
    try {
      await budget();
      record.observed = await operation(record, record.initial);
      record.final = await snapshot();
      verify(record.final);
      record.status = 'passed';
      console.log(`APROBADA ${id}`);
    } catch (error: unknown) {
      record.error = error instanceof RepositoryError
        ? { code: error.code, message: error.message, candidateReference: error.reference }
        : { message: error instanceof Error ? error.message : String(error) };
      record.status = 'failed';
      save(); throw error;
    }
    save(); await sleep(600);
  }
  const counts = (s: Snapshot, next: bigint, active: bigint, opened: bigint) => {
    const account = s.audits[audit.toBase58()]; assert(account);
    assert.deepEqual([account.nextFindingId, account.findingCount, account.openFindingCount], [next, active, opened]);
  };
  async function mutate(record: CaseRecord, operation: () => Promise<{ reference: string }>) {
    const receipt = await operation(); record.signature = receipt.reference;
    record.explorer = `https://explorer.solana.com/tx/${receipt.reference}?cluster=devnet`; save();
    return transaction(receipt.reference);
  }
  async function reject(id: string, expectedCode: number, build: () => Promise<TransactionInstruction | TransactionInstruction[]>, wallet = authority, errorIndex = 0) {
    await runCase(id, `Rechazo del programa ${expectedCode}; todas las cuentas de negocio idénticas.`, async (_record, before) => {
      const instructions = await build();
      const validity = await rpc.getLatestBlockhash('confirmed');
      const tx = new Transaction({ feePayer: wallet.publicKey, ...validity }).add(...(Array.isArray(instructions) ? instructions : [instructions]));
      const signed = await wallet.signTransaction(tx);
      let failure: SendTransactionError | undefined;
      try { await rpc.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 0 }); }
      catch (error: unknown) { if (error instanceof SendTransactionError) failure = error; else throw error; }
      assert(failure, 'La solicitud inválida no fue rechazada en preflight; detener y revisar.');
      const logs = failure.logs ?? await failure.getLogs(rpc);
      assert(logs?.some((line) => line.includes(`Program ${IDL.address} invoke`)), 'No alcanzó el programa.');
      const parsed = AnchorError.parse(logs);
      assert.equal(parsed?.error.errorCode.number, expectedCode, 'Rechazo distinto de la regla esperada.');
      assert(logs.some((line) => line.includes(`failed: custom program error: 0x${expectedCode.toString(16)}`)));
      assert(failure.message.includes(`Instruction ${errorIndex}`), 'Índice de instrucción incorrecto.');
      const after = await snapshot(); assert.deepEqual(after.accounts, before.accounts, 'El rechazo alteró cuentas de negocio.');
      return { rejectedByProgram: true, source: 'RPC Devnet preflight, transacción firmada; sin emisión confirmada',
        networkSignature: null, errorCode: parsed.error.errorCode.number, errorName: parsed.error.errorCode.code,
        message: failure.message, logs, businessAccountsUnchanged: true };
    });
  }
  const identity = { audit: audit.toBase58(), id: 0n };
  const accounts = (parent = audit, signer = authority.publicKey) => ({ authority: signer, audit: parent, finding: finding0 });
  const createIx = (id: bigint, title = 'Hallazgo sintético Devnet', signer = authority.publicKey) => program.methods
    .createFinding(new BN(id.toString()), title, 'Descripción sintética de verificación', { high: {} })
    .accountsStrict({ authority: signer, audit, finding: findingPda(config.programId, audit, id)[0], systemProgram: SystemProgram.programId }).instruction();
  const updateIx = (parent = audit, signer = authority.publicKey, title = 'Actualización inválida') => program.methods
    .updateFinding(title, 'Descripción sintética actualizada', { critical: {} }).accountsStrict(accounts(parent, signer)).instruction();
  const resolveIx = (note = 'Corrección sintética aplicada y revisada', parent = audit, signer = authority.publicKey) => program.methods
    .resolveFinding(note).accountsStrict(accounts(parent, signer)).instruction();
  const closeIx = (parent = audit, signer = authority.publicKey) => program.methods.closeFinding().accountsStrict(accounts(parent, signer)).instruction();

  await runCase('create-audit', 'Crear auditoría con autoridad responsable y contadores 0/0/0.',
    (r) => mutate(r, () => services.audits.create.execute({ id: 202611220420n, title: 'Auditoría sintética Devnet 4.2' })), (s) => counts(s, 0n, 0n, 0n));
  await runCase('read-audit', 'Consultar detalle/listado desde casos de uso y obtener la misma cuenta.', async () => {
    const result = await services.audits.get.execute({ address: audit.toBase58() });
    const list = await services.audits.list.execute({ authority: authority.publicKey.toBase58() });
    assert(result && list.some((a) => a.address === result.address)); assert.equal(result.authority, authority.publicKey.toBase58());
    return { result, listed: true };
  });
  await runCase('create-second-audit', 'Crear otra auditoría existente de la misma autoridad para probar pertenencia.',
    (r) => mutate(r, () => services.audits.create.execute({ id: 202611220421n, title: 'Auditoría ajena al hallazgo 4.2' })));
  await runCase('create-finding', 'Crear hallazgo 0 perteneciente a auditoría, abierto; contadores 1/1/1.',
    (r) => mutate(r, () => services.findings.create.execute({ audit: audit.toBase58(), expectedNextId: 0n, title: 'Hallazgo sintético Devnet', description: 'Descripción sintética de verificación', severity: 'high' })),
    (s) => { counts(s, 1n, 1n, 1n); assert.equal(s.findings[finding0.toBase58()]?.status, 'open'); });
  await runCase('read-findings', 'Listar el hallazgo relacionado con gravedad alta.', async () => {
    const list = await services.findings.list.execute({ audit: audit.toBase58() });
    assert.equal(list.length, 1); assert.equal(list[0]?.severity, 'high'); assert.equal(list[0]?.audit, audit.toBase58()); return list;
  });
  await runCase('update-open-finding', 'Modificar la misma PDA abierta; gravedad crítica y contadores conservados.',
    (r) => mutate(r, () => services.findings.update.execute({ ...identity, title: 'Hallazgo corregido Devnet', description: 'Descripción sintética revisada', severity: 'critical' })),
    (s) => { counts(s, 1n, 1n, 1n); assert.equal(s.findings[finding0.toBase58()]?.title, 'Hallazgo corregido Devnet'); assert.equal(s.findings[finding0.toBase58()]?.severity, 'critical'); });
  await reject('unauthorized-create', 6000, () => createIx(1n, 'Intento no autorizado', outsider.publicKey), outsider);
  await reject('unauthorized-update', 6000, () => updateIx(audit, outsider.publicKey), outsider);
  await reject('unauthorized-resolve', 6000, () => resolveIx(undefined, audit, outsider.publicKey), outsider);
  await reject('unauthorized-close', 6000, () => closeIx(audit, outsider.publicKey), outsider);
  await reject('wrong-audit-update', 2006, () => updateIx(other));
  await reject('wrong-audit-resolve', 2006, () => resolveIx(undefined, other));
  await reject('wrong-audit-close', 2006, () => closeIx(other));
  await reject('close-open-finding', 6005, () => closeIx());
  await reject('resolve-empty-action', 6004, () => resolveIx(''));
  await reject('resolve-short-action', 6004, () => resolveIx('corta'));
  await reject('resolve-whitespace-action', 6004, () => resolveIx('   \n\t   '));
  await reject('resolve-oversized-action', 6002, () => resolveIx('x'.repeat(513)));
  await reject('update-oversized-title', 6002, () => updateIx(audit, authority.publicKey, 'é'.repeat(49)));
  await reject('create-invalid-title', 6002, () => createIx(1n, '   '));
  await reject('atomic-rollback', 6004, async () => [await updateIx(), await resolveIx('')], authority, 1);
  await runCase('resolve-valid-action', 'Persistir acción correctiva válida; estado resolved y contadores 1/1/0.',
    (r) => mutate(r, () => services.findings.resolve.execute({ ...identity, correctiveAction: '  Corrección sintética aplicada y revisada  ' })),
    (s) => { counts(s, 1n, 1n, 0n); assert.equal(s.findings[finding0.toBase58()]?.status, 'resolved'); assert.equal(s.findings[finding0.toBase58()]?.correctiveAction, 'Corrección sintética aplicada y revisada'); });
  await reject('update-resolved-finding', 6003, () => updateIx());
  await reject('resolve-resolved-finding', 6003, () => resolveIx());
  await runCase('close-resolved-finding', 'Cerrar cuenta resuelta, devolver rent a autoridad y conservar nextId=1; activos=0/abiertos=0.',
    async (r) => {
      const [beforeBalance, findingAccount] = await Promise.all([rpc.getBalance(authority.publicKey, 'confirmed'), rpc.getAccountInfo(finding0, 'confirmed')]);
      assert(findingAccount);
      const result = await mutate(r, () => services.findings.close.execute(identity));
      const afterBalance = await rpc.getBalance(authority.publicKey, 'confirmed');
      assert.equal(afterBalance - beforeBalance, findingAccount.lamports - result.feeLamports);
      return { ...result, refundLamports: findingAccount.lamports, authorityBalanceBefore: beforeBalance, authorityBalanceAfter: afterBalance };
    }, (s) => { counts(s, 1n, 0n, 0n); assert.equal(s.accounts[finding0.toBase58()], null); });
  await reject('reuse-closed-id', 6008, () => createIx(0n));
  await runCase('create-next-finding', 'Crear ID 1/PDA diferente; no reutilizar 0; contadores 2/1/1.',
    (r) => mutate(r, () => services.findings.create.execute({ audit: audit.toBase58(), expectedNextId: 1n, title: 'Segundo hallazgo Devnet', description: 'Secuencia monotónica conservada tras cierre', severity: 'low' })),
    (s) => { counts(s, 2n, 1n, 1n); assert.equal(s.accounts[finding0.toBase58()], null); assert.equal(s.findings[finding1.toBase58()]?.id, 1n); assert(!finding0.equals(finding1)); });
  await runCase('read-final-state', 'Listado contiene solo ID 1; auditoría conserva secuencia y contadores correctos.', async () => {
    const list = await services.findings.list.execute({ audit: audit.toBase58() });
    assert.deepEqual(list.map((f) => f.id), [1n]); return list;
  }, (s) => counts(s, 2n, 1n, 1n));

  const references = cases.flatMap((c) => c.signature ? [c.signature] : []);
  const status = await rpc.getSignatureStatuses(references, { searchTransactionHistory: true });
  assert(status.value.every((s) => s !== null && s.err === null));
  Object.assign(report, { completedAtUtc: new Date().toISOString(), final: await snapshot(), signatures: references,
    signatureStatuses: status.value, balanceEndLamports: await rpc.getBalance(authority.publicKey, 'confirmed'),
    unauthorizedWalletEndLamports: await rpc.getBalance(outsider.publicKey, 'confirmed'), verified: true,
    summary: { passed: cases.filter((c) => c.status === 'passed').length, failed: cases.filter((c) => c.status === 'failed').length,
      programRejections: cases.filter((c) => (c.observed as { rejectedByProgram?: boolean } | undefined)?.rejectedByProgram).length } });
  if (report.fatalError) { report.previousInterruptedAttempt = report.fatalError; delete report.fatalError; }
  save(); console.log(stringify(report.summary));
}

main().catch((error: unknown) => {
  report.fatalError = error instanceof Error ? error.message : String(error);
  report.verified = false; save(); console.error(report.fatalError); process.exitCode = 1;
});
