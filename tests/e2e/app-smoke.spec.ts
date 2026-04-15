import { test, expect } from "@playwright/test";

const emailUser = {
  id: "11111111-1111-1111-1111-111111111111",
  telegramId: null,
  username: "jenya",
  firstName: "Jenya",
  lastName: null,
  photoUrl: null,
  language: "ru",
  day: 1,
  streak: 3,
  points: 42,
  streakShieldUsedAt: null,
};

const emailAuthSuccessBody = {
  success: true,
  isNew: false,
  user: emailUser,
  profile: { waterBaseline: 2000 },
  globalState: null,
  isDemo: false,
  isOwner: false,
};

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    Reflect.deleteProperty(window, "Telegram");
  });

  await page.route("**/telegram-web-app.js", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: "window.Telegram = undefined;",
    });
  });

  if (testInfo.title !== "restores an existing email session into the main app shell") {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Authentication required" }),
      });
    });
  }
});

test("shows a recoverable auth state outside Telegram", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("auth-error-screen")).toBeVisible();
  await expect(page.getByRole("heading", { name: "LeakFixer" })).toBeVisible();
  await expect(page.getByTestId("auth-email-button")).toBeVisible();
  await expect(page.getByTestId("auth-telegram-button")).toBeVisible();
});

test("opens email auth and validates empty submit", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("auth-email-button").click();

  await expect(page.getByTestId("email-auth-screen")).toBeVisible();
  await page.getByTestId("email-signin-choice").click();
  await page.getByTestId("email-submit-button").click();

  await expect(page.getByTestId("email-auth-error")).toBeVisible();
});

test("shows an email auth error for a wrong password", async ({ page }) => {
  await page.route("**/api/auth/email", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Wrong password" }),
    });
  });

  await page.goto("/");
  await page.getByTestId("auth-email-button").click();
  await page.getByTestId("email-signin-choice").click();
  await page.getByTestId("email-input").fill("jenya@example.com");
  await page.getByTestId("password-input").fill("wrong-password");
  await page.getByTestId("email-submit-button").click();

  await expect(page.getByTestId("email-auth-error")).toBeVisible();
  await expect(page.getByTestId("app-shell")).not.toBeVisible();
});

test("signs in with email and reaches the main app shell", async ({ page }) => {
  await page.route("**/api/auth/email", async (route) => {
    const requestBody = route.request().postDataJSON() as {
      action?: string;
      email?: string;
      password?: string;
    };

    expect(requestBody).toMatchObject({
      action: "signin",
      email: "jenya@example.com",
      password: "correct-password",
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(emailAuthSuccessBody),
    });
  });

  await page.goto("/");
  await page.getByTestId("auth-email-button").click();
  await page.getByTestId("email-signin-choice").click();
  await page.getByTestId("email-input").fill("jenya@example.com");
  await page.getByTestId("password-input").fill("correct-password");
  await page.getByTestId("email-submit-button").click();

  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByRole("heading", { name: "LeakFixer" })).toBeVisible();
});

test("restores an existing email session into the main app shell", async ({ page }) => {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(emailAuthSuccessBody),
    });
  });

  await page.goto("/");

  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByRole("heading", { name: "LeakFixer" })).toBeVisible();
  await expect(page.getByTestId("auth-error-screen")).not.toBeVisible();
});
