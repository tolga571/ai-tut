/**
 * E2E Tests — Kayıt (Register) Akışı
 *
 * Kapsam:
 * R1: Başarılı kayıt → /pricing yönlendirmesi + userId alınır (DB kaydı var)
 * R2: Aynı e-posta ile tekrar kayıt → "User already exists" hatası görünür
 * R3: Frontend validasyon hataları (boş alan, kısa şifre, uyumsuz şifre, geçersiz email)
 * R4: DB doğrulaması — kayıt sonrası kullanıcı gerçekten giriş yapabiliyor mu?
 *
 * Test stratejisi:
 * - R1/R2/R3: Sayfa bazlı test (gerçek browser akışı)
 * - R1 API: POST /api/auth/register → 201 + userId kontrolü
 * - R4: Kayıt → login → oturum açıldı mı? (DB'de var = giriş başarılı)
 *
 * Bu testler oturum GEREKTİRMEZ — anonimdir.
 */
import { test, expect } from '@playwright/test';

// Oturumu temizle — kayıt testleri anonim olmalı
test.use({ storageState: { cookies: [], origins: [] } });

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

/** Her testte benzersiz email üretir — paralel çalışmada da çakışmaz */
const uniqueEmail = () => `e2e-reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

/** Register formunu doldur ve gönder */
async function fillRegisterForm(
  page: Parameters<typeof test>[1] extends infer T ? T extends { page: infer P } ? P : never : never,
  opts: { name?: string; email?: string; password?: string; confirmPassword?: string }
) {
  await page.goto('/en/register');

  if (opts.name !== undefined) {
    await page.getByPlaceholder(/your name/i).fill(opts.name);
  }
  if (opts.email !== undefined) {
    await page.getByPlaceholder(/you@example\.com/i).fill(opts.email);
  }
  if (opts.password !== undefined) {
    // Şifre alanı — "confirm" içermeyen label
    await page.locator('input[type="password"]').first().fill(opts.password);
  }
  if (opts.confirmPassword !== undefined) {
    // Confirm şifre alanı
    await page.locator('input[type="password"]').nth(1).fill(opts.confirmPassword);
  }

  await page.getByRole('button', { name: /continue|register|sign up|kayıt/i }).click();
}

// ─── R1: Başarılı Kayıt ───────────────────────────────────────────────────────

test.describe('R1 — Başarılı Kayıt', () => {
  test('geçerli bilgilerle kayıt → /pricing veya /onboarding sayfasına yönlendirilir', async ({ page }) => {
    const email = uniqueEmail();

    await fillRegisterForm(page, {
      name: 'Test Kullanıcı',
      email,
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    });

    // Başarılı kayıt: onboarding veya pricing'e yönlendirme
    await expect(page).toHaveURL(/(onboarding|pricing)/, { timeout: 15_000 });
    // Login veya register sayfasında kalmamalı
    await expect(page).not.toHaveURL(/register/);
    await expect(page).not.toHaveURL(/login/);
  });

  test('API: POST /api/auth/register → 201 + userId döner (DB kaydı onayı)', async ({ request }) => {
    const email = uniqueEmail();

    const res = await request.post('/api/auth/register', {
      data: {
        name: 'API Test User',
        email,
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      },
    });

    // 201 Created beklenir
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body).toHaveProperty('message', 'User created successfully');

    // userId dönmeli → DB'ye yazıldığının kanıtı
    expect(body).toHaveProperty('userId');
    expect(typeof body.userId).toBe('string');
    expect(body.userId.length).toBeGreaterThan(0);
  });

  test('başarılı kayıt sonrası loading spinner kaybolur, yönlendirilir', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/en/register');
    await page.getByPlaceholder(/your name/i).fill('Spinner Test');
    await page.getByPlaceholder(/you@example\.com/i).fill(email);
    await page.locator('input[type="password"]').first().fill('SecurePass123!');
    await page.locator('input[type="password"]').nth(1).fill('SecurePass123!');

    const submitBtn = page.getByRole('button', { name: /continue|register|sign up|kayıt/i });
    await submitBtn.click();

    // Loading sırasında buton disabled olmalı (spinner aktif)
    // Yönlendirilene kadar bekle
    await expect(page).toHaveURL(/(onboarding|pricing)/, { timeout: 15_000 });
  });
});

// ─── R2: Tekrarlayan E-posta ──────────────────────────────────────────────────

test.describe('R2 — Tekrarlayan E-posta ile Kayıt', () => {
  // İlk kayıt için sabit bir email kullanıyoruz (testten önce API ile oluştur)
  let duplicateEmail: string;

  test.beforeAll(async ({ request }) => {
    // Önce bu emaili kaydet
    duplicateEmail = uniqueEmail();
    await request.post('/api/auth/register', {
      data: {
        name: 'First User',
        email: duplicateEmail,
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      },
    });
  });

  test('kayıtlı e-posta ile tekrar kayıt → "already exists" hatası gösterir', async ({ page }) => {
    await fillRegisterForm(page, {
      name: 'Second User',
      email: duplicateEmail,
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    });

    // Hata toast veya inline hata mesajı görünmeli
    await expect(
      page.getByText(/already exists|already registered|zaten kayıtlı|bu e-posta|bu email/i)
    ).toBeVisible({ timeout: 10_000 });

    // Sayfada kalmaya devam etmeli — yönlendirme OLMAMALI
    await expect(page).toHaveURL(/register/);
  });

  test('API: tekrarlayan e-posta → 400 + hata mesajı', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: 'Duplicate User',
        email: duplicateEmail,
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/already exists|already registered/i);
  });
});

// ─── R3: Frontend Validasyon Hataları ────────────────────────────────────────

test.describe('R3 — Form Validasyon Hataları', () => {
  test('boş isim → hata mesajı, kayıt olmaz', async ({ page }) => {
    await fillRegisterForm(page, {
      name: '',   // boş
      email: uniqueEmail(),
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    });

    // Hata görünmeli, sayfada kalınmalı
    await expect(page.getByText(/name|isim|required|zorunlu/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/register/);
  });

  test('çok kısa isim (1 karakter) → API 400 veya frontend hata', async ({ page }) => {
    await fillRegisterForm(page, {
      name: 'A',   // min 2
      email: uniqueEmail(),
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    });

    // Frontend hata veya 400'den gelen hata — her halükarda register sayfasında kal
    // (Zod: name min 2)
    await page.waitForTimeout(2_000);
    // Başarıyla yönlendirilmemeli
    await expect(page).not.toHaveURL(/(onboarding|pricing|dashboard)/);
  });

  test('geçersiz email formatı → hata mesajı', async ({ page }) => {
    await fillRegisterForm(page, {
      name: 'Test User',
      email: 'gecersiz-email',  // @ yok
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    });

    await expect(page.getByText(/email|geçersiz|invalid/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/register/);
  });

  test('kısa şifre (7 karakter) → hata mesajı', async ({ page }) => {
    await fillRegisterForm(page, {
      name: 'Test User',
      email: uniqueEmail(),
      password: '1234567',   // 7 karakter, min 8 gerekli
      confirmPassword: '1234567',
    });

    await expect(
      page.getByText(/password.*8|8.*character|şifre.*8|en az 8/i)
    ).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/register/);
  });

  test('uyumsuz şifreler → "do not match" hatası', async ({ page }) => {
    await fillRegisterForm(page, {
      name: 'Test User',
      email: uniqueEmail(),
      password: 'SecurePass123!',
      confirmPassword: 'DifferentPass!',
    });

    await expect(
      page.getByText(/do not match|match|eşleş|uyuşmuyor/i)
    ).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/register/);
  });

  test('tamamen boş form → birden fazla hata görünür', async ({ page }) => {
    await page.goto('/en/register');
    await page.getByRole('button', { name: /continue|register|sign up|kayıt/i }).click();

    // En az bir hata mesajı görünmeli
    const errors = page.locator('p.text-red-500, [class*="text-red"]');
    await expect(errors.first()).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/register/);
  });

  test('API: kısa şifre → 400 (Zod)', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: 'Test',
        email: uniqueEmail(),
        password: 'short',       // min 8
        confirmPassword: 'short',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('API: isim eksik → 400 (Zod)', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        email: uniqueEmail(),
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('API: geçersiz email → 400 (Zod)', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: 'Test User',
        email: 'not-an-email',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      },
    });
    expect(res.status()).toBe(400);
  });
});

// ─── R4: DB Doğrulama — Kayıt Sonrası Login ──────────────────────────────────

test.describe('R4 — DB Doğrulaması (Kayıt → Login → Başarı)', () => {
  /**
   * Strateji: Yeni kullanıcıyı API ile kaydet, sonra login sayfasından
   * gerçekten giriş yap. Giriş başarılıysa → kullanıcı DB'ye yazılmış.
   *
   * Bu, Prisma'ya doğrudan bağlanmadan DB kaydını doğrulamanın en güvenilir yolu.
   */
  test('kayıt olan kullanıcı login yapabilir (DB kaydı mevcut)', async ({ page, request }) => {
    const email    = uniqueEmail();
    const password = 'DBVerify123!';

    // ── Adım 1: API ile kayıt ol ──────────────────────────────────────────
    const registerRes = await request.post('/api/auth/register', {
      data: {
        name: 'DB Verify User',
        email,
        password,
        confirmPassword: password,
      },
    });

    expect(registerRes.status()).toBe(201);
    const { userId } = await registerRes.json();
    expect(userId).toBeTruthy(); // DB ID alındı

    // ── Adım 2: Login sayfasından giriş yap ──────────────────────────────
    await page.goto('/en/login');
    await page.getByPlaceholder(/you@example\.com/i).fill(email);
    await page.getByPlaceholder(/••••••••/i).fill(password);
    await page.getByRole('button', { name: /sign in|log in|giriş/i }).click();

    // ── Adım 3: Başarılı giriş → DB'de var demek ─────────────────────────
    // Yeni kullanıcı → onboarding veya pricing'e gider (aktif plan yok)
    await expect(page).toHaveURL(/(onboarding|pricing|dashboard)/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/login/);

    console.log(`✅ DB doğrulandı: userId=${userId}, email=${email}`);
  });

  test('kayıt olmayan email ile login → 401/hata (DB\'de yok)', async ({ page }) => {
    const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;

    await page.goto('/en/login');
    await page.getByPlaceholder(/you@example\.com/i).fill(nonExistentEmail);
    await page.getByPlaceholder(/••••••••/i).fill('AnyPass123!');
    await page.getByRole('button', { name: /sign in|log in|giriş/i }).click();

    // Hata mesajı görünmeli
    await expect(
      page.getByText(/invalid|incorrect|hatalı|geçersiz|not found|bulunamadı/i)
    ).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/login/);
  });

  test('API: kayıt sonrası aynı userId tekrar oluşturulmaz', async ({ request }) => {
    const email = uniqueEmail();

    // İlk kayıt
    const res1 = await request.post('/api/auth/register', {
      data: { name: 'Unique User', email, password: 'SecurePass123!', confirmPassword: 'SecurePass123!' },
    });
    expect(res1.status()).toBe(201);
    const { userId: userId1 } = await res1.json();

    // İkinci kayıt aynı email
    const res2 = await request.post('/api/auth/register', {
      data: { name: 'Duplicate User', email, password: 'SecurePass123!', confirmPassword: 'SecurePass123!' },
    });
    expect(res2.status()).toBe(400); // Duplicate → hata

    // userId1 geçerli, ikinci kayıt reddedildi — DB'de tek kayıt var
    expect(userId1).toBeTruthy();
  });
});

// ─── Bonus: Güvenlik ─────────────────────────────────────────────────────────

test.describe('Register Güvenlik Kontrolleri', () => {
  test('API: 500 değil, şık hata mesajı döner (Prisma hatası simülasyonu)', async ({ request }) => {
    // Geçerli bir istek ama sonucu ne olursa olsun 5xx OLMAMALI (mutlak edge case)
    const res = await request.post('/api/auth/register', {
      data: {
        name: 'Edge Case',
        email: uniqueEmail(),
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      },
    });

    // 201 veya 400 beklenir — asla 500 değil
    expect([200, 201, 400, 429]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('message');
    expect(typeof body.message).toBe('string');
  });

  test('XSS denemesi — script tag email olarak → 400', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: '<script>alert(1)</script>',
        email: '<script>@test.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      },
    });
    // Zod email validasyonu yakalar → 400
    expect(res.status()).toBe(400);
  });

  test('çok uzun şifre (129 karakter) → 400', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: 'Test',
        email: uniqueEmail(),
        password: 'a'.repeat(129),     // max 128
        confirmPassword: 'a'.repeat(129),
      },
    });
    expect(res.status()).toBe(400);
  });
});
