/**
 * E2E Tests — Erişim Kontrolü & Middleware Yönlendirmeleri (Senaryo 5–6 + Ek)
 *
 * Kapsam:
 * S5: Admin rotası → admin olmayan kullanıcı /dashboard'a yönlenir
 * S6: Cross-user veri izolasyonu → başkasının conversation'ına erişim yok
 * S10: Plansız kullanıcı korumalı sayfalara → /pricing yönlendirmesi
 * S11: Onboarding tamamlanmamış → /onboarding yönlendirmesi
 *
 * Bu testler iki farklı oturum kullanır:
 * - "chromium" projesi → auth.setup.ts (plan sahibi kullanıcı)
 * - "no-plan-tests" projesi → no-plan.setup.ts (plansız kullanıcı)
 */
import { test, expect } from '@playwright/test';

// ─── S5: Admin Rotası Koruması ────────────────────────────────────────────────

test.describe('S5 — Admin Rotası Koruması', () => {
  // Normal (non-admin) kullanıcı oturumu kullanır

  test('/en/admin → admin olmayan kullanıcı /dashboard\'a yönlenir', async ({ page }) => {
    await page.goto('/en/admin');

    // Admin değilse dashboard'a veya login'e gitmelidir
    await expect(page).toHaveURL(/(dashboard|login)/, { timeout: 8_000 });
    await expect(page).not.toHaveURL(/admin/);
  });

  test('/en/admin/users → erişim yok', async ({ page }) => {
    await page.goto('/en/admin/users');
    await expect(page).not.toHaveURL(/admin/, { timeout: 8_000 });
  });
});

// ─── S6: Cross-User Conversation İzolasyonu ───────────────────────────────────

test.describe('S6 — Conversation Çapraz Kullanıcı İzolasyonu', () => {
  test('rastgele/yanlış conversation ID ile GET → 404 veya boş', async ({ request }) => {
    // Var olmayan veya başkasına ait bir ID
    const fakeConvId = 'aaaaaaaa-bbbb-cccc-dddd-000000000000';
    const res = await request.get(`/api/chat?id=${fakeConvId}`);

    // 401 (kimlik yok) veya 200 + boş mesaj listesi veya 404 beklenir
    if (res.status() === 200) {
      const body = await res.json();
      // Başkasının konuşması gelmemeli → messages boş olmalı
      expect(body.messages ?? []).toHaveLength(0);
    } else {
      expect([401, 403, 404]).toContain(res.status());
    }
  });

  test('rastgele conversation silme → başkasına ait ID → 404 döner', async ({ request }) => {
    const fakeConvId = 'aaaaaaaa-bbbb-cccc-dddd-111111111111';
    const res = await request.delete(`/api/conversations/${fakeConvId}`);

    // Başkasına aitse veya yoksa 401/403/404 beklenir, asla 200 değil
    expect([401, 403, 404]).toContain(res.status());
  });

  test('vocabulary: başkasına ait kelime silme → 404', async ({ request }) => {
    const fakeWordId = 'aaaaaaaa-bbbb-cccc-dddd-222222222222';
    const res = await request.delete(`/api/vocabulary/${fakeWordId}`);
    expect([401, 403, 404]).toContain(res.status());
  });
});

// ─── S10: Plan Koruması — Sayfa Yönlendirmeleri ───────────────────────────────

test.describe('S10 — Plan Koruması (Middleware Redirects)', () => {
  // Bu testler NO-PLAN kullanıcı oturumu kullanır.
  // playwright.config.ts → "no-plan-tests" projesi bu dosyayı çalıştırır.

  const planProtectedPages = [
    '/en/chat',
    '/en/vocabulary',
    '/en/progress',
  ];

  for (const pagePath of planProtectedPages) {
    test(`Plan yok → ${pagePath} → /pricing'e yönlendirme`, async ({ page }) => {
      await page.goto(pagePath);
      // Login'e veya pricing'e yönlendirme beklenir (login daha erken kontrol edilir)
      await expect(page).toHaveURL(/(pricing|login)/, { timeout: 8_000 });
    });
  }

  test('Plan yok → /en/dashboard → /pricing\'e yönlendirme', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/(pricing|login)/, { timeout: 8_000 });
  });

  test('/en/pricing sayfası plansız kullanıcıya açık', async ({ page }) => {
    await page.goto('/en/pricing');
    // Login sayfasına yönlendirme OLMAMALI — pricing herkese açık
    await expect(page).toHaveURL(/pricing/, { timeout: 8_000 });
    await expect(page).not.toHaveURL(/login/);
  });

  test('/en/onboarding sayfası plansız kullanıcıya açık', async ({ page }) => {
    await page.goto('/en/onboarding');
    await expect(page).not.toHaveURL(/login/, { timeout: 5_000 });
  });
});

// ─── S11: Onboarding Tamamlanmamış → Yönlendirme ─────────────────────────────

test.describe('S11 — Onboarding Yönlendirme Mantığı', () => {
  // Not: Bu test plan sahibi kullanıcı oturumu kullanır (chromium projesi)
  // Onboarding tamamlanmış bir kullanıcı onboarding'e gittiğinde
  // → yönlendirilmemeli (sayfa açılmalı)

  test('Onboarding tamamlanmış kullanıcı /en/onboarding\'e gidebilir (sonsuz döngü yok)', async ({ page }) => {
    await page.goto('/en/onboarding');
    // Sonsuz döngüye girmemeli
    await expect(page).not.toHaveURL(/login/, { timeout: 5_000 });
    // Onboarding sayfasında kalmalı ya da dashboard'a gitmeli
    await expect(page).toHaveURL(/(onboarding|dashboard|pricing|chat)/, { timeout: 5_000 });
  });

  test('Pricing → planı olan kullanıcı /en/pricing\'e gidince /chat\'a yönlenir', async ({ page }) => {
    // Plan sahibi kullanıcı pricing sayfasına giderse /chat'a yönlendirilmeli
    // (pricing page.tsx'deki useEffect)
    await page.goto('/en/pricing');
    // Anında /chat'a yönlendirilir (aktif plan varsa)
    await expect(page).toHaveURL(/(chat|dashboard)/, { timeout: 8_000 });
  });
});

// ─── AppBar Güvenliği ─────────────────────────────────────────────────────────

test.describe('AppBar Plan Kontrolü', () => {
  test('Plan sahibi kullanıcı → "Go to Chat" linki /chat\'a işaret eder', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page).not.toHaveURL(/login|pricing/, { timeout: 5_000 });

    const chatLink = page.getByRole('link', { name: /chat/i }).first();
    const href = await chatLink.getAttribute('href');
    // Plan varsa /chat, yoksa /pricing olmalı
    // Bu test plan sahibi oturumda çalıştığı için /chat beklenir
    expect(href).toMatch(/chat/);
  });
});
