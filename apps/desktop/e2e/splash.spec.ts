import { test, expect } from "@playwright/test";
import { mockRpc } from "./mockRpc";

test("shows the boot splash and dismisses it smoothly", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("kubeview_skip_boot_splash");
  });
  await mockRpc(page);
  await page.goto("/", { waitUntil: "commit" });

  const splash = page.locator('[data-testid="splash-screen"]');
  await expect(splash).toBeVisible();
  await expect(splash).toContainText("Local-first Kubernetes workspace");
  await expect(splash).toContainText("Preparing your workspace");
  await expect(splash.locator(".splash-progress")).toBeVisible();
  await page.waitForTimeout(700);

  await page.screenshot({ path: "/tmp/kubeview-boot-splash.png" });
  await splash.click();
  await expect(splash).toHaveCount(0, { timeout: 3000 });
});
