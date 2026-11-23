// Verificación operativa Devnet: usa los mismos casos de uso y adaptadores del frontend.
import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';
import { Wallet } from '@anchor-lang/core';
import { Connection } from '@solana/web3.js';
import { CreateAudit } from '../../frontend/src/application/use-cases/create-audit';
import { GetAudit } from '../../frontend/src/application/use-cases/get-audit';
import { RepositoryError } from '../../frontend/src/domain/errors';
import { createRepositories } from '../../frontend/src/infrastructure/anchor/client';
import { IDL } from '../../frontend/src/infrastructure/anchor/generated/khiputrace';
import { networkConfig } from '../../frontend/src/infrastructure/solana/config';
import { auditPda } from '../../frontend/src/infrastructure/solana/pdas';
import { DEVNET_GENESIS } from '../../frontend/src/infrastructure/solana/session';

const destination = 'docs/evidence/4.1-devnet-smoke.json';
const report: Record<string, unknown> = { startedAtUtc: new Date().toISOString(), programId: IDL.address };
function save() {
  writeFileSync(destination, `${JSON.stringify(report, (_key, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value, 2)}\n`);
}

async function main() {
  assert(process.argv.includes('--execute'), 'Requiere --execute; esta prueba crea una cuenta real Devnet.');
  const config = networkConfig({ cluster: 'devnet', programId: IDL.address });
  const rpc = new Connection(config.endpoint, 'confirmed');
  assert.equal(await rpc.getGenesisHash(), DEVNET_GENESIS);
  // La wallet oficial lee el archivo externo; no parsear ni imprimir secretos aquí.
  const wallet = Wallet.local();
  assert.equal(wallet.publicKey.toBase58(), 'Bd6Xa9JV3x3hZVkEnuGnH323MZxhYuCXuRe6DFSK3LKT');
  const ports = createRepositories(config, () => wallet, rpc);
  const create = new CreateAudit(ports.auditWriter);
  const get = new GetAudit(ports.auditReader);
  const id = 202611220401n;
  const title = 'Verificación sintética KhipuTrace Devnet 4.1';
  const [address] = auditPda(config.programId, wallet.publicKey, id);
  const before = await get.execute({ address: address.toBase58() });
  assert.equal(before, null, 'La auditoría de verificación ya existe; consultar evidencia antes de repetir.');
  const baseline = JSON.parse(readFileSync('docs/evidence/4.1-authorized-preflight.json', 'utf8')) as {
    checks: { balanceLamports: number };
  };
  const balanceBefore = await rpc.getBalance(wallet.publicKey, 'confirmed');
  const rent = await rpc.getMinimumBalanceForRentExemption(174, 'confirmed');
  assert(baseline.checks.balanceLamports - balanceBefore + rent + 1000000 < 3000000000,
    'El presupuesto autorizado de 3 SOL no permite continuar.');
  Object.assign(report, { network: 'devnet', endpoint: config.endpoint, authority: wallet.publicKey.toBase58(),
    auditAddress: address.toBase58(), auditId: id, title, before, balanceBeforeLamports: balanceBefore });
  save();
  const receipt = await create.execute({ id, title });
  report.signature = receipt.reference;
  report.confirmedByRepository = true;
  save();
  let transaction = await rpc.getTransaction(receipt.reference, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
  for (let attempt = 0; transaction === null && attempt < 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    transaction = await rpc.getTransaction(receipt.reference, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
  }
  assert(transaction?.meta, 'Transacción todavía no disponible; conservar firma, no reenviar.');
  assert.equal(transaction.meta.err, null);
  const after = await get.execute({ address: address.toBase58() });
  assert(after);
  assert.equal(after.authority, wallet.publicKey.toBase58());
  assert.equal(after.id, id);
  assert.equal(after.title, title);
  assert.equal(after.nextFindingId, 0n);
  assert.equal(after.findingCount, 0n);
  assert.equal(after.openFindingCount, 0n);
  const balanceAfter = await rpc.getBalance(wallet.publicKey, 'confirmed');
  const spent = baseline.checks.balanceLamports - balanceAfter;
  assert(spent <= 3000000000, 'Gasto observado superior al límite autorizado.');
  Object.assign(report, { after, slot: transaction.slot, transactionError: transaction.meta.err,
    transactionFeeLamports: transaction.meta.fee, logs: transaction.meta.logMessages,
    balanceAfterLamports: balanceAfter, totalSpentSincePreflightLamports: spent,
    explorer: `https://explorer.solana.com/tx/${receipt.reference}?cluster=devnet`,
    completedAtUtc: new Date().toISOString(), verified: true });
  save();
  console.log(JSON.stringify(report, (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value, 2));
}

main().catch((error: unknown) => {
  report.error = error instanceof RepositoryError
    ? { code: error.code, message: error.message, reference: error.reference }
    : { message: error instanceof Error ? error.message : String(error) };
  save();
  console.error(JSON.stringify(report.error));
  process.exitCode = 1;
});
