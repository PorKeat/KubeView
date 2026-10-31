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

test("local terminal opens directly and fills the view", async ({ page }) => {
  await boot(page);

  const overviewGroup = page.getByTestId("nav-group-overview");
  if ((await overviewGroup.getAttribute("aria-expanded")) === "false") {
    await overviewGroup.click();
  }
  await page.getByTestId("nav-item-terminal").click();

  await expect(page.getByTestId("local-terminal-view")).toBeVisible();
  await expect(page.getByTestId("terminal-shell")).toBeVisible();
  await expect(page.getByTestId("local-terminal")).toBeVisible();
});
