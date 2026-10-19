import { test, expect } from "@playwright/test";

test.describe("KubeView UI - Pods Management View", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await expect(trigger).toContainText("kubernetes-admin@kubekey", { timeout: 15000 });
  });

  test("navigates to Pods view and displays pod list", async ({ page }) => {
    // Click on Pods in sidebar
    const podsNavBtn = page.locator('[data-testid="nav-item-pods"]');
    await expect(podsNavBtn).toBeVisible({ timeout: 10000 });
    await podsNavBtn.click();

    // Verify search input is present
    const searchInput = page.getByPlaceholder(/Filter pods/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Verify table headers (NAME, STATUS, READY, RESTARTS, AGE, NODE)
    await expect(page.locator("body")).toContainText(/NAME/i);
    await expect(page.locator("body")).toContainText(/STATUS/i);

    // Filter by pod name
    await searchInput.fill("calico");
    await page.waitForTimeout(500);

    // Clear search
    await searchInput.fill("");
  });
});
