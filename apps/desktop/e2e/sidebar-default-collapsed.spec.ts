import { test, expect } from "@playwright/test";
import { mockRpc } from "./mockRpc";

test("sidebar groups start collapsed and expand on click", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_skip_boot_splash", "true");
  });
  await mockRpc(page, { autoExpandNav: false });
  await page.goto("/");

  await expect(
    page.locator('[data-testid="context-switcher-trigger"]'),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.locator("[data-nav-group]").first()).toBeVisible();

  await expect(
    page.locator('[data-nav-group][aria-expanded="true"]'),
  ).toHaveCount(0);
  await expect(page.getByTestId("nav-item-pods")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/kubeview-sidebar-collapsed.png" });

  await page.getByTestId("nav-group-workloads").click();
  await expect(page.getByTestId("nav-item-pods")).toBeVisible();
  await expect(page.getByTestId("nav-group-workloads")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});
