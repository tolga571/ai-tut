/**
 * E2E No-Plan Auth Setup
 *
 * Plan sahibi OLMAYAN (yeni kayıtlı) bir kullanıcı oturumu oluşturur.
 * Plan koruma testlerinde kullanılır.
 *
 * Her çalıştırmada benzersiz email → DB'de çakışma olmaz.
 * ÖNEMLİ: Bu kurulum test DB'ye gerçek kullanıcı yazar.
 */
import { test as setup, expect, request } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

export const NO_PLAN_AUTH_FILE = path.join(import.meta.dirname, '.auth', 'no-plan-user.json');

// Benzersiz email — paralel çalıştırmada da çakışmaz
const uniqueEmail = `e2e-noplan-${Date.now()}@test.com`;
const password    = 'TestPass123!';

setup('no-plan kullanıcısını kayıt et ve oturum aç', async ({ page }) => {
  fs.mkdirSync(path.dirname(NO_PLAN_AUTH_FILE), { recursive: true });

  // ── 1. Kayıt ──────────────────────────────────────────────────────────────
  await page.goto('/en/register');
  await page.getByLabel(/full name|name/i).fill('NoPlan E2E User');
  await page.getByLabel(/email/i).fill(uniqueEmail);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);
  await page.getByRole('button', { name: /continue|register|sign up/i }).click();

  // ── 2. Onboarding varsa doldur / atla ─────────────────────────────────────
  // Onboarding veya pricing sayfasına yönlendirme beklenir
  await page.waitForURL(/(onboarding|pricing)/, { timeout: 10_000 });

  if (page.url().includes('onboarding')) {
    // "Skip" butonuna bas — varsa
    const skipBtn = page.getByRole('button', { name: /skip|atla/i });
    if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForURL(/(pricing)/, { timeout: 8_000 });
    } else {
      // Onboarding formu minimum doldur
      const nativeLang = page.locator('select[name="nativeLang"], [data-testid="native-lang"]').first();
      const targetLang = page.locator('select[name="targetLang"], [data-testid="target-lang"]').first();
      if (await nativeLang.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nativeLang.selectOption({ index: 0 });
      }
      if (await targetLang.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await targetLang.selectOption({ index: 1 });
      }
      const submitBtn = page.getByRole('button', { name: /continue|next|submit|devam/i });
      if (await submitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await submitBtn.click();
      }
      await page.waitForURL(/(pricing)/, { timeout: 8_000 });
    }
  }

  // Pricing sayfasındayız → plan YOK, tam istediğimiz durum
  await expect(page).toHaveURL(/pricing/);

  // ── 3. Oturum state'ini kaydet ────────────────────────────────────────────
  await page.context().storageState({ path: NO_PLAN_AUTH_FILE });

  // Email/password'ü env'e yaz — diğer testler API isteği için kullanabilir
  process.env.NO_PLAN_USER_EMAIL = uniqueEmail;
  process.env.NO_PLAN_USER_PASSWORD = password;
});
