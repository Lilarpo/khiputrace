import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = `${root}/.cache/application-tests`;
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/package.json`, '{"type":"commonjs"}\n');
for (const args of [
  ['node_modules/typescript/bin/tsc', '-p', 'tests/application/tsconfig.json'],
  ['--test', `${output}/tests/application/use-cases.test.js`],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
