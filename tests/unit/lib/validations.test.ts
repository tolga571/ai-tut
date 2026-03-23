/**
 * Unit Tests — src/lib/validations.ts
 *
 * Tüm Zod şemalarının doğru çalıştığını doğrular:
 * registerSchema, chatMessageSchema, profileSchema,
 * languagesSchema, postSchema, forgotPasswordSchema,
 * resetPasswordSchema, createTransactionSchema
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  registerSchema,
  chatMessageSchema,
  profileSchema,
  languagesSchema,
  postSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createTransactionSchema,
} from '@/lib/validations';

// ─── registerSchema ───────────────────────────────────────────────────────────

describe('registerSchema', () => {
  it('geçerli kayıt verisini kabul eder', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'securePass123',
      confirmPassword: 'securePass123',
    });
    assert.ok(result.success, 'Geçerli veri reddedildi');
  });

  it('adı 2 karakterden kısa olanı reddeder', () => {
    const result = registerSchema.safeParse({
      name: 'A',
      email: 'test@example.com',
      password: 'securePass123',
      confirmPassword: 'securePass123',
    });
    assert.ok(!result.success, 'Kısa ad kabul edildi');
  });

  it('geçersiz email formatını reddeder', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'not-an-email',
      password: 'securePass123',
      confirmPassword: 'securePass123',
    });
    assert.ok(!result.success, 'Geçersiz email kabul edildi');
  });

  it('8 karakterden kısa şifreyi reddeder', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: '123',
      confirmPassword: '123',
    });
    assert.ok(!result.success, 'Kısa şifre kabul edildi');
  });

  it('şifreler eşleşmiyorsa reddeder', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'securePass123',
      confirmPassword: 'differentPass123',
    });
    assert.ok(!result.success, 'Eşleşmeyen şifreler kabul edildi');
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      assert.ok(paths.includes('confirmPassword'), 'Hata yolu yanlış');
    }
  });

  it('emaili küçük harfe normalize eder', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'UPPER@EXAMPLE.COM',
      password: 'securePass123',
      confirmPassword: 'securePass123',
    });
    assert.ok(result.success);
    if (result.success) {
      assert.equal(result.data.email, 'upper@example.com');
    }
  });

  it('eksik alan olmadan reddeder', () => {
    const result = registerSchema.safeParse({ name: 'Test User' });
    assert.ok(!result.success);
  });
});

// ─── chatMessageSchema ────────────────────────────────────────────────────────

describe('chatMessageSchema', () => {
  it('geçerli mesajı kabul eder', () => {
    const result = chatMessageSchema.safeParse({ message: 'Hello world' });
    assert.ok(result.success);
  });

  it('boş mesajı reddeder', () => {
    const result = chatMessageSchema.safeParse({ message: '' });
    assert.ok(!result.success);
  });

  it('2000 karakterden uzun mesajı reddeder', () => {
    const result = chatMessageSchema.safeParse({ message: 'a'.repeat(2001) });
    assert.ok(!result.success);
  });

  it('conversationId ve topicId opsiyoneldir', () => {
    const result = chatMessageSchema.safeParse({
      message: 'Test',
      conversationId: 'conv-1',
      topicId: 'topic-1',
    });
    assert.ok(result.success);
  });
});

// ─── profileSchema ────────────────────────────────────────────────────────────

describe('profileSchema', () => {
  it('geçerli ismi kabul eder', () => {
    const result = profileSchema.safeParse({ name: 'John Doe' });
    assert.ok(result.success);
  });

  it('1 karakterlik ismi reddeder', () => {
    const result = profileSchema.safeParse({ name: 'J' });
    assert.ok(!result.success);
  });

  it('100 karakterden uzun ismi reddeder', () => {
    const result = profileSchema.safeParse({ name: 'A'.repeat(101) });
    assert.ok(!result.success);
  });
});

// ─── languagesSchema ──────────────────────────────────────────────────────────

describe('languagesSchema', () => {
  it('geçerli dil tercihini kabul eder', () => {
    const result = languagesSchema.safeParse({
      targetLang: 'en',
      nativeLang: 'tr',
      cefrLevel: 'A1',
    });
    assert.ok(result.success);
  });

  it('eksik targetLang ile reddeder', () => {
    const result = languagesSchema.safeParse({ nativeLang: 'tr' });
    assert.ok(!result.success);
  });

  it('learningGoal ve interestArea opsiyoneldir', () => {
    const result = languagesSchema.safeParse({
      targetLang: 'en',
      nativeLang: 'tr',
      learningGoal: 'Travel',
      interestArea: 'Technology',
    });
    assert.ok(result.success);
  });
});

// ─── forgotPasswordSchema ─────────────────────────────────────────────────────

describe('forgotPasswordSchema', () => {
  it('geçerli emaili kabul eder', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
    assert.ok(result.success);
  });

  it('geçersiz emaili reddeder', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-email' });
    assert.ok(!result.success);
  });

  it('emaili küçük harfe normalize eder', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'USER@EXAMPLE.COM' });
    assert.ok(result.success);
    if (result.success) {
      assert.equal(result.data.email, 'user@example.com');
    }
  });
});

// ─── resetPasswordSchema ──────────────────────────────────────────────────────

describe('resetPasswordSchema', () => {
  it('token ve yeni şifre ile kabul eder', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'valid-reset-token',
      password: 'newSecurePass123',
    });
    assert.ok(result.success);
  });

  it('token olmadan reddeder', () => {
    const result = resetPasswordSchema.safeParse({ password: 'newSecurePass123' });
    assert.ok(!result.success);
  });

  it('kısa yeni şifreyi reddeder', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'valid-token',
      password: 'short',
    });
    assert.ok(!result.success);
  });
});

// ─── createTransactionSchema ──────────────────────────────────────────────────

describe('createTransactionSchema', () => {
  it('geçerli işlem verisini kabul eder', () => {
    const result = createTransactionSchema.safeParse({
      priceId: 'pri_01example',
      userId: 'user-123',
      email: 'user@example.com',
    });
    assert.ok(result.success);
  });

  it('eksik email ile reddeder', () => {
    const result = createTransactionSchema.safeParse({
      priceId: 'pri_01example',
      userId: 'user-123',
    });
    assert.ok(!result.success);
  });

  it('geçersiz email ile reddeder', () => {
    const result = createTransactionSchema.safeParse({
      priceId: 'pri_01example',
      userId: 'user-123',
      email: 'not-an-email',
    });
    assert.ok(!result.success);
  });
});

// ─── postSchema ───────────────────────────────────────────────────────────────

describe('postSchema', () => {
  it('geçerli blog post verisini kabul eder', () => {
    const result = postSchema.safeParse({
      title: 'Test Post',
      slug: 'test-post',
      content: 'Some content here',
      category: 'blog',
      language: 'en',
      published: false,
      isPremium: false,
    });
    assert.ok(result.success);
  });

  it('geçersiz slug karakterini reddeder', () => {
    const result = postSchema.safeParse({
      title: 'Test',
      slug: 'Invalid Slug With Spaces',
      content: 'content',
      category: 'blog',
      language: 'en',
    });
    assert.ok(!result.success);
  });

  it('geçersiz kategoriyi reddeder', () => {
    const result = postSchema.safeParse({
      title: 'Test',
      slug: 'test',
      content: 'content',
      category: 'invalid-category',
      language: 'en',
    });
    assert.ok(!result.success);
  });

  it('document kategorisinde desteklenmeyen dili reddeder', () => {
    const result = postSchema.safeParse({
      title: 'Test',
      slug: 'test',
      content: 'content',
      category: 'document',
      language: 'xx', // geçersiz dil kodu
    });
    assert.ok(!result.success);
  });
});
