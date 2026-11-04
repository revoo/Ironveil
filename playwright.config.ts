import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', timeout: 20_000, use: { baseURL: 'http://127.0.0.1:5173', headless: true },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1', timeout: 30_000 },
});
