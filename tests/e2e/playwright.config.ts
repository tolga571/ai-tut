/**
 * Playwright E2E Test Configuration
 *
 * Kurulum:
 *   npm install --save-dev @playwright/test
 *   npx playwright install chromium
 *
 * Çalıştırma:
 *   npm run test:e2e          # tüm E2E testler
 *   npm run test:e2e:ui       # görsel UI modu
 */
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,         // Auth state paylaşıldığı için sıralı çalıştır
  forbidOnly: !!process.env.CI, // CI'da .only'e izin verme
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,

  reporter: [
    ['list'],
    ['html', { outputFolder: '../../playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
  },

  projects: [
    // Auth setup — diğer testlerden önce çalışır
    {
      name: 'setup',
      testMatch: 'auth.setup.ts',
    },
    // Ana test suite — Chromium
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json', // setup'tan gelen oturum
      },
      dependencies: ['setup'],
      testMatch: ['**/*.spec.ts'],
      testIgnore: ['auth.setup.ts'],
    },
  ],
});
