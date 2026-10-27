import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";

async function openPage(page: Page, id: string) {
  await page.locator(`[data-testid="nav-item-${id}"]`).click();
}

test.describe("KubeView Config & Storage", () => {
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

  test("lists ConfigMaps and opens metadata and YAML", async ({ page }) => {
    await openPage(page, "configmaps");
    await expect(page.locator('[data-testid="configmaps-row"]')).toHaveCount(1);
    await expect(
      page.locator('[data-testid="configmaps-search"]'),
    ).toBeVisible();
    await expect(page.getByText("app-config", { exact: true })).toBeVisible();

    await page.locator('[data-testid="configmaps-row"]').first().click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="config-storage-overview"]'),
    ).toContainText("ConfigMap detail");
    await expect(
      page.locator('[data-testid="config-storage-overview"]'),
    ).toContainText("app.conf");
    await page.locator('[data-testid="inspector-tab-yaml"]').click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toContainText("enabled=true");
    await page.locator('[data-testid="inspector-close-btn"]').click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toHaveCount(0);
  });

  test("keeps Secret values redacted", async ({ page }) => {
    await openPage(page, "secrets");
    await expect(page.locator('[data-testid="secrets-row"]')).toHaveCount(1);
    await expect(page.locator("body")).not.toContainText("super-secret-value");
    await expect(
      page.getByText("database-secret", { exact: true }),
    ).toBeVisible();

    await page.locator('[data-testid="secrets-search"]').fill("missing");
    await expect(page.locator('[data-testid="secrets-row"]')).toHaveCount(0);
    await page.locator('[data-testid="secrets-search"]').fill("database");
    await expect(page.locator('[data-testid="secrets-row"]')).toHaveCount(1);

    await page.locator('[data-testid="secrets-row"]').first().click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toContainText("Secret values are redacted");
    await page.locator('[data-testid="inspector-tab-yaml"]').click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toContainText("<redacted>");
    await expect(page.locator("body")).not.toContainText("super-secret-value");
    await page.locator('[data-testid="inspector-close-btn"]').click();
  });

  test("opens the editor from the ConfigMap inspector", async ({ page }) => {
    await openPage(page, "configmaps");
    await page.locator('[data-testid="configmaps-row"]').first().click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="inspector-tab-edit"]'),
    ).toBeVisible();
    await page.locator('[data-testid="inspector-tab-edit"]').click();
    await expect(
      page.locator('[data-testid="config-storage-editor-form"]'),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close editor" }).click();
    await expect(
      page.locator('[data-testid="config-storage-editor-form"]'),
    ).toHaveCount(0);
  });

  test("expands multiline ConfigMap values in the editor", async ({ page }) => {
    await openPage(page, "configmaps");
    await page.locator('[data-testid="configmaps-edit"]').first().click();
    const value = page.locator('[data-testid="config-storage-value-0"]');
    await expect(value).toHaveValue("enabled=true");
    await value.fill(
      "line one\nline two\nline three\nline four\nline five\nline six",
    );
    const height = await value.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    expect(height).toBeGreaterThan(70);
    await page.screenshot({ path: "/tmp/kubeview-inline-edit-multiline.png" });
  });

  test("edits ConfigMaps from the form and adds keys", async ({ page }) => {
    await openPage(page, "configmaps");
    await page.locator('[data-testid="configmaps-edit"]').first().click();
    const modal = page.locator('[data-testid="config-storage-editor-form"]');
    await expect(modal).toBeVisible();
    await expect(
      page.locator('[data-testid="config-storage-value-0"]'),
    ).toHaveValue("enabled=true");

    await page
      .locator('[data-testid="config-storage-value-0"]')
      .fill("enabled=false");
    await page.locator('[data-testid="config-storage-add"]').click();
    await page.locator('[data-testid="config-storage-key-1"]').fill("feature");
    await page.locator('[data-testid="config-storage-value-1"]').fill("on");
    await page.locator('[data-testid="config-storage-save"]').click();
    await expect(modal).toHaveCount(0);
  });

  test("reveals and edits Secrets only after confirmation", async ({
    page,
  }) => {
    await openPage(page, "secrets");
    await page.locator('[data-testid="secrets-edit"]').first().click();
    const modal = page.locator('[data-testid="config-storage-editor-form"]');
    await expect(modal).toBeVisible();
    await expect(
      page.locator('[data-testid="config-storage-reveal"]'),
    ).toBeVisible();
    await expect(modal).not.toContainText("super-secret-value");

    await page.locator('[data-testid="config-storage-reveal"]').click();
    await expect(
      page.locator('[data-testid="config-storage-value-0"]'),
    ).toHaveValue("super-secret-value");
    await page
      .locator('[data-testid="config-storage-value-0"]')
      .fill("updated-secret-value");
    await page.locator('[data-testid="config-storage-save"]').click();
    await expect(modal).toHaveCount(0);
  });

  test("lists Persistent Volumes and Storage Classes as cluster scoped", async ({
    page,
  }) => {
    await openPage(page, "persistentvolumes");
    await expect(
      page.locator('[data-testid="persistentvolumes-row"]'),
    ).toHaveCount(1);
    await expect(page.getByText("pv-data", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Cluster Scope", { exact: true }),
    ).toBeVisible();
    await page.locator('[data-testid="persistentvolumes-row"]').first().click();
    await expect(
      page.locator('[data-testid="config-storage-overview"]'),
    ).toContainText("5Gi");
    await page.locator('[data-testid="inspector-close-btn"]').click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toHaveCount(0);

    await openPage(page, "storageclasses");
    await expect(
      page.locator('[data-testid="storageclasses-row"]'),
    ).toHaveCount(1);
    const storageClassRow = page
      .locator('[data-testid="storageclasses-row"]')
      .first();
    await expect(storageClassRow).toContainText("fast");
    await expect(storageClassRow).toContainText("kubernetes.io/aws-ebs");
  });
});
