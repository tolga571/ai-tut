/**
 * E2E Tests — Dashboard & Navigation
 *
 * Oturum açmış kullanıcı için:
 * - Dashboard erişimi
 * - Navigation bağlantıları
 * - Onboarding yönlendirmesi
 *
 * Bu testler auth.setup.ts'ten gelen oturumu kullanır.
 */
import { test, expect } from '@playwright/test';

// ─── Dashboard ────────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test('oturum açmış kullanıcı dashboard\'a erişebilir', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page).not.toHaveURL(/login/);
    // AppBar görünür olmalı
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 5_000 });
  });

  test('dashboard navigation linkleri çalışıyor', async ({ page }) => {
    await page.goto('/en/dashboard');

    // Chat linkine tıkla
    await page.getByRole('link', { name: /chat/i }).first().click();
    await expect(page).toHaveURL(/chat/, { timeout: 5_000 });
  });

  test('vocabulary sayfasına erişilebilir', async ({ page }) => {
    await page.goto('/en/vocabulary');
    await expect(page).not.toHaveURL(/login/);
    await expect(page).toHaveURL(/vocabulary/);
  });

  test('progress sayfasına erişilebilir', async ({ page }) => {
    await page.goto('/en/progress');
    await expect(page).not.toHaveURL(/login/);
  });
});

// ─── AppBar ───────────────────────────────────────────────────────────────────

test.describe('AppBar', () => {
  test('dashboard\'da AppBar görünür', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('Theme toggle mevcut', async ({ page }) => {
    await page.goto('/en/dashboard');
    // ThemeToggle button'u
    const toggle = page.getByRole('button', { name: /theme|dark|light/i });
    await expect(toggle).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Onboarding Yönlendirmesi ─────────────────────────────────────────────────

test.describe('Onboarding', () => {
  test('onboarding sayfası erişilebilir', async ({ page }) => {
    await page.goto('/en/onboarding');
    // Login'e yönlendirme olmamalı (oturum açık)
    await expect(page).not.toHaveURL(/login/);
  });
});
