import { test, expect } from "@playwright/test";

test.describe("Chat Smoke", () => {
  test("chat page renders core sections and tab navigation works", async ({ page }) => {
    await page.goto("/en/chat");

    if (/\/login/i.test(page.url())) {
      const email = process.env.E2E_USER_EMAIL;
      const password = process.env.E2E_USER_PASSWORD;

      test.skip(!email || !password, "Skipping smoke test: E2E plan-user credentials are missing.");

      await page.getByPlaceholder(/you@example\.com/i).fill(email!);
      await page.getByPlaceholder(/••••••••/i).fill(password!);
      await page.getByRole("button", { name: /sign in|log in|giriş/i }).click();
      await page.waitForTimeout(5000);
      test.skip(
        /\/login/i.test(page.url()),
        "Skipping smoke test: provided E2E credentials could not complete login."
      );
    }

    test.skip(/\/pricing/i.test(page.url()), "Skipping smoke test: current E2E user does not have an active plan.");
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
