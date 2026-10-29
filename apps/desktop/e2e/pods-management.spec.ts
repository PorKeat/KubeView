import { test, expect } from "@playwright/test";
import { expandSidebarGroups } from "./nav";

test.describe("KubeView UI - Pods Management View", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_skip_boot_splash", "true");
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await expect(trigger).toContainText("kubernetes-admin@kubekey", {
      timeout: 15000,
    });
    await expandSidebarGroups(page);
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

  test("opens and interacts with the enhanced Resource Inspector Drawer", async ({
    page,
  }) => {
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
    const containersTab = page.locator(
      '[data-testid="inspector-tab-containers"]',
    );
    await expect(containersTab).toBeVisible({ timeout: 5000 });
    await containersTab.click();

    const conditionsTab = page.locator(
      '[data-testid="inspector-tab-conditions"]',
    );
    await expect(conditionsTab).toBeVisible({ timeout: 5000 });
    await conditionsTab.click();

    // Verify YAML Tab renders VS Code themed editor
    const yamlTab = page.locator('[data-testid="inspector-tab-yaml"]');
    await expect(yamlTab).toBeVisible({ timeout: 5000 });
    await yamlTab.click();
    await expect(page.locator("text=Kubernetes YAML")).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page
        .locator("text=metadata:")
        .or(page.locator("text=apiVersion:"))
        .first(),
    ).toBeVisible({ timeout: 5000 });

    // Switch back to Overview
    const overviewTab = page.locator('[data-testid="inspector-tab-overview"]');
    await expect(overviewTab).toBeVisible({ timeout: 5000 });
    await overviewTab.click();

    // Verify modal backdrop overlay is visible
    const backdrop = page.locator(
      '[data-testid="resource-inspector-backdrop"]',
    );
    await expect(backdrop).toBeVisible({ timeout: 5000 });

    // Capture screenshot of the polished drawer with modal background
    await page.screenshot({
      path: "apps/desktop/test-results/polished-inspector-drawer.png",
    });

    // Dismiss drawer by clicking the modal backdrop
    await backdrop.click({ position: { x: 50, y: 300 } });

    // Verify drawer closed
    await expect(metaHeader).not.toBeVisible({ timeout: 5000 });
  });
});
