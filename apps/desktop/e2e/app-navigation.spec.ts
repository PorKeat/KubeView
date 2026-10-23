import { test, expect } from "@playwright/test";

test.describe("KubeView UI - App Shell & Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Pre-set localStorage to dismiss onboarding splash and modals cleanly
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
    });
    await page.goto("/");
    // Wait for initial render and hydration
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads app shell with valid title and header", async ({ page }) => {
    await expect(page).toHaveTitle(/KubeView/i);

    // Verify context switcher trigger is visible in header
    const switcherTrigger = page.locator(
      '[data-testid="context-switcher-trigger"]',
    );
    await expect(switcherTrigger).toBeVisible({ timeout: 10000 });

    // Verify active context name is shown after loading
    await expect(switcherTrigger).toContainText("kubernetes-admin@kubekey", {
      timeout: 15000,
    });
  });

  test("displays bottom status bar with connection status", async ({
    page,
  }) => {
    // Wait for connection status to settle
    await page.waitForTimeout(1000);

    // Status bar should be visible at bottom
    const statusBar = page
      .locator("footer, [class*='StatusBar'], [class*='border-t']")
      .last();
    await expect(statusBar).toBeVisible();

    // Verify version or connected indicator
    await expect(page.locator("body")).toContainText(/v1\.34|Connected|ms/i);
  });
});
