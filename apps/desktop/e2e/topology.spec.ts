import { test, expect } from "@playwright/test";
import { mockRpc } from "./mockRpc";

test("opens the live topology view", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_skip_boot_splash", "true");
  });
  await mockRpc(page);
  await page.goto("/");

  await expect(
    page.locator('[data-testid="context-switcher-trigger"]'),
  ).toContainText("mock-cluster", { timeout: 15000 });
  await page.locator('[data-testid="nav-item-topology"]').click();

  await expect(page.getByTestId("topology-view")).toBeVisible();
  await expect(page.getByText("Cluster fabric")).toBeVisible();
  await page.screenshot({ path: "/tmp/kubeview-topology-flow.png" });
  await expect(page.getByTestId("topology-node").first()).toContainText(
    "worker-1",
  );
  await expect(
    page.getByRole("heading", { name: "Traffic entry points" }),
  ).toBeVisible();
});
