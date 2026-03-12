import { describe, it, expect } from "vitest";
import { registerSchema } from "../auth.validation";

describe("registerSchema", () => {
  it("should pass with valid data", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "Password123",
    });
    expect(result.success).toBe(true);
  });

  it("should lowercase email", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "TEST@Example.com",
      password: "Password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });

  it("should fail with missing name", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Password123",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with short name", () => {
    const result = registerSchema.safeParse({
      name: "A",
      email: "test@example.com",
      password: "Password123",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "not-an-email",
      password: "Password123",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with short password", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "Ab1",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with password missing uppercase", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with password missing lowercase", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "PASSWORD123",
    });
    expect(result.success).toBe(false);
  });

  it("should fail with password missing digit", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "PasswordABC",
    });
    expect(result.success).toBe(false);
  });
});
