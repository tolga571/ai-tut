/**
 * Unit Tests — src/lib/chatHelpers.ts
 *
 * buildMemoryBlock, getTopicInstruction, normalizeLearnedWords,
 * stripCorrectionEmoji fonksiyonlarını kapsamlı şekilde test eder.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildMemoryBlock,
  getTopicInstruction,
  normalizeLearnedWords,
  stripCorrectionEmoji,
} from "@/lib/chatHelpers";
import type { UserMemory, LearnedWord } from "@/lib/chatHelpers";

// ─── buildMemoryBlock ─────────────────────────────────────────────────────────

describe("buildMemoryBlock", () => {
  it("boş memory için boş string döner", () => {
    const result = buildMemoryBlock({});
    assert.equal(result, "");
  });

  it("null/undefined alanlar için boş string döner", () => {
    const memory: UserMemory = {
      learningGoal: null,
      interestArea: null,
      knownWords: [],
      recentMistakes: [],
    };
    assert.equal(buildMemoryBlock(memory), "");
  });

  it("learningGoal içerdiğinde prompt bloğunda görünür", () => {
    const result = buildMemoryBlock({ learningGoal: "travel" });
    assert.ok(result.includes("travel"), "learningGoal eksik");
    assert.ok(result.includes("USER MEMORY"), "başlık eksik");
  });

  it("interestArea içerdiğinde prompt bloğunda görünür", () => {
    const result = buildMemoryBlock({ interestArea: "technology" });
    assert.ok(result.includes("technology"));
  });

  it("knownWords listesi birleştirilmiş şekilde eklenir", () => {
    const result = buildMemoryBlock({ knownWords: ["café", "bonjour", "merci"] });
    assert.ok(result.includes("café"));
    assert.ok(result.includes("bonjour"));
    assert.ok(result.includes("merci"));
  });

  it("boş knownWords bloğa eklenmez", () => {
    const result = buildMemoryBlock({ knownWords: [] });
    assert.equal(result, "");
  });

  it("recentMistakes her biri madde olarak eklenir", () => {
    const result = buildMemoryBlock({
      recentMistakes: ["I goed → I went", "more better → better"],
    });
    assert.ok(result.includes("I goed → I went"));
    assert.ok(result.includes("more better → better"));
    assert.ok(result.includes("•"));
  });

  it("tüm alanlar doluysa hepsi bloğa eklenir", () => {
    const result = buildMemoryBlock({
      learningGoal: "business",
      interestArea: "finance",
      knownWords: ["profit", "revenue"],
      recentMistakes: ["he don't → he doesn't"],
    });
    assert.ok(result.includes("business"));
    assert.ok(result.includes("finance"));
    assert.ok(result.includes("profit"));
    assert.ok(result.includes("he don't"));
  });

  it("dönen string \\n\\nUSER MEMORY & PERSONALIZATION: ile başlar", () => {
    const result = buildMemoryBlock({ learningGoal: "travel" });
    assert.ok(result.startsWith("\n\nUSER MEMORY & PERSONALIZATION:"));
  });

  it("sadece recentMistakes verildiğinde prompt üretir", () => {
    const result = buildMemoryBlock({ recentMistakes: ["we was → we were"] });
    assert.ok(result.includes("we was → we were"));
    assert.ok(result.includes("We've worked on this before"));
  });
});

// ─── getTopicInstruction ──────────────────────────────────────────────────────

describe("getTopicInstruction", () => {
  const lang = "English";

  it("cafe için barista talimatı döner", () => {
    const result = getTopicInstruction("cafe", lang);
    assert.ok(result.includes("barista"));
    assert.ok(result.includes(lang));
  });

  it("travel-hotel için resepsiyonist talimatı döner", () => {
    const result = getTopicInstruction("travel-hotel", lang);
    assert.ok(result.includes("receptionist") || result.includes("hotel"));
    assert.ok(result.includes(lang));
  });

  it("job-interview için görüşmeci talimatı döner", () => {
    const result = getTopicInstruction("job-interview", lang);
    assert.ok(result.includes("interview") || result.includes("interviewer"));
    assert.ok(result.includes(lang));
  });

  it("friends için arkadaş talimatı döner", () => {
    const result = getTopicInstruction("friends", lang);
    assert.ok(result.includes("friend"));
    assert.ok(result.includes(lang));
  });

  it("small-talk için sohbet talimatı döner", () => {
    const result = getTopicInstruction("small-talk", lang);
    assert.ok(result.includes("small talk") || result.includes("weather") || result.includes("hobbies"));
    assert.ok(result.includes(lang));
  });

  it("bilinmeyen topicId için boş string döner", () => {
    assert.equal(getTopicInstruction("unknown-topic", lang), "");
  });

  it("undefined topicId için boş string döner", () => {
    assert.equal(getTopicInstruction(undefined, lang), "");
  });

  it("her topic için dil kodu dahil edilir", () => {
    const topics = ["cafe", "travel-hotel", "job-interview", "friends", "small-talk"];
    for (const topic of topics) {
      const result = getTopicInstruction(topic, "French");
      assert.ok(result.includes("French"), `${topic} için dil eksik`);
    }
  });
});

// ─── normalizeLearnedWords ────────────────────────────────────────────────────

describe("normalizeLearnedWords", () => {
  it("geçerli word dizisini döndürür", () => {
    const input: LearnedWord[] = [
      { word: "café", definition: "kahve dükkanı" },
      { word: "bonjour", definition: "merhaba" },
    ];
    const result = normalizeLearnedWords(input);
    assert.equal(result.length, 2);
    assert.equal(result[0].word, "café");
    assert.equal(result[1].definition, "merhaba");
  });

  it("null için boş dizi döner", () => {
    assert.deepEqual(normalizeLearnedWords(null), []);
  });

  it("undefined için boş dizi döner", () => {
    assert.deepEqual(normalizeLearnedWords(undefined), []);
  });

  it("boş dizi için boş dizi döner", () => {
    assert.deepEqual(normalizeLearnedWords([]), []);
  });

  it("string için boş dizi döner", () => {
    assert.deepEqual(normalizeLearnedWords("not an array"), []);
  });

  it("number için boş dizi döner", () => {
    assert.deepEqual(normalizeLearnedWords(42), []);
  });

  it("geçersiz elemanları filtreler (word eksik)", () => {
    const input = [
      { word: "hello", definition: "merhaba" },
      { definition: "eksik word alanı" },          // word yok
      { word: 123, definition: "number word" },     // word string değil
    ];
    const result = normalizeLearnedWords(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].word, "hello");
  });

  it("geçersiz elemanları filtreler (definition eksik)", () => {
    const input = [
      { word: "hello", definition: "merhaba" },
      { word: "world" },                            // definition yok
      { word: "test", definition: 99 },             // definition number
    ];
    const result = normalizeLearnedWords(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].word, "hello");
  });

  it("null elemanlı diziyi filtreler", () => {
    const input = [null, { word: "oui", definition: "evet" }, undefined];
    const result = normalizeLearnedWords(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].word, "oui");
  });

  it("tümü geçersizse boş dizi döner", () => {
    const input = [42, "string", null, {}];
    const result = normalizeLearnedWords(input);
    assert.deepEqual(result, []);
  });

  it("word ve definition boş string olsa bile kabul eder", () => {
    const result = normalizeLearnedWords([{ word: "", definition: "" }]);
    assert.equal(result.length, 1);
  });
});

// ─── stripCorrectionEmoji ─────────────────────────────────────────────────────

describe("stripCorrectionEmoji", () => {
  it("✏️ ön ekini temizler", () => {
    const result = stripCorrectionEmoji("✏️ I goed → I went — past tense");
    assert.equal(result, "I goed → I went — past tense");
  });

  it("✏️ olmayan metni aynen döndürür", () => {
    const result = stripCorrectionEmoji("Normal correction text");
    assert.equal(result, "Normal correction text");
  });

  it("null için boş string döner", () => {
    assert.equal(stripCorrectionEmoji(null), "");
  });

  it("undefined için boş string döner", () => {
    assert.equal(stripCorrectionEmoji(undefined), "");
  });

  it("boş string için boş string döner", () => {
    assert.equal(stripCorrectionEmoji(""), "");
  });

  it("✏️ sonrası boşlukları temizler", () => {
    const result = stripCorrectionEmoji("✏️   fazla boşluk   ");
    assert.equal(result, "fazla boşluk");
  });

  it("sadece ✏️ içeriyorsa boş string döner", () => {
    assert.equal(stripCorrectionEmoji("✏️"), "");
  });
});
