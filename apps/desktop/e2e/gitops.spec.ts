import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";

async function boot(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_splash_seen", "true");
  });
  await mockRpc(page);
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const trigger = page.locator('[data-testid="context-switcher-trigger"]');
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await expect(trigger).toContainText("mock-cluster", { timeout: 15000 });
  await page.locator('[data-testid="nav-item-gitops"]').click();
  await expect(page.locator('[data-testid="gitops-view"]')).toBeVisible();
}

test.describe("KubeView GitOps drift", () => {
  test("scans a local repository, shows drift, and applies a reviewed resource", async ({
    page,
  }) => {
    await boot(page);

    await page.locator('[data-testid="gitops-manual-toggle"]').click();
    await page
      .locator('[data-testid="gitops-source-path"]')
      .fill("/workspace/gitops");
    await page.locator('[data-testid="gitops-scan"]').click();

    const summary = page.locator('[data-testid="gitops-summary"]');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("Changed");
    await expect(summary).toContainText("Missing");
    await expect(
      page.locator('[data-testid="gitops-resource-row"]'),
    ).toHaveCount(3);

    await page
      .locator('[data-testid="gitops-resource-row"]')
      .filter({ hasText: "Service" })
      .click();
    const panel = page.locator('[data-testid="gitops-diff-panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Service/web");
    await expect(
      panel.locator('[data-testid="inspector-resource-editor-diff"]'),
    ).toBeVisible();
    await expect(panel).toContainText("8080");
    await expect(panel).toContainText("9090");

    await page.locator('[data-testid="gitops-apply-desired"]').click();
    await expect(
      page.locator('[data-testid="gitops-apply-confirm"]'),
    ).toBeVisible();
    await page.locator('[data-testid="gitops-confirm-apply"]').click();
    await expect(page.getByText("Service web updated")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator('[data-testid="gitops-recent-path"]').first(),
    ).toContainText("gitops");
  });

  test("shows an empty state before a source is scanned", async ({ page }) => {
    await boot(page);
    await expect(page.getByText("No drift report yet")).toBeVisible();
    await expect(
      page.locator('[data-testid="gitops-choose-folder"]'),
    ).toBeVisible();
    await page.locator('[data-testid="gitops-choose-folder"]').click();
    await expect(
      page.locator('[data-testid="gitops-source-path"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="gitops-scan"]')).toBeDisabled();
  });
});
