import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) throw new Error('E2E_BASE_URL is required; tests must explicitly target staging');
const target = new URL(baseURL);
if (/^(www\.)?sidnam\.org$|^api\.sidnam\.org$/.test(target.hostname)) throw new Error('Production target forbidden');
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, retries: 0,
  timeout: 45000, expect: { timeout: 10000 },
  reporter: [['list'], ['./e2e/reporter.ts']],
  // Authentication headers and response bodies can contain JWTs. Do not retain raw traces.
  use: { baseURL, trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
