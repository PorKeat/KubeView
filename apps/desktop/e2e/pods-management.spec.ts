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

  test("opens and interacts with the enhanced Resource Inspector Drawer", async ({ page }) => {
    // Click on Pods in sidebar
    const podsNavBtn = page.locator('[data-testid="nav-item-pods"]');
    await expect(podsNavBtn).toBeVisible({ timeout: 10000 });
    await podsNavBtn.click();

    // Wait for at least one pod row to be rendered
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });

    // Click on the pod row to open the inspector drawer
    await firstRow.click();

    // Verify Resource Metadata is displayed
    const metaHeader = page.locator("text=Resource Metadata");
    await expect(metaHeader).toBeVisible({ timeout: 10000 });

    // Verify Labels header is displayed
    const labelsHeader = page.locator("text=Labels");
    await expect(labelsHeader).toBeVisible({ timeout: 5000 });

    // Verify tabs (Overview, Containers, Conditions, Events, YAML)
    const containersTab = page.locator('[data-testid="inspector-tab-containers"]');
    await expect(containersTab).toBeVisible({ timeout: 5000 });
    await containersTab.click();

    const conditionsTab = page.locator('[data-testid="inspector-tab-conditions"]');
    await expect(conditionsTab).toBeVisible({ timeout: 5000 });
    await conditionsTab.click();

    // Switch back to Overview
    const overviewTab = page.locator('[data-testid="inspector-tab-overview"]');
    await expect(overviewTab).toBeVisible({ timeout: 5000 });
    await overviewTab.click();

    // Capture screenshot of the polished drawer
    await page.screenshot({ path: "apps/desktop/test-results/polished-inspector-drawer.png" });

    // Close drawer using Close button
    const closeBtn = page.locator('[data-testid="inspector-close-btn"]');
    await expect(closeBtn).toBeVisible({ timeout: 5000 });
    await closeBtn.click();

    // Verify drawer closed
    await expect(metaHeader).not.toBeVisible({ timeout: 5000 });
  });
});

