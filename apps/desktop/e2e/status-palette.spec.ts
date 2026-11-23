import { test, expect } from "@playwright/test";
import { mockRpc } from "./mockRpc";

test.describe("KubeView color-safe status palette", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_skip_boot_splash", "true");
    });
    await mockRpc(page);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toContainText("mock-cluster", { timeout: 15000 });
  });

  test("shows the engine-reported Go runtime in the status bar", async ({
    page,
  }) => {
    await expect(page.getByTestId("status-go-version")).toHaveText(
      "Go 1.26.3",
      { timeout: 15000 },
    );
  });

  test("remaps both semantic tokens and legacy status utility classes", async ({
    page,
  }) => {
    const before = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement("div");
      probe.className = "text-amber-600 bg-amber-500/10";
      probe.style.display = "none";
      document.body.appendChild(probe);
      const style = getComputedStyle(probe);
      const result = {
        healthy: root.getPropertyValue("--status-healthy").trim(),
        amberText: style.color,
        amberBg: style.backgroundColor,
      };
      probe.remove();
      return result;
    });

    await page.getByTestId("open-settings").click();
    await expect(
      page.getByTestId("settings-status-palette-colorblind"),
    ).toBeVisible();
    await page.getByTestId("settings-status-palette-colorblind").click();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.dataset.statusPalette ?? "standard",
        ),
      )
      .toBe("colorblind");

    const after = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement("div");
      probe.className = "text-amber-600 bg-amber-500/10";
      probe.style.display = "none";
      document.body.appendChild(probe);
      const style = getComputedStyle(probe);
      const result = {
        healthy: root.getPropertyValue("--status-healthy").trim(),
        amberText: style.color,
        amberBg: style.backgroundColor,
      };
      probe.remove();
      return result;
    });

    expect(after.healthy).not.toBe(before.healthy);
    expect(after.amberText).not.toBe(before.amberText);
    expect(after.amberBg).not.toBe(before.amberBg);
  });
});
