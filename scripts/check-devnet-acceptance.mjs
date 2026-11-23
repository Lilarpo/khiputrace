import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
const output = '.cache/devnet-acceptance';
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/package.json`, '{"type":"commonjs"}\n');
const compile = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'scripts/devnet-acceptance/tsconfig.json'], { stdio: 'inherit' });
if (compile.error) throw compile.error;
if (compile.status !== 0) process.exit(compile.status ?? 1);
if (process.argv.includes('--execute')) {
  const resume = process.argv.includes('--resume');
  if (existsSync('docs/evidence/4.2-devnet-acceptance.json') && !resume) {
    console.error('Ya existe evidencia 4.2. Revisarla antes de repetir; no se envía otra operación.');
    process.exit(1);
  }
  const run = spawnSync(process.execPath, [`${output}/scripts/devnet-acceptance/run.js`, '--execute', ...(resume ? ['--resume'] : [])], { stdio: 'inherit' });
  if (run.error) throw run.error;
  process.exit(run.status ?? 1);
}
