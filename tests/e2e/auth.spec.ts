/**
 * E2E Tests — Auth Flows
 *
 * Kapsam:
 * - Kayıt (register) flow
 * - Form validasyonları
 * - Login / logout
 * - Forgot password sayfası
 * - Protected route yönlendirmesi
 *
 * Gereksinimler:
 *   npx playwright install chromium
 *   Dev server çalışıyor olmalı: npm run dev
 */
import { test, expect } from '@playwright/test';

// ─── Kayıt (Register) ─────────────────────────────────────────────────────────

test.describe('Register', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Oturumu temizle

  test('başarılı kayıt plan sayfasına yönlendirir', async ({ page }) => {
    const uniqueEmail = `e2e-register-${Date.now()}@test.com`;

    await page.goto('/en/register');
    await page.getByLabel(/full name|name/i).fill('E2E Test User');
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/^password$/i).fill('securePass123');
    await page.getByLabel(/confirm password/i).fill('securePass123');
    await page.getByRole('button', { name: /continue|register|sign up/i }).click();

    // Plan seçim sayfasına yönlendirme veya onboarding
    await expect(page).toHaveURL(/(plan|pricing|onboarding)/, { timeout: 10_000 });
  });

  test('kısa şifre ile hata gösterir', async ({ page }) => {
    await page.goto('/en/register');
    await page.getByLabel(/full name|name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('valid@test.com');
    await page.getByLabel(/^password$/i).fill('123');
    await page.getByLabel(/confirm password/i).fill('123');
    await page.getByRole('button', { name: /continue|register|sign up/i }).click();

    // Hata mesajı görünmeli, yönlendirme OLMAMALI
    await expect(page.getByText(/password|şifre/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/register/);
  });

  test('eşleşmeyen şifre ile hata gösterir', async ({ page }) => {
    await page.goto('/en/register');
    await page.getByLabel(/full name|name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('valid2@test.com');
    await page.getByLabel(/^password$/i).fill('securePass123');
    await page.getByLabel(/confirm password/i).fill('differentPass');
    await page.getByRole('button', { name: /continue|register|sign up/i }).click();

    await expect(page.getByText(/match|eşleş/i)).toBeVisible({ timeout: 5_000 });
  });

  test('geçersiz email ile hata gösterir', async ({ page }) => {
    await page.goto('/en/register');
    await page.getByLabel(/full name|name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/^password$/i).fill('securePass123');
    await page.getByLabel(/confirm password/i).fill('securePass123');
    await page.getByRole('button', { name: /continue|register|sign up/i }).click();

    await expect(page.getByText(/email|e-posta/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Oturumu temizle

  test('geçersiz şifre ile hata gösterir', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel(/email/i).fill('notexist@test.com');
    await page.getByLabel(/password/i).fill('wrongpass');
    await page.getByRole('button', { name: /sign in|log in|giriş/i }).click();

    await expect(page.getByText(/invalid|incorrect|hatalı|geçersiz/i)).toBeVisible({ timeout: 5_000 });
  });

  test('forgot password linki görünür', async ({ page }) => {
    await page.goto('/en/login');
    await expect(page.getByRole('link', { name: /forgot|şifremi unuttum/i })).toBeVisible();
  });
});

// ─── Protected Route Yönlendirmesi ───────────────────────────────────────────

test.describe('Protected Routes', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Oturumu temizle

  const protectedPaths = [
    '/en/dashboard',
    '/en/chat',
    '/en/vocabulary',
    '/en/progress',
  ];

  for (const path of protectedPaths) {
    test(`oturum açmadan ${path} → login yönlendirmesi`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/login/, { timeout: 5_000 });
    });
  }
});

// ─── Forgot Password ──────────────────────────────────────────────────────────

test.describe('Forgot Password', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('geçerli email ile başarı mesajı gösterir', async ({ page }) => {
    await page.goto('/en/forgot-password');
    await page.getByLabel(/email/i).fill('any@example.com');
    await page.getByRole('button', { name: /send|gönder/i }).click();

    // Başarı mesajı (email enumeration'dan bağımsız)
    await expect(page.getByText(/sent|gönderildi|link/i)).toBeVisible({ timeout: 10_000 });
  });

  test('geçersiz email ile hata gösterir', async ({ page }) => {
    await page.goto('/en/forgot-password');
    await page.getByLabel(/email/i).fill('invalid');
    await page.getByRole('button', { name: /send|gönder/i }).click();

    await expect(page.getByText(/email|geçersiz/i)).toBeVisible({ timeout: 5_000 });
  });
});
