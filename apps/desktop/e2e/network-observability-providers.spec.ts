import { test, expect } from "@playwright/test";
import { mockRpc } from "./mockRpc";

const calicoObservability = {
  cni: {
    provider: "calico",
    displayName: "Calico",
    version: "v3.29.0",
    detected: true,
    detectionSource: "DaemonSet kube-system/calico-node",
    capabilities: [
      "overview",
      "standardNetworkPolicies",
      "services",
      "endpointSlices",
    ],
  },
  nodeCount: 3,
  readyNodeCount: 3,
  podCount: 12,
  runningPodCount: 11,
  serviceCount: 5,
  networkPolicyCount: 4,
  endpointSliceCount: 7,
  podCidrs: ["10.244.0.0/16"],
  ipFamilies: ["IPv4"],
};

test.describe("KubeView Network Observability providers", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
    });
    await mockRpc(page, {
      responses: { "networking.observability": calicoObservability },
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await expect(trigger).toContainText("mock-cluster", { timeout: 15000 });
  });

  test("renders the provider-neutral overview for non-Cilium CNIs", async ({
    page,
  }) => {
    await page.locator('[data-testid="nav-item-cilium"]').click();
    await expect(
      page.getByRole("tab", { name: "Network Observability tab" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("heading", { name: "Network Observability" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="network-observability-overview"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="cni-provider-name"]')).toHaveText(
      "Calico",
    );
    await expect(
      page.getByText("Calico detected", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="network-observability-overview"]'),
    ).toContainText("Standard NetworkPolicies");
    await expect(
      page.locator('[data-testid="network-observability-overview"]'),
    ).toContainText("not available for Calico");
    await expect(
      page.locator('[data-testid="cilium-tab-policies"]'),
    ).toHaveCount(0);
  });
});
