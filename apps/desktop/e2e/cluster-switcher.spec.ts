import { test, expect } from "@playwright/test";

test.describe("KubeView UI - Cluster Context Switcher & Configuration", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // Wait for cluster context to load into UI
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await expect(trigger).toContainText("kubernetes-admin@kubekey", {
      timeout: 15000,
    });
  });

  test("lists exactly 2 deduplicated clusters in dropdown menu", async ({
    page,
  }) => {
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });

    // Open dropdown menu
    await trigger.click();

    // Verify context items are listed
    const items = page.locator('[data-testid="context-item"]');
    await expect(items).toHaveCount(2, { timeout: 5000 });

    // Verify the two specific cluster context names are present
    await expect(
      items.filter({ hasText: "kubernetes-admin@kubekey" }).first(),
    ).toBeVisible();
    await expect(
      items.filter({ hasText: "kubernetes-admin@kubekey (mailconfig)" }),
    ).toBeVisible();
  });

  test("can filter clusters via search input in dropdown", async ({ page }) => {
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await trigger.click();

    // Type in search box
    const searchInput = page.getByPlaceholder("Search cluster or endpoint...");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("mailconfig");
    const items = page.locator('[data-testid="context-item"]');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText(
      "kubernetes-admin@kubekey (mailconfig)",
    );

    // Clear search
    await searchInput.fill("");
    await expect(items).toHaveCount(2);
  });

  test("opens and cancels the Configure API Server Endpoint modal", async ({
    page,
  }) => {
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await trigger.click();

    // Click the configure slider icon on the first cluster
    const configBtn = page
      .locator('[data-testid="configure-endpoint-btn"]')
      .first();
    await expect(configBtn).toBeVisible();
    await configBtn.click();

    // Modal dialog should open
    const endpointInput = page.locator('[data-testid="endpoint-modal-input"]');
    await expect(endpointInput).toBeVisible({ timeout: 5000 });

    // Verify skip TLS checkbox is present
    const skipTlsCheckbox = page.locator(
      '[data-testid="endpoint-modal-skip-tls"]',
    );
    await expect(skipTlsCheckbox).toBeVisible();

    // Close modal via Cancel button
    const cancelBtn = page.locator('[data-testid="endpoint-modal-cancel"]');
    await cancelBtn.click();
    await expect(endpointInput).not.toBeVisible();
  });

  test("switches active context smoothly", async ({ page }) => {
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await trigger.click();

    // Click on the second context (mailconfig)
    const mailconfigItem = page.locator('[data-testid="context-item"]').filter({
      hasText: "mailconfig",
    });
    await mailconfigItem.click();

    // Trigger should reflect the new active context
    await expect(trigger).toContainText(
      "kubernetes-admin@kubekey (mailconfig)",
      { timeout: 10000 },
    );
  });
});
