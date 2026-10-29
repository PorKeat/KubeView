import { test, expect } from "@playwright/test";
import { expandSidebarGroups } from "./nav";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test.describe("KubeView live GitOps UI", () => {
  test.describe.configure({ timeout: 60_000 });

  test("scans a real local manifest directory against the live cluster", async ({
    page,
  }) => {
    const directory = mkdtempSync(join(tmpdir(), "kubeview-gitops-ui-"));
    const name = `kubeview-gitops-ui-${Date.now()}`;
    writeFileSync(
      join(directory, "configmap.yaml"),
      `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${name}
  namespace: default
data:
  source: gitops
`,
    );

    try {
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
        "No live cluster is connected; live GitOps test skipped.",
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
      await page.locator('[data-testid="nav-item-gitops"]').click();
      await page.locator('[data-testid="gitops-manual-toggle"]').click();
      await page.locator('[data-testid="gitops-source-path"]').fill(directory);
      await page.locator('[data-testid="gitops-scan"]').click();

      await expect(page.locator('[data-testid="gitops-summary"]')).toBeVisible({
        timeout: 20000,
      });
      await expect(
        page.locator('[data-testid="gitops-resource-row"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('[data-testid="gitops-resource-row"]'),
      ).toContainText("Missing");
      await expect(
        page.locator('[data-testid="gitops-resource-row"]'),
      ).toContainText(name);
      await page.screenshot({
        path: "/tmp/kubeview-gitops-live-ui.png",
        fullPage: true,
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
