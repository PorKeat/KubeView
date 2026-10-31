import { test, expect } from "@playwright/test";
import { mockRpc } from "./mockRpc";

test("offline cluster hides stale sidebar counts", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_skip_boot_splash", "true");
  });
  await mockRpc(page, {
    errors: {
      "clusters.diagnose": {
        code: "K8S_CONNECTION_FAILED",
        message: "Cluster unreachable",
      },
    },
  });

  await page.goto("/");
  await expect(page.getByText(/Cannot Connect to/i)).toBeVisible({
    timeout: 15000,
  });

  // Counts from the last successful connection must not linger while offline.
  await expect(page.locator('[data-testid^="nav-badge-"]')).toHaveCount(0);
  await page.screenshot({ path: "/tmp/kubeview-offline-state.png" });
});
