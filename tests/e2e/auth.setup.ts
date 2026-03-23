/**
 * E2E Auth Setup
 *
 * Playwright'ın "global setup" yerine proje tabanlı setup özelliği.
 * Bir kez giriş yapar ve oturum state'ini .auth/user.json'a kaydeder.
 * Diğer testler bu oturumu yeniden kullanır (hız kazanımı).
 *
 * Çalıştırma: sadece setup project'i çalıştırırken tetiklenir.
 */
import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_FILE = path.join(import.meta.dirname, '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  // .auth klasörünü oluştur (gitignore'da tutulur)
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  // Kayıtlı test kullanıcısıyla giriş yap
  // NOT: Bu kullanıcının test DB'sinde var olması gerekir
  await page.goto('/en/login');

  await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL ?? 'e2e@test.com');
  await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD ?? 'testpass123');
  await page.getByRole('button', { name: /sign in|log in|giriş/i }).click();

  // Dashboard'a yönlendirilmeyi bekle
  await page.waitForURL('**/dashboard', { timeout: 10_000 });

  // Oturum state'ini kaydet
  await page.context().storageState({ path: AUTH_FILE });
});
