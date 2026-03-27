/**
 * E2E Tests — AI Kapsam Kısıtlaması (Senaryo 7–9)
 *
 * Kapsam:
 * S7: Bot dil öğrenme dışı isteği (kod yazma) reddeder
 * S8: Bot dil öğrenme dışı isteği (matematik) reddeder
 * S9: Bot gerçek dil öğrenme sorusunu yanıtlar
 * + Bonus: Hedef dilde yazılan her şey yanıt alır (dil pratiği sayılır)
 *
 * ÖNEMLİ:
 * - Bu testler gerçek Gemini API çağrısı yapar → aktif GEMINI_API_KEY gerekir.
 * - Aktif plan sahibi kullanıcı gerekir (auth.setup.ts'ten gelen oturum).
 * - Gemini yanıtı deterministik değil → içerik kontrolü keyword bazlıdır.
 *
 * @tag: @ai @live
 */
import { test, expect } from '@playwright/test';

// Yanıt içinde dil öğrenmeyle ilgili anahtar kelimeler
const TUTOR_KEYWORDS = [
  'language', 'english', 'learn', 'practice', 'tutor',
  'grammar', 'vocabulary', 'help you', 'study',
  // Türkçe
  'dil', 'öğren', 'pratik', 'yardım', 'kelime',
];

// Off-topic yanıtta OLMAMASI gereken şeyler
const CODE_INDICATORS = [
  'def ', 'function(', 'console.log', 'import ', '```', 'print(',
  'class ', 'return ', '#!/',
];

/**
 * /api/chat'e istek at ve parse edilmiş yanıtı döndür.
 * Dönen obje: { status, content, translation, correction, words }
 */
async function sendChatMessage(request: Parameters<typeof test>[1] extends infer T ? T extends { request: infer R } ? R : never : never, message: string) {
  const res = await request.post('/api/chat', {
    data: {
      message,
      conversationId: null,
      topicId: null,
    },
  });

  return {
    status: res.status(),
    body: res.status() === 200 ? await res.json() : null,
  };
}

// ─── S7: Bot kod yazma isteğini reddeder ──────────────────────────────────────

test.describe('S7 — Kod Yazma İsteği Reddi', () => {
  test('Python kodu isteği → içerik kodu değil, reddi içerir', async ({ request }) => {
    const { status, body } = await sendChatMessage(request,
      'Write me a Python script that reverses a string'
    );

    // Plan yoksa testi atla
    if (status === 401 || status === 403) {
      test.skip(true, 'Bu test aktif plan + Gemini API key gerektirir');
      return;
    }
    if (status === 502) {
      test.skip(true, 'Gemini API erişilemiyor — rate limit veya key eksik');
      return;
    }

    expect(status).toBe(200);

    const content: string = body?.message?.content ?? '';
    expect(content.length).toBeGreaterThan(0);

    // İçerikte gerçek Python kodu OLMAMALI
    for (const indicator of CODE_INDICATORS) {
      expect(content).not.toContain(indicator);
    }
  });

  test('JavaScript kodu isteği → içerikte kod bloğu yok', async ({ request }) => {
    const { status, body } = await sendChatMessage(request,
      'Can you write me a JavaScript function to calculate fibonacci numbers?'
    );

    if (status !== 200) {
      test.skip(true, 'Bu test aktif plan + Gemini API key gerektirir');
      return;
    }

    const content: string = body?.message?.content ?? '';
    expect(content).not.toContain('function(');
    expect(content).not.toContain('```');
    expect(content).not.toContain('const ');
    expect(content.length).toBeGreaterThan(0);
  });
});

// ─── S8: Bot matematik / genel asistan isteğini reddeder ─────────────────────

test.describe('S8 — Matematik ve Genel Asistan İsteği Reddi', () => {
  test('matematiği çöz isteği → gerçek çözüm yok', async ({ request }) => {
    const { status, body } = await sendChatMessage(request,
      'Solve this for me: 5x + 3 = 28, what is x?'
    );

    if (status !== 200) {
      test.skip(true, 'Bu test aktif plan + Gemini API key gerektirir');
      return;
    }

    const content: string = body?.message?.content ?? '';
    // "x = 5" gibi doğrudan matematik yanıtı vermemeli
    // Reddetmeli ve dil öğrenmeye yönlendirmeli
    expect(content.length).toBeGreaterThan(0);
    // Matematiksel çözümün kaba bir doğrulaması
    const hasDirectAnswer = /x\s*=\s*5/i.test(content) || /answer is 5/i.test(content);
    expect(hasDirectAnswer).toBe(false);
  });

  test('haber analizi isteği → off-topic reddi', async ({ request }) => {
    const { status, body } = await sendChatMessage(request,
      'Can you explain what is happening in global politics right now and give me a detailed analysis?'
    );

    if (status !== 200) {
      test.skip(true, 'Bu test aktif plan + Gemini API key gerektirir');
      return;
    }

    const content: string = body?.message?.content ?? '';
    expect(content.length).toBeGreaterThan(0);

    // Yanıt kısa olmalı ve dil öğrenmeye yönlendirmeli (uzun siyasi analiz değil)
    // Içerikte "language" veya "practice" benzeri kelimeler olmalı
    const hasTutorSignal = TUTOR_KEYWORDS.some(kw =>
      content.toLowerCase().includes(kw)
    );
    expect(hasTutorSignal).toBe(true);
  });
});

// ─── S9: Bot dil öğrenme sorusunu yanıtlar ────────────────────────────────────

test.describe('S9 — Dil Öğrenme Soruları Yanıtlanır', () => {
  test('gramer sorusu → geçerli yanıt alınır', async ({ request }) => {
    const { status, body } = await sendChatMessage(request,
      'What is the difference between "since" and "for" in English?'
    );

    if (status !== 200) {
      test.skip(true, 'Bu test aktif plan + Gemini API key gerektirir');
      return;
    }

    // JSON yapısı doğru olmalı
    const msg = body?.message;
    expect(msg).toBeDefined();
    expect(typeof msg.content).toBe('string');
    expect(msg.content.length).toBeGreaterThan(10);

    // Kelime listesi dizi olmalı
    const words = body?.message?.words ?? [];
    expect(Array.isArray(words)).toBe(true);
  });

  test('kelime sorusu → content dolu ve çeviri var', async ({ request }) => {
    const { status, body } = await sendChatMessage(request,
      'What does "serendipity" mean?'
    );

    if (status !== 200) {
      test.skip(true, 'Bu test aktif plan + Gemini API key gerektirir');
      return;
    }

    const msg = body?.message;
    expect(typeof msg.content).toBe('string');
    expect(msg.content.length).toBeGreaterThan(5);
    // translation alanı da dolu olmalı
    expect(typeof msg.translation).toBe('string');
  });

  test('hedef dilde yazılan her mesaj yanıt alır (dil pratiği)', async ({ request }) => {
    // İngilizce hedef dilli kullanıcı İngilizce yazıyor → pratik sayılır
    const { status, body } = await sendChatMessage(request,
      'Hello, today I go to the market and buy some apple.'
    );

    if (status !== 200) {
      test.skip(true, 'Bu test aktif plan + Gemini API key gerektirir');
      return;
    }

    const msg = body?.message;
    expect(typeof msg.content).toBe('string');
    expect(msg.content.length).toBeGreaterThan(5);

    // Gramer hatası olduğu için correction dolu olabilir
    // (buy → bought veya bought some apples)
    // Bu alanın varlığını test ederiz, içeriği deterministik değil
    expect('correction' in msg).toBe(true);
  });

  test('hedef dilde günlük konu (yemek) → yanıt alınır, reddedilmez', async ({ request }) => {
    const { status, body } = await sendChatMessage(request,
      'I love cooking pasta. What is your favorite food?'
    );

    if (status !== 200) {
      test.skip(true, 'Bu test aktif plan + Gemini API key gerektirir');
      return;
    }

    const content: string = body?.message?.content ?? '';
    expect(content.length).toBeGreaterThan(10);

    // "I only help with language" gibi bir red mesajı OLMAMALI
    // Çünkü bu hedef dilde yazılmış → dil pratiği sayılır
    const isRefusal = /only.*tutor|cannot help|off.?topic|only.*language learning/i.test(content);
    expect(isRefusal).toBe(false);
  });
});
