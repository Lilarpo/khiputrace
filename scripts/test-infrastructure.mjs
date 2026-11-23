import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = `${root}/.cache/infrastructure-tests`;
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/package.json`, '{"type":"commonjs"}\n');
for (const args of [
  ['node_modules/typescript/bin/tsc', '-p', 'tests/infrastructure/tsconfig.json'],
  ['--test', `${output}/tests/infrastructure/adapters.test.js`],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
await build({
  configFile: false,
  root: `${root}/frontend`,
  build: {
    lib: { entry: `${root}/frontend/src/infrastructure/anchor/client.ts`, formats: ['es'], fileName: 'infrastructure' },
    outDir: `${root}/.cache/infrastructure-browser`,
    emptyOutDir: true,
  },
});
