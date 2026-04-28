import { test, expect } from "@playwright/test";

test.describe("Chat Smoke", () => {
  test("chat page renders core sections and tab navigation works", async ({ page }) => {
    await page.goto("/en/chat");

    await expect(page).not.toHaveURL(/login|pricing/);
    await expect(page.getByRole("button", { name: /new chat/i })).toBeVisible();
    await expect(page.getByPlaceholder(/write something in/i)).toBeVisible();
    await expect(page.getByText(/daily goal/i)).toBeVisible();

    // Header tabs should switch visible panels.
    await page.getByRole("button", { name: /grammar/i }).click();
    await expect(page.getByText(/grammar focus/i).first()).toBeVisible();

    await page.getByRole("button", { name: /vocab/i }).click();
    await expect(page.getByRole("link", { name: /open vocabulary bank/i })).toBeVisible();

    await page.getByRole("button", { name: /chat/i }).click();
    await expect(page.getByText(/start chatting/i)).toBeVisible();
  });
});
