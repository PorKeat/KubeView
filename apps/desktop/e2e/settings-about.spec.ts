import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";

async function boot(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_skip_boot_splash", "true");
  });
  await mockRpc(page);
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const trigger = page.locator('[data-testid="context-switcher-trigger"]');
  await expect(trigger).toBeVisible({ timeout: 15000 });
  await expect(trigger).toContainText("mock-cluster", { timeout: 15000 });
  await page.setViewportSize({ width: 1440, height: 900 });
}

test.describe("KubeView settings about", () => {
  test("shows the installed version and upgrade commands", async ({ page }) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"], {
        origin: "http://127.0.0.1:3005",
      });
    await boot(page);
    await page.getByTestId("nav-item-settings").click();
    await page.getByTestId("settings-nav-about").click();

    const panel = page.locator("#settings-about");
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("settings-about-version")).toHaveText(
      /^v\d+\.\d+\.\d+$/,
    );
    await expect(panel).toContainText("brew upgrade --cask kubeview");
    await expect(panel).toContainText("scoop update kubeview");
    await expect(page.getByTestId("settings-about-releases")).toBeVisible();
    await expect(page.getByTestId("settings-about-downloads")).toBeVisible();

    await page.getByTestId("settings-about-copy-homebrew").click();
    await expect(page.getByText("Update command copied")).toBeVisible();
    await expect(
      page.getByTestId("settings-about-copy-homebrew"),
    ).toContainText("Copied");
  });
});
