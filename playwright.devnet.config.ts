import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
const idl = JSON.parse(readFileSync('frontend/src/infrastructure/anchor/generated/khiputrace.json', 'utf8')) as { address: string };
export default defineConfig({
  testDir: './tests/browser', testMatch: 'devnet.spec.ts', workers: 1, retries: 0, timeout: 300000,
  expect: { timeout: 30000 },
  outputDir: '.cache/devnet-ui-results', reporter: [['list'], ['json', { outputFile: 'docs/evidence/4.2-ui-browser.json' }]],
  use: { baseURL: 'http://127.0.0.1:4182', channel: 'chrome', headless: true, viewport: { width: 1440, height: 1080 } },
  webServer: {
    command: 'npm run build --workspace frontend -- --outDir ../.cache/devnet-ui-preview --emptyOutDir && npm run preview --workspace frontend -- --host 127.0.0.1 --port 4182 --strictPort --outDir ../.cache/devnet-ui-preview',
    url: 'http://127.0.0.1:4182', reuseExistingServer: false,
    env: { VITE_KHIPUTRACE_PROGRAM_ID: idl.address, VITE_KHIPUTRACE_CLUSTER: 'devnet', VITE_KHIPUTRACE_RPC_URL: 'https://api.devnet.solana.com' },
  },
});
