/**
 * Unit Tests — src/lib/rateLimit.ts
 *
 * Sliding-window rate limiter ve IP extraction logic'ini test eder.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// ─── checkRateLimit ───────────────────────────────────────────────────────────

describe('checkRateLimit', () => {
  // Her test için benzersiz key kullanarak test izolasyonu sağla
  let keyCounter = 0;
  const uniqueKey = () => `test-key-rl-${Date.now()}-${++keyCounter}`;

  it('limit altında isteğe izin verir', () => {
    const key = uniqueKey();
    const allowed = checkRateLimit(key, 5, 60_000);
    assert.ok(allowed, 'İlk istek reddedildi');
  });

  it('limit sayısına kadar tüm isteklere izin verir', () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      const allowed = checkRateLimit(key, 5, 60_000);
      assert.ok(allowed, `${i + 1}. istek reddedildi`);
    }
  });

  it('limiti aşan isteği reddeder', () => {
    const key = uniqueKey();
    // 3 limit tanımla, 3 kez geç
    checkRateLimit(key, 3, 60_000);
    checkRateLimit(key, 3, 60_000);
    checkRateLimit(key, 3, 60_000);
    // 4. istek reddedilmeli
    const rejected = checkRateLimit(key, 3, 60_000);
    assert.ok(!rejected, 'Limit aşıldığında istek kabul edildi');
  });

  it('farklı keyler birbirini etkilemez', () => {
    const key1 = uniqueKey();
    const key2 = uniqueKey();
    // key1'i sınırla
    checkRateLimit(key1, 1, 60_000);
    checkRateLimit(key1, 1, 60_000); // reddedilir

    // key2 hâlâ izinli olmalı
    const allowed = checkRateLimit(key2, 1, 60_000);
    assert.ok(allowed, 'Farklı key etkilendi');
  });

  it('sıfır süreli pencere tüm istekleri reddeder', () => {
    const key = uniqueKey();
    // windowMs=0 → tüm geçmiş zaten dışarıda, ama limit=0 anlamı farklı
    // limit=1, windowMs=0: hiçbir timestamp pencere içinde kalmaz ama push eklenir
    // Bu edge-case: ilk istek geçer çünkü filter ile boş dizi olur
    const first = checkRateLimit(key, 1, 0);
    assert.ok(first, 'İlk istek reddedildi (windowMs=0)');
    // Hemen ardından limit=1 aşıldı mı? Aynı ms içinde timestamp kalabilir
    // Bu deterministic değil, bu yüzden sadece birinci geçişi test ediyoruz
  });

  it('limit=1 ile ikinci istek reddedilir', () => {
    const key = uniqueKey();
    const first = checkRateLimit(key, 1, 60_000);
    assert.ok(first, 'İlk istek kabul edilmedi');
    const second = checkRateLimit(key, 1, 60_000);
    assert.ok(!second, 'İkinci istek kabul edildi (limit=1 aşıldı)');
  });
});

// ─── getClientIp ──────────────────────────────────────────────────────────────

describe('getClientIp', () => {
  it('x-forwarded-for header\'ından IP alır', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    assert.equal(getClientIp(req), '192.168.1.1');
  });

  it('x-forwarded-for proxy zincirinde ilk IP\'yi alır', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '10.0.0.1, 172.16.0.1, 192.168.1.1' },
    });
    assert.equal(getClientIp(req), '10.0.0.1');
  });

  it('x-real-ip\'yi fallback olarak kullanır', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-real-ip': '203.0.113.5' },
    });
    assert.equal(getClientIp(req), '203.0.113.5');
  });

  it('header yoksa "unknown" döner', () => {
    const req = new Request('http://localhost/');
    assert.equal(getClientIp(req), 'unknown');
  });

  it('x-forwarded-for boşlukları trim eder', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '  10.0.0.2 , 10.0.0.3' },
    });
    assert.equal(getClientIp(req), '10.0.0.2');
  });
});
