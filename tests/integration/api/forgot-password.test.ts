/**
 * Integration Tests — POST /api/auth/forgot-password
 *
 * Güvenlik açısından kritik bir endpoint:
 * - Email enumeration'a karşı her zaman 200 döner
 * - Token oluşturma ve silme doğrulanır
 * - Email gönderimi mock ile izlenir
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { __mocks__, resetPrismaState } from '../../mocks/prisma.ts';
import { sentEmails, resetEmailState } from '../../mocks/email.ts';
import { createUser, createPasswordResetToken } from '../../helpers/factories.ts';
import { makeRequest, parseJson } from '../../helpers/request.ts';

import { POST } from '@/app/api/auth/forgot-password/route';

let testIpCounter = 1000;
const nextTestIp = () => `10.50.${Math.floor(testIpCounter / 254) % 254}.${testIpCounter++ % 254}`;

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    resetPrismaState();
    resetEmailState();
  });

  it('mevcut kullanıcı için 200 döner', async () => {
    __mocks__.user.findUnique = async () => createUser({ email: 'user@example.com' });
    __mocks__.passwordResetToken.deleteMany = async () => ({ count: 0 });
    __mocks__.passwordResetToken.create = async () => createPasswordResetToken();

    const req = makeRequest('/api/auth/forgot-password',
      { email: 'user@example.com' },
      { headers: { 'x-forwarded-for': nextTestIp() } }
    );
    const res = await POST(req);

    assert.equal(res.status, 200);
    const body = await parseJson<{ message: string }>(res);
    assert.ok(body.message.length > 0, 'Mesaj boş');
  });

  it('var olmayan email için de 200 döner (email enumeration önleme)', async () => {
    // Kullanıcı bulunamadı — ama yine de 200
    __mocks__.user.findUnique = async () => null;

    const req = makeRequest('/api/auth/forgot-password',
      { email: 'nonexistent@example.com' },
      { headers: { 'x-forwarded-for': nextTestIp() } }
    );
    const res = await POST(req);

    assert.equal(res.status, 200, 'Email enumeration açığı: var olmayan email 200 dönmedi');
  });

  it('geçersiz email formatı ile 400 döner', async () => {
    const req = makeRequest('/api/auth/forgot-password',
      { email: 'not-an-email' },
      { headers: { 'x-forwarded-for': nextTestIp() } }
    );
    const res = await POST(req);

    assert.equal(res.status, 400);
  });

  it('mevcut kullanıcıya email gönderir', async () => {
    __mocks__.user.findUnique = async () =>
      createUser({ email: 'reset@example.com', password: '$2b$hash' });
    __mocks__.passwordResetToken.deleteMany = async () => ({ count: 1 });
    __mocks__.passwordResetToken.create = async () =>
      createPasswordResetToken({ token: 'mock-reset-token' });

    const req = makeRequest('/api/auth/forgot-password',
      { email: 'reset@example.com' },
      { headers: { 'x-forwarded-for': nextTestIp() } }
    );
    await POST(req);

    assert.equal(sentEmails.length, 1, 'Email gönderilmedi');
    assert.equal(sentEmails[0].to, 'reset@example.com');
    assert.equal(sentEmails[0].type, 'password-reset');
    assert.ok(sentEmails[0].token, 'Token eksik');
  });

  it('var olmayan kullanıcıya email göndermez', async () => {
    __mocks__.user.findUnique = async () => null;

    const req = makeRequest('/api/auth/forgot-password',
      { email: 'ghost@example.com' },
      { headers: { 'x-forwarded-for': nextTestIp() } }
    );
    await POST(req);

    assert.equal(sentEmails.length, 0, 'Olmayan kullanıcıya email gönderildi');
  });

  it('şifresiz kullanıcıya (OAuth) email göndermez', async () => {
    // OAuth kullanıcıların `password` alanı null
    __mocks__.user.findUnique = async () =>
      createUser({ email: 'oauth@example.com', password: null as unknown as string });

    const req = makeRequest('/api/auth/forgot-password',
      { email: 'oauth@example.com' },
      { headers: { 'x-forwarded-for': nextTestIp() } }
    );
    const res = await POST(req);

    assert.equal(res.status, 200);
    assert.equal(sentEmails.length, 0, 'OAuth kullanıcısına email gönderildi');
  });

  it('rate limit aşıldığında 429 döner', async () => {
    __mocks__.user.findUnique = async () => null;
    const rateLimitIp = `10.50.99.${Math.floor(Math.random() * 200) + 1}`;

    let lastRes: Response | null = null;
    for (let i = 0; i < 4; i++) {
      const req = makeRequest('/api/auth/forgot-password',
        { email: `test${i}@example.com` },
        { headers: { 'x-forwarded-for': rateLimitIp } }
      );
      lastRes = await POST(req);
    }

    assert.ok(lastRes !== null);
    assert.equal(lastRes!.status, 429, 'Rate limit (3/15dk) tetiklenmedi');
  });
});
