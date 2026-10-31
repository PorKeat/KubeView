import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";

async function boot(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_skip_boot_splash", "true");
  });
  await mockRpc(page);
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await expect(
    page.locator('[data-testid="context-switcher-trigger"]'),
  ).toBeVisible({ timeout: 15000 });
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function openSidebarSettings(page: Page) {
  await page.getByTestId("open-settings").click();
  await page.getByTestId("settings-nav-sidebar").click();
  await expect(page.getByTestId("settings-sidebar-badges")).toBeVisible();
}

async function backToWorkspace(page: Page) {
  await page.getByTestId("nav-back").click();
  await expect(page.getByTestId("nav-group-overview")).toBeVisible();
}

async function expandGroup(page: Page, id: string) {
  const group = page.getByTestId(`nav-group-${id}`);
  if ((await group.getAttribute("aria-expanded")) === "false") {
    await group.click();
  }
  await expect(group).toHaveAttribute("aria-expanded", "true");
}

test.describe("KubeView sidebar customization", () => {
  test("toggles badges and hides sidebar items from settings", async ({
    page,
  }) => {
    await boot(page);
    await expandGroup(page, "workloads");
    await expect(page.getByTestId("nav-badge-pods")).toHaveText("2");

    await openSidebarSettings(page);
    await page.getByTestId("settings-sidebar-badges").click();
    await page.getByTestId("settings-sidebar-item-toggle-pods").click();
    await expect(page.getByTestId("settings-sidebar-item-pods")).toHaveClass(
      /opacity-60/,
    );

    await backToWorkspace(page);
    await expandGroup(page, "workloads");
    await expect(page.getByTestId("nav-item-pods")).toHaveCount(0);
    await expect(page.getByTestId("nav-badge-pods")).toHaveCount(0);

    await openSidebarSettings(page);
    await page.getByTestId("settings-sidebar-reset").click();
    await backToWorkspace(page);
    await expandGroup(page, "workloads");
    await expect(page.getByTestId("nav-item-pods")).toBeVisible();
    await expect(page.getByTestId("nav-badge-pods")).toHaveText("2");
  });

  test("reorders and hides sidebar sections from settings", async ({
    page,
  }) => {
    await boot(page);
    await openSidebarSettings(page);

    await page
      .getByRole("button", { name: "Reorder Workloads section" })
      .dragTo(page.getByTestId("settings-sidebar-group-cluster"));

    await backToWorkspace(page);
    const reordered = await page
      .locator("[data-nav-group]")
      .evaluateAll((groups) =>
        groups.map((group) => group.getAttribute("data-nav-group")),
      );
    expect(reordered.indexOf("Workloads")).toBeLessThan(
      reordered.indexOf("Cluster"),
    );

    await openSidebarSettings(page);
    await page.getByTestId("settings-sidebar-group-toggle-scaling").click();
    await backToWorkspace(page);
    await expect(page.getByTestId("nav-group-scaling")).toHaveCount(0);

    await openSidebarSettings(page);
    await page.getByTestId("settings-sidebar-reset").click();
    await backToWorkspace(page);
    await expect(page.getByTestId("nav-group-scaling")).toBeVisible();
    const resetOrder = await page
      .locator("[data-nav-group]")
      .evaluateAll((groups) =>
        groups.map((group) => group.getAttribute("data-nav-group")),
      );
    expect(resetOrder.indexOf("Workloads")).toBeGreaterThan(
      resetOrder.indexOf("Cluster"),
    );
  });
});
