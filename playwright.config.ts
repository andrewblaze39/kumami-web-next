/**
 * Playwright config for AI-driven QA (skill: kumami-qa, workflow stage 5).
 *
 *   npm run qa                         # all specs (desktop + mobile)
 *   npx playwright test qa/smoke.spec.ts --project=desktop
 *
 * - Runs against the local dev server (kumami-dev Firebase, see .env.local);
 *   reuses one already running on :3000, otherwise starts `npm run dev`.
 * - qa/global-setup.ts signs in the two QA accounts once and stores their
 *   sessions (incl. Firebase's IndexedDB auth) in qa/.auth/ — specs pick a
 *   role with `test.use({ storageState: AUTH.pro })`.
 * - Screenshots/traces land in qa/artifacts/ (gitignored).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.QA_PORT ?? 3000);

export default defineConfig({
  testDir: './qa',
  outputDir: './qa/artifacts/results',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false, // one dev server, shared Firestore test data — keep runs serial
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'qa/artifacts/report', open: 'never' }]],
  globalSetup: './qa/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
