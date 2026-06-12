import { test, expect } from "@playwright/test";

/**
 * MVP smoke test — public routes only (no Supabase creds, no AI, no email).
 * Confirms the app boots and the key public pages render, plus that a protected
 * route redirects to login. The authenticated journey is covered by the unit /
 * component suite and the README demo flow.
 */

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Decode confusing kid-related digital spending/i,
    }),
  ).toBeVisible();
});

test("login and signup pages load", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.goto("/signup");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
});

test("pricing page loads with beta + privacy copy", async ({ page }) => {
  await page.goto("/pricing");
  await expect(
    page.getByRole("heading", { name: /Simple pricing for early access/i }),
  ).toBeVisible();
  await expect(page.getByText(/Free during beta/i).first()).toBeVisible();
  await expect(
    page.getByText(/never ask for bank logins or full card numbers/i),
  ).toBeVisible();
});

test("a protected route redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
