/**
 * Integration Tests — POST /api/auth/register
 *
 * Route handler'ı doğrudan import edip Prisma mock'ı kullanarak test eder.
 * Gerçek DB bağlantısı veya HTTP sunucusu gerekmez.
 *
 * Loader, NODE_ENV=test olduğunda @/lib/prisma'yı
 * tests/mocks/prisma.ts'e yönlendirir.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { __mocks__, resetPrismaState } from '../../mocks/prisma.ts';
import { createUser, createRegisterPayload } from '../../helpers/factories.ts';
import { makeRequest, parseJson } from '../../helpers/request.ts';

// Route handler'ı mock'lar kurulduktan sonra import et
import { POST } from '@/app/api/auth/register/route';

// Her test için eşsiz IP üret → rate limit testlerini birbirinden izole eder
let testIpCounter = 0;
const nextTestIp = () => `10.${Math.floor(testIpCounter / 254) % 254}.${testIpCounter++ % 254}.1`;

// ─── Testler ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    resetPrismaState();
  });

  it('geçerli veriyle 201 döner ve userId içerir', async () => {
    __mocks__.user.findUnique = async () => null;
    __mocks__.user.create = async (args: unknown) => {
      const a = args as { data: { email: string } };
      return createUser({ email: a.data.email });
    };

    const req = makeRequest('/api/auth/register', createRegisterPayload(),
      { headers: { 'x-forwarded-for': nextTestIp() } });
    const res = await POST(req);

    assert.equal(res.status, 201);
    const body = await parseJson<{ message: string; userId: string }>(res);
    assert.ok(body.userId, 'userId döndürülmedi');
  });

  it('geçersiz email formatı ile 400 döner', async () => {
    const req = makeRequest('/api/auth/register', {
      name: 'Test User', email: 'not-an-email',
      password: 'securePass123', confirmPassword: 'securePass123',
    }, { headers: { 'x-forwarded-for': nextTestIp() } });
    const res = await POST(req);
    assert.equal(res.status, 400);
  });

  it('kısa şifre ile 400 döner', async () => {
    const req = makeRequest('/api/auth/register', {
      name: 'Test User', email: 'test@example.com',
      password: '12345', confirmPassword: '12345',
    }, { headers: { 'x-forwarded-for': nextTestIp() } });
    const res = await POST(req);
    assert.equal(res.status, 400);
  });

  it('şifreler eşleşmiyorsa 400 döner', async () => {
    const req = makeRequest('/api/auth/register', {
      name: 'Test User', email: 'test@example.com',
      password: 'securePass123', confirmPassword: 'differentPass',
    }, { headers: { 'x-forwarded-for': nextTestIp() } });
    const res = await POST(req);
    assert.equal(res.status, 400);
  });

  it('mevcut email ile 400 döner', async () => {
    __mocks__.user.findUnique = async () =>
      createUser({ email: 'existing@example.com' });

    const req = makeRequest('/api/auth/register',
      createRegisterPayload({ email: 'existing@example.com' }),
      { headers: { 'x-forwarded-for': nextTestIp() } }
    );
    const res = await POST(req);

    assert.equal(res.status, 400);
    const body = await parseJson<{ message: string }>(res);
    assert.ok(
      body.message.toLowerCase().includes('already') ||
      body.message.toLowerCase().includes('exists'),
      `Beklenmeyen hata mesajı: "${body.message}"`
    );
  });

  it('ad alanı eksikse 400 döner', async () => {
    const req = makeRequest('/api/auth/register', {
      email: 'test@example.com',
      password: 'securePass123',
      confirmPassword: 'securePass123',
    }, { headers: { 'x-forwarded-for': nextTestIp() } });
    const res = await POST(req);
    assert.equal(res.status, 400);
  });

  it('rate limit aşıldığında 429 döner', async () => {
    __mocks__.user.findUnique = async () => null;
    __mocks__.user.create = async (args: unknown) => {
      const a = args as { data: { email: string } };
      return createUser({ email: a.data.email });
    };

    // Eşsiz IP: test izolasyonu için timestamp kullan
    const testIp = `10.99.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    let lastResponse: Response | null = null;
    for (let i = 0; i < 6; i++) {
      const req = makeRequest(
        '/api/auth/register',
        createRegisterPayload({ email: `rl-test-${i}-${Date.now()}@example.com` }),
        { headers: { 'x-forwarded-for': testIp } }
      );
      lastResponse = await POST(req);
    }

    assert.ok(lastResponse !== null, 'Hiç istek yapılmadı');
    assert.equal(lastResponse!.status, 429, 'Rate limit tetiklenmedi');
  });
});
