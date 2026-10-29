import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";

async function boot(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_splash_seen", "true");
  });
  await mockRpc(page);
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const trigger = page.locator('[data-testid="context-switcher-trigger"]');
  await expect(trigger).toBeVisible({ timeout: 15000 });
  await expect(trigger).toContainText("mock-cluster", { timeout: 15000 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
}

const pages = [
  { id: "namespaces", title: "Namespaces", rows: 3 },
  { id: "events", title: "Events", rows: 3 },
  {
    id: "replicationcontrollers",
    title: "Replication Controllers",
    rows: 1,
  },
  { id: "endpointslices", title: "Endpoint Slices", rows: 2 },
  { id: "ingressclasses", title: "Ingress Classes", rows: 2 },
  {
    id: "persistentvolumeclaims",
    title: "Persistent Volume Claims",
    rows: 2,
  },
  {
    id: "horizontalpodautoscalers",
    title: "Horizontal Pod Autoscalers",
    rows: 1,
  },
  { id: "poddisruptionbudgets", title: "Pod Disruption Budgets", rows: 1 },
  { id: "resourcequotas", title: "Resource Quotas", rows: 1 },
  { id: "limitranges", title: "Limit Ranges", rows: 1 },
  { id: "priorityclasses", title: "Priority Classes", rows: 1 },
  { id: "runtimeclasses", title: "Runtime Classes", rows: 1 },
  { id: "leases", title: "Leases", rows: 1 },
  {
    id: "mutatingwebhookconfigurations",
    title: "Mutating Webhook Configs",
    rows: 1,
  },
  {
    id: "validatingwebhookconfigurations",
    title: "Validating Webhook Configs",
    rows: 1,
  },
  {
    id: "validatingadmissionpolicies",
    title: "Validating Admission Policies",
    rows: 1,
  },
  {
    id: "validatingadmissionpolicybindings",
    title: "Admission Policy Bindings",
    rows: 1,
  },
  { id: "helmreleases", title: "Helm Releases", rows: 1 },
];

test.describe("KubeView simple resource pages", () => {
  test("renders every RC1 resource page from the shared table", async ({
    page,
  }) => {
    await boot(page);
    await expect(page.getByTestId("nav-item-namespaces")).toContainText("3");
    await expect(page.getByTestId("nav-item-events")).toContainText("3");
    await expect(page.getByTestId("nav-item-endpointslices")).toContainText(
      "2",
    );

    for (const resource of pages) {
      await page.getByTestId(`nav-item-${resource.id}`).click();
      const view = page.getByTestId(`simple-resource-view-${resource.id}`);
      await expect(view).toBeVisible();
      await expect(
        view.getByRole("heading", { name: resource.title }),
      ).toBeVisible();
      await expect(
        view.locator('[data-testid="simple-resource-row"]'),
      ).toHaveCount(resource.rows, { timeout: 15000 });
    }
  });

  test("filters events, searches, and opens the shared detail drawer", async ({
    page,
  }) => {
    await boot(page);
    await page.getByTestId("nav-item-events").click();
    const view = page.getByTestId("simple-resource-view-events");
    const rows = view.locator('[data-testid="simple-resource-row"]');
    await expect(rows).toHaveCount(3, { timeout: 15000 });

    await view.getByRole("button", { name: "Warning" }).click();
    await expect(rows).toHaveCount(2);
    await view.getByRole("button", { name: "Normal" }).click();
    await expect(rows).toHaveCount(1);

    await view.getByRole("button", { name: "All", exact: true }).click();
    await view
      .getByRole("textbox", { name: "Search Events" })
      .fill("FailedMount");
    await expect(rows).toHaveCount(1);
    await view.getByRole("textbox", { name: "Search Events" }).fill("");
    await expect(rows).toHaveCount(3);

    await rows.first().click();
    const drawer = page.getByTestId("simple-resource-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("BackOff");
    await expect(drawer).toContainText("Pod/web-1");
    await page.getByTestId("simple-resource-drawer-close").click();
    await expect(drawer).toHaveCount(0);

    await page.waitForTimeout(300);
    await page.screenshot({
      path:
        process.env.KUBEVIEW_SIMPLE_RESOURCES_SCREENSHOT ??
        "/tmp/kubeview-simple-resources.png",
      fullPage: false,
    });
  });

  test("exposes YAML copy and guarded delete actions", async ({ page }) => {
    await boot(page);
    await page.getByTestId("nav-item-namespaces").click();
    const namespaceView = page.getByTestId("simple-resource-view-namespaces");
    await namespaceView
      .locator('[data-testid="simple-resource-row"]')
      .first()
      .click();
    await expect(
      namespaceView.getByTestId("simple-resource-copy-yaml"),
    ).toBeVisible();
    await namespaceView.getByTestId("simple-resource-drawer-close").click();

    await page.getByTestId("nav-item-leases").click();
    const leaseView = page.getByTestId("simple-resource-view-leases");
    await leaseView
      .locator('[data-testid="simple-resource-row"]')
      .first()
      .click();
    await expect(leaseView.getByTestId("simple-resource-delete")).toBeVisible();
    await leaseView.getByTestId("simple-resource-delete").click();
    await expect(
      leaseView.getByTestId("simple-resource-delete-confirm"),
    ).toBeVisible();
    await leaseView.getByRole("button", { name: "Cancel" }).click();
    await expect(
      leaseView.getByTestId("simple-resource-delete-confirm"),
    ).toHaveCount(0);
    await leaseView.getByTestId("simple-resource-drawer-close").click();
  });

  test("adds a Helm repository and browses its charts", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
    });
    await mockRpc(page);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toBeVisible({ timeout: 15000 });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId("nav-item-helmcharts").click();

    const view = page.getByTestId("helm-charts-view");
    await expect(view).toBeVisible();
    await expect(page.getByTestId("helm-charts-empty")).toBeVisible();
    await page.getByTestId("helm-add-repository").click();
    await page.getByTestId("helm-repository-name").fill("Example");
    await page
      .getByTestId("helm-repository-url")
      .fill("https://charts.example.com");
    await page.getByTestId("helm-repository-save").click();

    const rows = page.locator('[data-testid="helm-chart-row"]');
    await expect(rows).toHaveCount(2, { timeout: 15000 });
    await expect(rows.first()).toContainText("web");
    await expect(rows.first()).toContainText("1.4.2");

    await page.getByRole("textbox", { name: "Search charts" }).fill("worker");
    await expect(rows).toHaveCount(1);
    await page.getByRole("textbox", { name: "Search charts" }).fill("");

    await page.waitForTimeout(300);
    await page.screenshot({
      path:
        process.env.KUBEVIEW_HELM_CHARTS_SCREENSHOT ??
        "/tmp/kubeview-helm-charts.png",
      fullPage: false,
    });
  });

  test("shows a recoverable error state when listing is forbidden", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
    });
    await mockRpc(page, {
      errors: {
        "simpleResources.list": {
          code: "K8S_FORBIDDEN",
          message: "namespaces is forbidden: User cannot list resource",
        },
      },
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toBeVisible({ timeout: 15000 });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId("nav-item-namespaces").click();
    const view = page.getByTestId("simple-resource-view-namespaces");
    await expect(view).toBeVisible();
    await expect(view.getByText(/forbidden/i)).toBeVisible({ timeout: 15000 });
    await expect(view.getByRole("button", { name: "Retry" })).toBeVisible();
  });
});
