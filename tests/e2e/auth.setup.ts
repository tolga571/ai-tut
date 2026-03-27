/**
 * E2E Auth Setup — Aktif Planlı Kullanıcı
 *
 * Playwright'ın proje tabanlı setup özelliği.
 * Bir kez giriş yapar ve oturum state'ini .auth/user.json'a kaydeder.
 * Diğer testler bu oturumu yeniden kullanır (hız kazanımı).
 *
 * GEREKSİNİM:
 *   .env.test (veya ortam değişkenleri):
 *     E2E_USER_EMAIL    → aktif Paddle planı olan kullanıcı emaili
 *     E2E_USER_PASSWORD → şifresi
 *     BASE_URL          → Railway URL veya http://localhost:3000
 */
import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_FILE = path.join(import.meta.dirname, '.auth', 'user.json');

setup('authenticate (plan sahibi kullanıcı)', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const email    = process.env.E2E_USER_EMAIL    ?? 'e2e@test.com';
  const password = process.env.E2E_USER_PASSWORD ?? 'testpass123';

  await page.goto('/en/login');

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in|giriş/i }).click();

  // Aktif planlı kullanıcı → dashboard veya chat'e gider
  // Plansızsa → pricing'e gider (bu setup hata verir → doğru kullanıcı değil)
  await page.waitForURL(/\/(dashboard|chat)/, { timeout: 15_000 });

  // Güvence: pricing'e yönlendirilmedik (plan aktif)
  await expect(page).not.toHaveURL(/pricing/, { timeout: 3_000 });

  // Oturum state'ini kaydet
  await page.context().storageState({ path: AUTH_FILE });

  console.log(`✅ Auth setup tamamlandı: ${email}`);
});
