import { describe, it, expect } from "vitest";
import { sendMessageSchema } from "../chat.validation";

describe("sendMessageSchema", () => {
  it("should pass with valid message", () => {
    const result = sendMessageSchema.safeParse({
      message: "Hello, how are you?",
    });
    expect(result.success).toBe(true);
  });

  it("should pass with message and conversationId", () => {
    const result = sendMessageSchema.safeParse({
      message: "Hello",
      conversationId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    });
    expect(result.success).toBe(true);
  });

  it("should pass with null conversationId", () => {
    const result = sendMessageSchema.safeParse({
      message: "Hello",
      conversationId: null,
    });
    expect(result.success).toBe(true);
  });

  it("should fail with empty message", () => {
    const result = sendMessageSchema.safeParse({
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with message exceeding 2000 chars", () => {
    const result = sendMessageSchema.safeParse({
      message: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("should fail with missing message", () => {
    const result = sendMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
