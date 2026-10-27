import { test, expect } from "@playwright/test";
import { mockRpc } from "./mockRpc";

test.describe("KubeView Pod Troubleshooting Assistant", () => {
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

  test("correlates status, events, logs, probes, limits, and commands", async ({
    page,
  }) => {
    await page.locator('[data-testid="nav-item-pods"]').click();
    const row = page.locator("main table tbody tr").first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.click();

    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="inspector-tab-diagnose"]').click();

    const assistant = page.getByTestId("pod-troubleshooting-assistant");
    await expect(assistant).toBeVisible();
    await expect(assistant).toContainText("Troubleshooting Assistant");
    await expect(page.getByTestId("pod-diagnosis-summary")).toContainText(
      "CrashLoopBackOff",
    );
    await expect(page.getByTestId("pod-diagnosis-summary")).toContainText(
      "failed to connect to database",
    );
    await expect(page.getByTestId("pod-diagnosis-fixes")).toContainText(
      "Inspect previous container logs",
    );
    await expect(page.getByTestId("pod-diagnosis-containers")).toContainText(
      "HTTP /healthz:8080",
    );
    await expect(page.getByTestId("pod-diagnosis-containers")).toContainText(
      "256Mi",
    );
    await expect(page.getByTestId("pod-diagnosis-containers")).toContainText(
      "panic: failed to connect to database",
    );
    await expect(page.getByTestId("pod-diagnosis-events")).toContainText(
      "BackOff",
    );
    await expect(page.getByTestId("pod-diagnosis-commands")).toContainText(
      "kubectl logs",
    );
    await expect(
      page.getByTestId("pod-diagnosis-command-copy").first(),
    ).toBeVisible();
  });
});
