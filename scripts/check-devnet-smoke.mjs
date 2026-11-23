import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const output = '.cache/devnet-smoke';
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/package.json`, '{"type":"commonjs"}\n');
const compile = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'scripts/devnet-smoke/tsconfig.json'], { stdio: 'inherit' });
if (compile.error) throw compile.error;
if (compile.status !== 0) process.exit(compile.status ?? 1);
// Sin --execute únicamente compila; no carga wallet ni contacta la red.
if (process.argv.includes('--execute')) {
  if (existsSync('docs/evidence/4.1-devnet-smoke.json')) {
    console.error('Ya existe evidencia de esta operación. Consultarla antes de repetir; no se carga wallet ni se envía otra transacción.');
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [`${output}/scripts/devnet-smoke/run.js`, '--execute'], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
