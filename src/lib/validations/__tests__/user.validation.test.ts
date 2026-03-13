import { describe, it, expect } from "vitest";
import { updateProfileSchema, updateLanguagesSchema } from "../user.validation";

describe("updateProfileSchema", () => {
  it("should pass with valid name", () => {
    const result = updateProfileSchema.safeParse({ name: "John Doe" });
    expect(result.success).toBe(true);
  });

  it("should fail with empty name", () => {
    const result = updateProfileSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("should fail with short name", () => {
    const result = updateProfileSchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });

  it("should trim name", () => {
    const result = updateProfileSchema.safeParse({ name: "  John  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John");
    }
  });
});

describe("updateLanguagesSchema", () => {
  it("should pass with valid languages", () => {
    const result = updateLanguagesSchema.safeParse({
      nativeLang: "tr",
      targetLang: "en",
    });
    expect(result.success).toBe(true);
  });

  it("should fail when native and target are the same", () => {
    const result = updateLanguagesSchema.safeParse({
      nativeLang: "tr",
      targetLang: "tr",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with unsupported language", () => {
    const result = updateLanguagesSchema.safeParse({
      nativeLang: "xx",
      targetLang: "en",
    });
    expect(result.success).toBe(false);
  });

  it("should pass with all supported language pairs", () => {
    const validPairs = [
      { nativeLang: "tr", targetLang: "de" },
      { nativeLang: "en", targetLang: "ja" },
      { nativeLang: "ko", targetLang: "fr" },
    ];

    for (const pair of validPairs) {
      const result = updateLanguagesSchema.safeParse(pair);
      expect(result.success).toBe(true);
    }
  });
});
