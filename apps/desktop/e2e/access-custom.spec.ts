import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";

async function openPage(page: Page, id: string) {
  await page.locator(`[data-testid="nav-item-${id}"]`).click();
}

test.describe("KubeView Access & Custom", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
    });
    await mockRpc(page);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await expect(trigger).toContainText("mock-cluster", { timeout: 15000 });
  });

  test("lists Service Accounts and opens their inspector", async ({ page }) => {
    await openPage(page, "serviceaccounts");
    await expect(
      page.locator('[data-testid="serviceaccounts-row"]'),
    ).toHaveCount(1);
    await expect(page.getByText("default", { exact: true })).toBeVisible();
    await page.locator('[data-testid="serviceaccounts-row"]').first().click();
    await expect(
      page.locator('[data-testid="access-resource-overview"]'),
    ).toContainText("ServiceAccount detail");
    await page.locator('[data-testid="inspector-tab-yaml"]').click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toContainText("kind: ServiceAccount");
    await page.locator('[data-testid="inspector-close-btn"]').click();
  });

  test("lists all RBAC kinds and shows rules and subjects", async ({
    page,
  }) => {
    await openPage(page, "rbac");
    await expect(page.locator('[data-testid="rbac-row"]')).toHaveCount(3);
    await expect(page.getByText("pod-reader", { exact: true })).toBeVisible();
    await expect(page.getByText("read-pods", { exact: true })).toBeVisible();
    await page
      .locator('[data-testid="rbac-row"]')
      .filter({ hasText: "read-pods" })
      .first()
      .click();
    await expect(
      page.locator('[data-testid="access-resource-overview"]'),
    ).toContainText("RoleBinding");
    await expect(
      page.locator('[data-testid="access-resource-overview"]'),
    ).toContainText("ServiceAccount:default");
    await page.locator('[data-testid="inspector-close-btn"]').click();
  });

  test("filters non-resource RBAC rules without crashing", async ({ page }) => {
    await openPage(page, "rbac");
    const search = page.locator('[data-testid="rbac-search"]');

    await search.fill("healthz");
    await expect(page.locator('[data-testid="rbac-row"]')).toHaveCount(1);
    await expect(
      page.locator('[data-testid="rbac-row"]').filter({ hasText: "view" }),
    ).toBeVisible();

    await search.fill("zzzz-no-such-resource");
    await expect(
      page.getByText(/No RBAC resources match filter/),
    ).toBeVisible();
    await expect(search).toBeVisible();
    await expect(page.getByText("Component Render Error")).toHaveCount(0);

    await search.fill("");
    await expect(page.locator('[data-testid="rbac-row"]')).toHaveCount(3);
  });

  test("lists CRDs and browses instances", async ({ page }) => {
    await openPage(page, "crds");
    await expect(page.locator('[data-testid="crds-row"]')).toHaveCount(1);
    await expect(
      page.getByText("widgets.example.com", { exact: true }),
    ).toBeVisible();
    await page.locator('[data-testid="crds-row"]').first().click();
    await expect(
      page.locator('[data-testid="access-resource-overview"]'),
    ).toContainText("Widget");
    await page.locator('[data-testid="inspector-tab-instances"]').click();
    await expect(page.locator('[data-testid="crd-instances"]')).toContainText(
      "example-widget",
    );
    await page.locator('[data-testid="inspector-tab-yaml"]').click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toContainText("kind: CustomResourceDefinition");
    await page.locator('[data-testid="inspector-close-btn"]').click();
  });
});
