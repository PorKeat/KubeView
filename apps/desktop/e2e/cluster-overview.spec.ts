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

  test("filters cluster overview when namespace is selected and reverts on clear", async ({ page }) => {
    // Locate the namespace dropdown button in the header
    const nsButton = page.locator('button[aria-label*="Select Kubernetes namespace"]');
    await expect(nsButton).toBeVisible({ timeout: 10000 });

    // Open dropdown
    await nsButton.click();

    // Look for a namespace option such as "woodpecker" or "kube-system"
    const targetNsOption = page.locator('[role="menuitem"]').filter({ hasText: /kube-system|woodpecker/i }).first();
    await expect(targetNsOption).toBeVisible({ timeout: 5000 });
    const chosenNs = (await targetNsOption.innerText()).split("\n")[0].trim();
    await targetNsOption.click();

    // Verify ambient banner is displayed on Cluster Overview
    await expect(page.locator("body")).toContainText(/Namespace Scope:|Filtered by Namespace:/i, { timeout: 10000 });

    // Verify the Clear Filter button is present and click it
    const clearButton = page.getByRole("button", { name: /Clear Filter/i });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Verify filter is cleared
    await expect(page.locator("body")).not.toContainText(/Clear Filter/i);
  });
});
