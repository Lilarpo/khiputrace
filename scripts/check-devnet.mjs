// Diagnóstico de solo lectura. No firma, solicita airdrops ni envía transacciones.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { PublicKey } from '@solana/web3.js';

const endpoint = 'https://api.devnet.solana.com';
const expectedGenesis = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const artifact = readFileSync('target/sbf/khiputrace.so');
const idl = JSON.parse(readFileSync('frontend/src/infrastructure/anchor/generated/khiputrace.json', 'utf8'));
const rust = readFileSync('programs/khiputrace/src/lib.rs', 'utf8');
const anchor = readFileSync('Anchor.toml', 'utf8');
const wallet = process.env.KHIPUTRACE_DEPLOYER_ADDRESS;
const report = {
  checkedAtUtc: new Date().toISOString(), endpoint, readOnly: true,
  sourceProgramId: idl.address,
  identityStillProvisional: rust.includes('Identidad pública provisional'),
  artifactBytes: artifact.length,
  artifactSha256: createHash('sha256').update(artifact).digest('hex'),
  deployerAddress: wallet ?? null,
  checks: {}, errors: [],
};
async function rpc(method, params = []) {
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${method}`);
  const result = await response.json();
  if (result.error) throw new Error(`${method}: ${JSON.stringify(result.error)}`);
  return result.result;
}
try {
  new PublicKey(idl.address);
  if (!rust.includes(`declare_id!("${idl.address}")`) || !anchor.includes(`khiputrace = "${idl.address}"`)) {
    throw new Error('Rust, Anchor.toml e IDL no concuerdan.');
  }
  const typedIdl = readFileSync('frontend/src/infrastructure/anchor/generated/khiputrace.ts', 'utf8');
  const frontend = readFileSync('frontend/.env.local', 'utf8');
  report.checks.clientIdentityMatches = typedIdl.includes(`"address": "${idl.address}"`)
    && frontend.split(/\r?\n/).includes(`VITE_KHIPUTRACE_PROGRAM_ID=${idl.address}`)
    && frontend.split(/\r?\n/).includes('VITE_KHIPUTRACE_CLUSTER=devnet')
    && frontend.split(/\r?\n/).includes(`VITE_KHIPUTRACE_RPC_URL=${endpoint}`);
  if (!report.checks.clientIdentityMatches) throw new Error('Configuración Devnet del frontend o IDL tipado divergente.');
  report.checks.genesis = await rpc('getGenesisHash');
  if (report.checks.genesis !== expectedGenesis) throw new Error('Genesis distinto de Devnet; detenerse.');
  report.checks.version = await rpc('getVersion');
  report.checks.slot = await rpc('getSlot', [{ commitment: 'confirmed' }]);
  const account = await rpc('getAccountInfo', [idl.address, { encoding: 'base64', commitment: 'confirmed' }]);
  report.checks.programAccount = account.value === null ? null : {
    owner: account.value.owner, executable: account.value.executable, lamports: account.value.lamports,
  };
  // Metadatos de Upgradeable Loader v3; --max-len se fijará al tamaño del ELF.
  report.checks.rentLamports = {};
  for (const [name, size] of Object.entries({ program: 36, programData: artifact.length + 45, buffer: artifact.length + 37 })) {
    report.checks.rentLamports[name] = await rpc('getMinimumBalanceForRentExemption', [size, { commitment: 'confirmed' }]);
  }
  report.checks.rentLamports.peakBeforeBufferRefund = report.checks.rentLamports.program
    + report.checks.rentLamports.programData + report.checks.rentLamports.buffer;
  report.checks.transactionFeesIncluded = false;
  if (wallet) {
    new PublicKey(wallet);
    report.checks.balanceLamports = (await rpc('getBalance', [wallet, { commitment: 'confirmed' }])).value;
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
writeFileSync('docs/evidence/4.1-devnet-check.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
