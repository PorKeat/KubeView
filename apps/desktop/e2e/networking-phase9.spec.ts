import { test, expect } from "@playwright/test";
import { mockRpc } from "./mockRpc";

test.describe("KubeView UI - Networking Phase 9", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_skip_boot_splash", "true");
    });
    await mockRpc(page);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await expect(trigger).toContainText("mock-cluster", { timeout: 15000 });
  });

  test("renders Services with endpoint readiness and runs diagnostics", async ({
    page,
  }) => {
    await page.locator('[data-testid="nav-item-services"]').click();
    await expect(page.locator('[data-testid="services-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="services-row"]')).toHaveCount(4);
    await expect(page.locator("body")).toContainText("ClusterIP");
    await expect(page.getByText("no selector", { exact: true })).toBeVisible();
    await expect(page.getByText("headless", { exact: true })).toBeVisible();
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();
    await expect(page.locator("body")).toContainText("1/1");

    await page.locator('[data-testid="services-row"]').first().click();
    await expect(page.locator("text=Service Detail")).toBeVisible();
    await expect(page.locator("text=Ready Endpoints")).toBeVisible();
    await page.getByRole("button", { name: "Run Diagnostics" }).click();
    await expect(
      page.locator('[data-testid="service-diagnostics-modal"]'),
    ).toBeVisible();
    await expect(page.locator("text=Healthy")).toBeVisible();
    await expect(
      page.getByText("web.production.svc.cluster.local").first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close diagnostics" }).click();
    await expect(
      page.locator('[data-testid="service-diagnostics-modal"]'),
    ).toHaveCount(0);
  });

  test("shows Ingress TLS status and opens YAML and delete flows", async ({
    page,
  }) => {
    await page.locator('[data-testid="nav-item-ingresses"]').click();
    await expect(page.locator('[data-testid="ingresses-row"]')).toHaveCount(1);
    await expect(
      page
        .locator('[data-testid="ingresses-row"]')
        .getByText("Valid", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Edit web-ingress" }).click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="inspector-resource-editor"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="inspector-resource-editor-yaml"]'),
    ).toContainText(/kind: Ingress/);
    await page.locator('[data-testid="inspector-close-btn"]').click();

    await page.getByRole("button", { name: "Delete web-ingress" }).click();
    await expect(
      page.locator('[data-testid="delete-resource-modal"]'),
    ).toBeVisible();
    const deleteButton = page.getByRole("button", { name: "Delete Ingress" });
    await expect(deleteButton).toBeDisabled();
    await page
      .getByLabel("Type resource name to confirm deletion")
      .fill("web-ingress");
    await expect(deleteButton).toBeEnabled();
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("renders Gateway API tab and NetworkPolicy traffic matrix", async ({
    page,
  }) => {
    await page.locator('[data-testid="nav-item-ingresses"]').click();
    await page.locator('[data-testid="gateways-view-tab"]').click();
    await expect(page.locator('[data-testid="gateways-row"]')).toHaveCount(1);
    await expect(page.locator("body")).toContainText("Gateway");
    await expect(page.locator("body")).toContainText("Programmed");

    await page.locator('[data-testid="nav-item-networkpolicies"]').click();
    await expect(
      page.locator('[data-testid="network-policies-row"]'),
    ).toHaveCount(1);
    await page.locator('[data-testid="network-policies-row"]').click();
    await expect(page.locator("text=Traffic Matrix")).toBeVisible();
    await expect(
      page.getByText("all sources", { exact: true }).first(),
    ).toBeVisible();
  });

  test("renders the port forwarding manager and counters", async ({ page }) => {
    await page.locator('[data-testid="nav-item-portforwards"]').click();
    await expect(
      page.getByRole("heading", { name: "Port Forwarding Manager" }),
    ).toBeVisible();
    await expect(page.locator("text=web-1")).toBeVisible();
    await expect(page.locator("text=127.0.0.1:18080")).toBeVisible();
    await expect(page.locator("text=1/3")).toBeVisible();
    await expect(
      page.locator('[data-testid="port-forward-target"]'),
    ).toBeVisible();
    await page.locator('[data-testid="port-forward-namespace"]').click();
    await page
      .locator('[data-testid="port-forward-namespace-option-production"]')
      .click();
    await expect(
      page.locator('[data-testid="port-forward-target"]'),
    ).toBeEnabled();
    await page.locator('[data-testid="port-forward-target"]').click();
    await expect(
      page.locator('[data-testid="port-forward-target-option-web"]'),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.locator('[data-testid="port-forward-start"]'),
    ).toBeDisabled();
  });

  test("renders Cilium resources and loads Hubble flows", async ({ page }) => {
    await page.locator('[data-testid="nav-item-cilium"]').click();
    await expect(
      page.getByRole("heading", { name: "Network Observability" }),
    ).toBeVisible();
    await expect(page.locator("text=Cilium installed")).toBeVisible();
    await expect(
      page.locator('[data-testid="network-observability-overview"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="cni-provider-name"]')).toHaveText(
      "Cilium",
    );

    await page.locator('[data-testid="cilium-tab-policies"]').click();
    await expect(page.locator("text=allow-web")).toBeVisible();

    await page.locator('[data-testid="cilium-tab-endpoints"]').click();
    await expect(page.locator("text=1234")).toBeVisible();

    await page.locator('[data-testid="cilium-tab-flows"]').click();
    await page.locator('[data-testid="hubble-load-flows"]').click();
    await expect(
      page.getByText("VERDICT_FORWARDED", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator("text=web-1 -> api-1")).toBeVisible();
  });

  test("shows pod IP family and node pod CIDR in the inspector", async ({
    page,
  }) => {
    await page.locator('[data-testid="nav-item-pods"]').click();
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();
    await expect(page.locator("text=Node Pod CIDR")).toBeVisible();
    await expect(page.locator("text=10.244.1.0/24")).toBeVisible();
    await expect(page.locator("text=IPv4")).toBeVisible();
  });
  test("renders compact status tags consistently", async ({ page }) => {
    const assertTagSize = async (
      locator: ReturnType<typeof page.locator>,
      expectedHeight: number,
    ) => {
      const metrics = await locator.evaluateAll((tags) =>
        tags.map((tag) => {
          const style = window.getComputedStyle(tag);
          return {
            height: Math.round(tag.getBoundingClientRect().height),
            fontSize: style.fontSize,
            label: tag.textContent?.trim() ?? "status tag",
          };
        }),
      );
      expect(metrics.length).toBeGreaterThan(0);
      for (const tag of metrics) {
        expect(tag.height, `${tag.label} height`).toBe(expectedHeight);
        expect(tag.fontSize, `${tag.label} font size`).toBe("10px");
      }
    };

    await page.locator('[data-testid="nav-item-services"]').click();
    await expect(page.locator('[data-testid="services-row"]')).toHaveCount(4);
    await assertTagSize(page.locator('[data-status-beacon="xs"]'), 16);

    await page.locator('[data-testid="nav-item-cilium"]').click();
    await expect(
      page.getByRole("heading", { name: "Network Observability" }),
    ).toBeVisible();
    await page.locator('[data-testid="cilium-tab-policies"]').click();
    const headerTags = page.locator('[data-status-beacon="sm"]');
    await expect(headerTags).toHaveCount(2);
    await assertTagSize(headerTags, 18);
    await assertTagSize(page.locator('[data-status-beacon="xs"]'), 16);
  });
});
