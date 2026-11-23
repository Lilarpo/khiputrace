import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
const evidencePrefix = process.env.KHIPUTRACE_EVIDENCE_PREFIX ?? '3.2';
const idl = JSON.parse(readFileSync('frontend/src/infrastructure/anchor/generated/khiputrace.json', 'utf8')) as { address: string };
export default defineConfig({
  testDir: './tests/browser', testMatch: 'audits.spec.ts', workers: 1, retries: 0, timeout: 30000,
  outputDir: '.cache/audit-browser-results', reporter: [['list'], ['json', { outputFile: `docs/evidence/${evidencePrefix}-browser.json` }]],
  use: { baseURL: 'http://127.0.0.1:4175', channel: 'chrome', headless: true, viewport: { width: 1440, height: 1080 } },
  webServer: [
    { command: 'node tests/browser/local-server.mjs', url: 'http://127.0.0.1:18899', reuseExistingServer: false },
    { command: 'npm run build --workspace frontend -- --outDir ../.cache/audit-preview --emptyOutDir && npm run preview --workspace frontend -- --host 127.0.0.1 --port 4175 --strictPort --outDir ../.cache/audit-preview', url: 'http://127.0.0.1:4175', reuseExistingServer: false, env: { VITE_KHIPUTRACE_PROGRAM_ID: idl.address, VITE_KHIPUTRACE_CLUSTER: 'localnet', VITE_KHIPUTRACE_RPC_URL: 'http://127.0.0.1:18899' } },
    { command: 'npm run dev --workspace frontend -- --port 4176 --strictPort', url: 'http://127.0.0.1:4176', reuseExistingServer: false, env: { VITE_KHIPUTRACE_PROGRAM_ID: idl.address, VITE_KHIPUTRACE_CLUSTER: 'localnet', VITE_KHIPUTRACE_RPC_URL: 'http://127.0.0.1:18899' } },
  ],
});
