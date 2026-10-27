import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";

async function openResourceTab(page: Page, id: string) {
  await page.locator(`[data-testid="nav-item-${id}"]`).click();
  await page.waitForTimeout(250);
}

test.describe("KubeView UI - Tab context menu", () => {
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

  test("shows a custom menu and closes other tabs", async ({ page }) => {
    await openResourceTab(page, "services");
    await openResourceTab(page, "endpoints");
    await openResourceTab(page, "networkpolicies");

    const servicesTab = page.getByRole("tab", { name: "Services tab" });
    await expect(servicesTab).toBeVisible();

    await page.evaluate(() => {
      (
        window as unknown as { __tabContextPrevented: boolean }
      ).__tabContextPrevented = false;
      document.addEventListener(
        "contextmenu",
        (event) => {
          (
            window as unknown as { __tabContextPrevented: boolean }
          ).__tabContextPrevented = event.defaultPrevented;
        },
        { once: true },
      );
    });

    await servicesTab.click({ button: "right" });

    const menu = page.locator('[data-testid="tab-context-menu"]');
    await expect(menu).toBeVisible();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: "/tmp/kubeview-tab-context-menu.png",
    });
    await expect(menu.getByTestId("tab-context-close")).toBeEnabled();
    await expect(menu.getByTestId("tab-context-close-others")).toBeEnabled();
    await expect(menu.getByTestId("tab-context-close-right")).toBeEnabled();
    await expect(menu.getByTestId("tab-context-close-all")).toBeEnabled();

    const prevented = await page.evaluate(
      () =>
        (window as unknown as { __tabContextPrevented: boolean })
          .__tabContextPrevented,
    );
    expect(prevented).toBe(true);

    await menu.getByTestId("tab-context-close-others").click();
    await expect(menu).toHaveCount(0);
    await expect(
      page.getByRole("tab", { name: "Cluster Overview tab" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Services tab" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Endpoints tab" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("tab", { name: "Network Policies tab" }),
    ).toHaveCount(0);
  });

  test("opens the menu without activating the right-clicked tab", async ({
    page,
  }) => {
    await openResourceTab(page, "services");
    await openResourceTab(page, "endpoints");
    await openResourceTab(page, "networkpolicies");

    const servicesTab = page.getByRole("tab", { name: "Services tab" });
    const activeTab = page.getByRole("tab", {
      name: "Network Policies tab",
    });
    await expect(activeTab).toHaveAttribute("aria-selected", "true");

    await servicesTab.click({ button: "right" });
    await expect(
      page.locator('[data-testid="tab-context-menu"]'),
    ).toBeVisible();
    await expect(servicesTab).toHaveAttribute("aria-selected", "false");
    await expect(activeTab).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="tab-context-menu"]')).toHaveCount(
      0,
    );
  });

  test("closes tabs to the right", async ({ page }) => {
    await openResourceTab(page, "services");
    await openResourceTab(page, "endpoints");
    await openResourceTab(page, "networkpolicies");

    const servicesTab = page.getByRole("tab", { name: "Services tab" });
    await servicesTab.click({ button: "right" });
    await page.locator('[data-testid="tab-context-close-right"]').click();

    await expect(page.getByRole("tab", { name: "Services tab" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Endpoints tab" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("tab", { name: "Network Policies tab" }),
    ).toHaveCount(0);
  });

  test("closes all closable tabs and keeps the pinned overview", async ({
    page,
  }) => {
    await openResourceTab(page, "services");
    await openResourceTab(page, "endpoints");

    await page
      .getByRole("tab", { name: "Services tab" })
      .click({ button: "right" });
    await page.locator('[data-testid="tab-context-close-all"]').click();

    await expect(
      page.getByRole("tab", { name: "Cluster Overview tab" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Services tab" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("tab", { name: "Endpoints tab" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("tab", { name: "Pods tab" })).toHaveCount(0);
  });

  test("closes the menu with Escape", async ({ page }) => {
    await openResourceTab(page, "services");
    await page
      .getByRole("tab", { name: "Services tab" })
      .click({ button: "right" });
    const menu = page.locator('[data-testid="tab-context-menu"]');
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  });
});
