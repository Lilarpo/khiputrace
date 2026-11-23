import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const compile = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tests/browser/tsconfig.json', '--noEmit'], { stdio: 'inherit' });
if (compile.error) throw compile.error;
if (compile.status !== 0) process.exit(compile.status ?? 1);
if (process.argv.includes('--execute')) {
  if (existsSync('docs/evidence/4.2-ui-flow.json')) {
    console.error('Existe un recorrido UI Devnet previo. Revisar firmas/cuentas antes de repetir.'); process.exit(1);
  }
  const run = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.devnet.config.ts'], {
    stdio: 'inherit', env: { ...process.env, KHIPUTRACE_DEVNET_UI_EXECUTE: '1' },
  });
  if (run.error) throw run.error;
  process.exit(run.status ?? 1);
}
