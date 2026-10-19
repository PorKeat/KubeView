import { test, expect } from "@playwright/test";

test.describe("KubeView UI - Cluster Overview & Health Metrics", () => {
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

  test("renders cluster overview with live nodes and telemetry metrics", async ({ page }) => {
    // Wait for the overview cards to be visible
    await expect(page.locator("body")).toContainText(/Nodes|Pods|CPU|Memory/i, { timeout: 12000 });

    // Verify node information is present
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();

    // Verify node name or cluster status
    await expect(page.locator("body")).toContainText(/v1\.34|Ready|10\.1/i);
  });
});
