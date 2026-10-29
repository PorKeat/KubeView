import { test, expect } from "@playwright/test";
import { expandSidebarGroups } from "./nav";

test.describe("KubeView live generic editor", () => {
  test.describe.configure({ timeout: 60_000 });

  test("loads a live manifest into the inline editor", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_skip_boot_splash", "true");
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1200);
    const text = (await trigger.textContent()) ?? "";
    test.skip(
      /no cluster|offline|connect|import kubeconfig|select cluster|checking/i.test(
        text,
      ),
      "No live cluster is connected; live editor test skipped.",
    );
    try {
      await page.waitForFunction(
        () => {
          const element = document.querySelector(
            '[data-testid="context-switcher-trigger"]',
          );
          return /status connected/i.test(
            element?.getAttribute("aria-label") ?? "",
          );
        },
        undefined,
        { timeout: 8000 },
      );
    } catch {
      test.skip(true, "Live cluster did not reach a connected state.");
      return;
    }

    await expandSidebarGroups(page);
    await page.locator('[data-testid="nav-item-serviceaccounts"]').click();
    await expect(
      page.locator('[data-testid="serviceaccounts-row"]').first(),
    ).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="serviceaccounts-edit"]').first().click();

    const drawer = page.locator('[data-testid="resource-inspector-drawer"]');
    const inline = page.locator('[data-testid="inspector-resource-editor"]');
    await expect(drawer).toBeVisible({ timeout: 15000 });
    await expect(inline).toBeVisible({ timeout: 15000 });
    await expect(
      inline.locator('[data-testid="inspector-resource-editor-yaml"]'),
    ).toContainText(/kind:\s*ServiceAccount/);
    await expect(page.getByText("Component Render Error")).toHaveCount(0);
    await page.locator('[data-testid="inspector-close-btn"]').click();

    await page.locator('[data-testid="nav-item-deployments"]').click();
    await expect(page.getByPlaceholder(/Filter deployments/i)).toBeVisible({
      timeout: 15000,
    });
    await page.locator('[data-testid="deployments-create"]').click();
    const modal = page.locator('[data-testid="resource-editor-modal"]');
    await expect(modal.getByText("Create Deployment")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Close YAML editor" }).click();

    const deploymentRow = page.locator("table tbody tr").first();
    if ((await deploymentRow.count()) > 0) {
      await deploymentRow.click();
      await expect(drawer).toBeVisible();
      await page.locator('[data-testid="inspector-edit-yaml"]').click();
      await expect(inline).toBeVisible({ timeout: 15000 });
      await expect(
        inline.locator('[data-testid="inspector-resource-editor-yaml"]'),
      ).toContainText(/kind:\s*Deployment/);
    }
  });
});
