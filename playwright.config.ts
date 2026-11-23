import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
const evidencePrefix = process.env.KHIPUTRACE_EVIDENCE_PREFIX ?? '3.1';
const idl = JSON.parse(readFileSync('frontend/src/infrastructure/anchor/generated/khiputrace.json', 'utf8')) as { address: string };
export default defineConfig({
  testDir: './tests/browser', testMatch: 'base.spec.ts', workers: 1, retries: 0, timeout: 30000,
  outputDir: '.cache/browser-results',
  reporter: [['list'], ['json', { outputFile: `docs/evidence/${evidencePrefix}-browser.json` }]],
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome', viewport: { width: 1440, height: 1080 }, headless: true },
  webServer: [
    { command: 'npm run build --workspace frontend && npm run preview --workspace frontend -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false, env: { VITE_KHIPUTRACE_PROGRAM_ID: '' } },
    { command: 'npm run dev --workspace frontend -- --port 4174 --strictPort', url: 'http://127.0.0.1:4174', reuseExistingServer: false, env: { VITE_KHIPUTRACE_PROGRAM_ID: idl.address } },
  ],
});
