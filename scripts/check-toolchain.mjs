import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const versions = JSON.parse(readFileSync(new URL('../config/toolchain.json', import.meta.url), 'utf8'));
let failed = false;
for (const [command, expected] of [
  ['anchor', versions.anchor], ['solana', versions.solana],
  ['cargo-build-sbf', versions.solana], ['solana-test-validator', versions.solana],
]) {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8' });
  const output = `${result.stdout ?? ''} ${result.stderr ?? ''}`.trim();
  const actual = output.match(/\b\d+\.\d+\.\d+\b/)?.[0];
  if (result.error || result.status !== 0 || actual !== expected) {
    console.error(`${command}: esperado ${expected}; observado ${output || 'no disponible'}`);
    failed = true;
  } else console.log(`${command}: ${actual}`);
}
if (failed) process.exitCode = 1;
