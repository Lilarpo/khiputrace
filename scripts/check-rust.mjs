import { spawnSync } from 'node:child_process';

for (const args of [
  ['fmt', '--all', '--', '--check'],
  ['check', '--workspace', '--all-targets', '--locked', '-j', '2'],
  ['test', '--workspace', '--locked', '-j', '2'],
]) {
  const result = spawnSync('cargo', args, { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Rust host verificado. Esto no ejecuta build SBF, IDL ni pruebas on-chain.');
