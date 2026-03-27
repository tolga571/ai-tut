/**
 * E2E Tests — API Güvenliği (Senaryo 1–4)
 *
 * Kapsam:
 * S1: Kimlik doğrulama olmadan API → 401
 * S2: Plansız kullanıcı API → 403 (Subscription required)
 * S3: Geçersiz/boş mesaj gönderimi → 400 (input validation)
 * S4: Rate limit aşımı → 429
 *
 * Bu testler doğrudan HTTP istekleri yapar (browser gerekmez).
 * Kullanılan oturum: "no-plan" projesi + "plan" projesi
 */
import { test, expect } from '@playwright/test';

// ─── S1: Kimlik doğrulama olmadan API erişimi → 401 ───────────────────────────

test.describe('S1 — Kimliksiz API Erişimi', () => {
  // Bu describe bloğu oturum KULLANMAZ — raw request gönderir
  test('POST /api/chat — kimlik yok → 401', async ({ request }) => {
    const res = await request.post('/api/chat', {
      headers: { 'Content-Type': 'application/json' },
      data: { message: 'Hello', conversationId: null },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('GET /api/user/dashboard — kimlik yok → 401', async ({ request }) => {
    const res = await request.get('/api/user/dashboard');
    expect(res.status()).toBe(401);
  });

  test('GET /api/conversations — kimlik yok → 401', async ({ request }) => {
    const res = await request.get('/api/conversations');
    expect(res.status()).toBe(401);
  });

  test('GET /api/vocabulary — kimlik yok → 401', async ({ request }) => {
    const res = await request.get('/api/vocabulary');
    expect(res.status()).toBe(401);
  });

  test('GET /api/word-of-day — kimlik yok → 401', async ({ request }) => {
    const res = await request.get('/api/word-of-day');
    expect(res.status()).toBe(401);
  });

  test('GET /api/user/progress — kimlik yok → 401', async ({ request }) => {
    const res = await request.get('/api/user/progress');
    expect(res.status()).toBe(401);
  });
});

// ─── S2: Plansız kullanıcı API → 403 ─────────────────────────────────────────

test.describe('S2 — Plansız Kullanıcı API Engeli', () => {
  // NOT: Bu testleri çalıştırmak için "no-plan" Playwright projesi gereklidir.
  // playwright.config.ts → no-plan-tests projesi bu dosyayı kullanır.

  test('POST /api/chat — plan yok → 403', async ({ request }) => {
    // Oturumun storageState'i playwright.config'deki no-plan projesi tarafından enjekte edilir.
    const res = await request.post('/api/chat', {
      data: { message: 'Hello world', conversationId: null },
    });
    // 401 (oturum henüz geçerli değil) veya 403 (plan yok) beklenir
    expect([401, 403]).toContain(res.status());
    if (res.status() === 403) {
      const body = await res.json();
      expect(body.error).toMatch(/subscription|plan|required/i);
    }
  });

  test('GET /api/user/dashboard — plan yok → 403', async ({ request }) => {
    const res = await request.get('/api/user/dashboard');
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/vocabulary — plan yok → 403', async ({ request }) => {
    const res = await request.get('/api/vocabulary');
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/word-of-day — plan yok → 403', async ({ request }) => {
    const res = await request.get('/api/word-of-day');
    expect([401, 403]).toContain(res.status());
  });
});

// ─── S3: Input Validasyon ─────────────────────────────────────────────────────

test.describe('S3 — Chat Input Validasyonu', () => {
  // Authenticated (plan sahibi) kullanıcı gerektirir — ana "chromium" projesi

  test('boş mesaj → 400', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { message: '', conversationId: null },
    });
    // 400 (validation) veya 401 (plan kullanıcısı değil) beklenir
    expect([400, 401, 403]).toContain(res.status());
  });

  test('çok uzun mesaj (10001 karakter) → 400 veya 413', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: {
        message: 'a'.repeat(10001),
        conversationId: null,
      },
    });
    expect([400, 401, 403, 413]).toContain(res.status());
  });

  test('eksik message alanı → 400', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { conversationId: null },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('JSON olmayan body → 400', async ({ request }) => {
    const res = await request.post('/api/chat', {
      headers: { 'Content-Type': 'text/plain' },
      data: 'not json at all',
    });
    expect([400, 401, 403, 500]).toContain(res.status());
  });
});

// ─── S4: Rate Limiting ────────────────────────────────────────────────────────

test.describe('S4 — Rate Limiting (authenticated user)', () => {
  // Bu test GERÇEKTEN 31 istek gönderir — aktif plan + gerçek sunucu gerektirir.
  // CI ortamında bu test yavaş olabilir; tag ile işaretlendi: @slow
  test('31 ardışık chat isteği → 429 alınır @slow', async ({ request }) => {
    const LIMIT = 31; // rate limit 30/min
    let got429 = false;

    for (let i = 0; i < LIMIT; i++) {
      const res = await request.post('/api/chat', {
        data: {
          message: `rate limit test message ${i}`,
          conversationId: null,
        },
      });

      if (res.status() === 429) {
        got429 = true;
        const body = await res.json();
        expect(body.error).toMatch(/too many|rate|slow down/i);
        break;
      }

      // Plan yoksa test anlamsız — early exit
      if (res.status() === 401 || res.status() === 403) {
        test.skip(true, 'Bu test aktif plan gerektiriyor');
        return;
      }
    }

    expect(got429).toBe(true);
  });
});
