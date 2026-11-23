import { test, expect } from "@playwright/test";
import { mockRpc } from "./mockRpc";

test.describe("KubeView UI - Live pod usage", () => {
  test("shows live CPU and memory usage beside requests", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_skip_boot_splash", "true");
    });
    await mockRpc(page);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toContainText("mock-cluster", { timeout: 15000 });

    await page.locator('[data-testid="nav-item-pods"]').click();

    const row = page.locator("table tbody tr").first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText("12m");
    await expect(row).toContainText("180.0Mi");

    await row.click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toBeVisible();
    await expect(page.locator("body")).toContainText("Live resource usage");

    await page.locator('[data-testid="inspector-tab-containers"]').click();
    await expect(page.locator("body")).toContainText("Live CPU:");
    await expect(page.locator("body")).toContainText("12m");
  });

  test("falls back to requests when metrics are unavailable", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_skip_boot_splash", "true");
    });
    await mockRpc(page, {
      errors: {
        "pods.metrics": {
          code: "K8S_FORBIDDEN",
          message: "metrics are not available to this identity",
        },
      },
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toContainText("mock-cluster", { timeout: 15000 });

    await page.locator('[data-testid="nav-item-pods"]').click();
    const row = page.locator("table tbody tr").first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText("10m");
    await expect(row).not.toContainText("12m");
  });
});
