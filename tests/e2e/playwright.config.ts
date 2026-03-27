/**
 * Playwright E2E Test Configuration
 *
 * ── Kurulum (tek seferlik) ───────────────────────────────────────────────────
 *   npm install --save-dev @playwright/test
 *   npx playwright install chromium
 *
 * ── .env.test dosyası oluştur ────────────────────────────────────────────────
 *   E2E_USER_EMAIL=...        # aktif planlı test kullanıcısı emaili
 *   E2E_USER_PASSWORD=...     # şifresi
 *   BASE_URL=http://localhost:3000
 *
 * ── Çalıştırma ───────────────────────────────────────────────────────────────
 *   npm run dev               # önce sunucuyu başlat
 *   npm run test:e2e          # tüm E2E testler
 *   npm run test:e2e:ui       # görsel UI modu
 *   npm run test:e2e:security # sadece güvenlik testleri
 *   npm run test:e2e:ai       # sadece AI kapsam testleri
 *
 * ── Proje Mimarisi ───────────────────────────────────────────────────────────
 *   setup          → auth.setup.ts     (planlı kullanıcı oturumu)
 *   no-plan-setup  → no-plan.setup.ts  (plansız kullanıcı oturumu)
 *   chromium       → tüm spec dosyaları, planlı oturum ile
 *   no-plan-tests  → access-control.spec.ts + api-security.spec.ts, plansız oturum ile
 */
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,          // Auth state paylaşıldığı için sıralı çalıştır
  forbidOnly: !!process.env.CI,  // CI'da .only'e izin verme
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 45_000,               // Gemini API çağrıları için biraz uzun timeout

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
    // ── Setup ──────────────────────────────────────────────────────────────

    // Planlı kullanıcı oturum kurulumu
    {
      name: 'setup',
      testMatch: 'auth.setup.ts',
    },

    // Plansız kullanıcı oturum kurulumu (plan koruma testleri için)
    {
      name: 'no-plan-setup',
      testMatch: 'no-plan.setup.ts',
    },

    // ── Ana Testler — Planlı Kullanıcı ────────────────────────────────────

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',  // setup'tan gelen oturum (planlı)
      },
      dependencies: ['setup'],
      testMatch: [
        'auth.spec.ts',
        'dashboard.spec.ts',
        'vocabulary.spec.ts',
        'api-security.spec.ts',   // S1 (kimliksiz) + S3/S4 (planlı kullanıcı gerekir)
        'ai-scope.spec.ts',       // S7, S8, S9 — Gemini testleri
        'access-control.spec.ts', // S5 (admin), S6 (cross-user), S11 (onboarding)
      ],
    },

    // ── Plan Koruma Testleri — Plansız Kullanıcı ──────────────────────────

    {
      name: 'no-plan-tests',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/no-plan-user.json',  // no-plan-setup'tan gelen oturum
      },
      dependencies: ['no-plan-setup'],
      testMatch: [
        'api-security.spec.ts',   // S2 (plan yok → 403)
        'access-control.spec.ts', // S10 (plan yok → pricing yönlendirmesi)
      ],
    },
  ],
});
