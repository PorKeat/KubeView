import { test, expect } from "@playwright/test";
import { mockRpc } from "./mockRpc";

const fetchedAt = "2026-10-27T08:00:00Z";

const contexts = [
  {
    name: "mock-cluster",
    cluster: "mock",
    server: "https://mock.example:6443",
    user: "mock-user",
    namespace: "default",
    isCurrent: true,
    provider: "generic",
    authType: "cert",
  },
  {
    name: "staging",
    cluster: "staging",
    server: "https://staging.example:6443",
    user: "staging-user",
    namespace: "default",
    isCurrent: false,
    provider: "gke",
    authType: "exec",
  },
  {
    name: "remote-cluster",
    cluster: "remote",
    server: "https://remote.example:6443",
    user: "remote-user",
    namespace: "default",
    isCurrent: false,
    provider: "kind",
    authType: "token",
  },
];

const fleetOverview = {
  clusters: [
    {
      contextName: "mock-cluster",
      cluster: "mock",
      server: "https://mock.example:6443",
      provider: "generic",
      authType: "cert",
      isCurrent: true,
      status: "healthy",
      totalNodes: 2,
      readyNodes: 2,
      totalPods: 20,
      runningPods: 20,
      pendingPods: 0,
      failedPods: 0,
      degradedWorkloads: 0,
      degradedWorkloadsByKind: {
        deployments: 0,
        replicaSets: 0,
        statefulSets: 0,
        daemonSets: 0,
        jobs: 0,
        cronJobs: 0,
      },
      warningCount: 1,
      totalCpuCores: 8,
      cpuPercent: 28,
      cpuUsagePercent: 32,
      totalMemoryGiB: 16,
      memoryPercent: 48,
      memoryUsagePercent: 54,
      hasMetrics: true,
      fetchedAt,
    },
    {
      contextName: "staging",
      cluster: "staging",
      server: "https://staging.example:6443",
      provider: "gke",
      authType: "exec",
      isCurrent: false,
      status: "degraded",
      totalNodes: 3,
      readyNodes: 2,
      totalPods: 12,
      runningPods: 10,
      pendingPods: 1,
      failedPods: 1,
      degradedWorkloads: 2,
      degradedWorkloadsByKind: {
        deployments: 2,
        replicaSets: 0,
        statefulSets: 0,
        daemonSets: 0,
        jobs: 0,
        cronJobs: 0,
      },
      warningCount: 7,
      totalCpuCores: 12,
      cpuPercent: 41,
      cpuUsagePercent: 45,
      totalMemoryGiB: 24,
      memoryPercent: 52,
      memoryUsagePercent: 58,
      hasMetrics: true,
      fetchedAt,
    },
    {
      contextName: "remote-cluster",
      cluster: "remote",
      server: "https://remote.example:6443",
      provider: "kind",
      authType: "token",
      isCurrent: false,
      status: "offline",
      error: "dial tcp 10.0.0.9:6443: connect: connection refused",
      totalNodes: 0,
      readyNodes: 0,
      totalPods: 0,
      runningPods: 0,
      pendingPods: 0,
      failedPods: 0,
      degradedWorkloads: 0,
      degradedWorkloadsByKind: {
        deployments: 0,
        replicaSets: 0,
        statefulSets: 0,
        daemonSets: 0,
        jobs: 0,
        cronJobs: 0,
      },
      warningCount: 0,
      totalCpuCores: 0,
      cpuPercent: 0,
      totalMemoryGiB: 0,
      memoryPercent: 0,
      hasMetrics: false,
      fetchedAt,
    },
  ],
  totals: {
    total: 3,
    healthy: 1,
    degraded: 1,
    offline: 1,
    totalNodes: 5,
    readyNodes: 4,
    totalPods: 32,
    runningPods: 30,
    failedPods: 1,
    degradedWorkloads: 2,
    warningCount: 8,
  },
  fetchedAt,
};

async function openFleetHealth(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "View fleet health" }).click();
  await expect(
    page.locator('[data-testid="fleet-overview-view"]'),
  ).toBeVisible();
}

test.describe("KubeView All Clusters", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
    });
    await mockRpc(page, {
      responses: {
        "clusters.listContexts": {
          currentContext: "mock-cluster",
          configPath: "/tmp/mock-kubeconfig",
          contexts,
        },
        "clusters.fleetOverview": fleetOverview,
      },
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await expect(trigger).toContainText("mock-cluster", { timeout: 15000 });
  });

  test("renders all clusters with aggregate health", async ({ page }) => {
    await page.locator('[data-testid="cluster-rail-all"]').click();

    await expect(
      page.getByRole("tab", { name: "All Clusters tab" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.locator('[data-testid="cluster-catalog-view"]'),
    ).toBeVisible();
    await openFleetHealth(page);
    const cards = page.locator('[data-testid="fleet-cluster-card"]');
    await expect(cards).toHaveCount(3);
    await expect(
      page.locator('[data-testid="fleet-cluster-card"][data-status="offline"]'),
    ).toHaveCount(1);
    await expect(
      page.locator(
        '[data-testid="fleet-cluster-card"][data-context-name="mock-cluster"]',
      ),
    ).toContainText("Active");
    await expect(
      page.locator(
        '[data-testid="fleet-cluster-card"][data-context-name="mock-cluster"]',
      ),
    ).toContainText("8 cores");
    await expect(
      page.locator(
        '[data-testid="fleet-cluster-card"][data-context-name="staging"]',
      ),
    ).toContainText("Failing: 2 Deployments");
    await expect(page.getByTestId("fleet-filter-attention")).toContainText("1");
    await expect(page.getByTestId("fleet-filter-offline")).toContainText("1");
  });

  test("filters and searches clusters without losing the view", async ({
    page,
  }) => {
    await page.locator('[data-testid="cluster-rail-all"]').click();
    await openFleetHealth(page);
    const cards = page.locator('[data-testid="fleet-cluster-card"]');
    await expect(cards).toHaveCount(3);

    await page.getByTestId("fleet-filter-attention").click();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute("data-context-name", "staging");

    await page.getByTestId("fleet-filter-all").click();
    await page.getByTestId("fleet-search").fill("remote");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute(
      "data-context-name",
      "remote-cluster",
    );

    await page.getByTestId("fleet-search").fill("zzzz-no-cluster");
    await expect(page.getByText("No clusters match this filter")).toBeVisible();
    await expect(page.getByTestId("fleet-search")).toBeVisible();
    await page.getByRole("button", { name: "Clear Filters" }).click();
    await expect(cards).toHaveCount(3);
  });

  test("switches context and opens the selected cluster overview", async ({
    page,
  }) => {
    await page.locator('[data-testid="cluster-rail-all"]').click();
    await expect(
      page.locator('[data-testid="cluster-catalog-view"]'),
    ).toBeVisible();
    await page
      .locator(
        '[data-testid="catalog-open-cluster"][data-context-name="staging"]',
      )
      .click();

    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toContainText("staging", { timeout: 15000 });
    await expect(
      page.getByRole("tab", { name: "Cluster Overview tab" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("lets the user switch between single and multi-cluster overviews", async ({
    page,
  }) => {
    await page.locator('[data-testid="cluster-rail-all"]').click();
    await openFleetHealth(page);

    await page.getByTestId("overview-view-single").click();
    await expect(
      page.getByRole("tab", { name: "Cluster Overview tab" }),
    ).toHaveAttribute("aria-selected", "true");

    await page.getByTestId("overview-view-fleet").click();
    await expect(
      page.getByRole("tab", { name: "All Clusters tab" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.locator('[data-testid="fleet-overview-view"]'),
    ).toBeVisible();
  });

  test("shows live context health in the cluster rail and opens the fleet view", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; }",
    });
    const rail = page.locator('[data-testid="cluster-rail"]');
    await expect(rail).toBeVisible();
    await expect(
      rail.locator('[data-testid="cluster-rail-context"]'),
    ).toHaveCount(3, { timeout: 15000 });
    await expect(
      rail.locator(
        '[data-testid="cluster-rail-context"][data-context-name="mock-cluster"]',
      ),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      rail.locator(
        '[data-testid="cluster-rail-context"][data-context-name="staging"]',
      ),
    ).toHaveAttribute("data-status", "degraded");

    await rail.locator('[data-testid="cluster-rail-all"]').click();

    await expect(
      page.locator('[data-testid="cluster-catalog-view"]'),
    ).toBeVisible();
    await expect(
      rail.locator('[data-testid="cluster-rail-all"]'),
    ).toHaveAttribute("aria-pressed", "true");

    // The sidebar switches from Resources to the Catalog concept.
    const catalogNav = page.locator('[data-testid="catalog-nav-clusters"]');
    await expect(catalogNav).toBeVisible();
    await expect(catalogNav).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator('[data-testid="catalog-cluster-row"]'),
    ).toHaveCount(3, { timeout: 15000 });
    await page.waitForTimeout(350);

    await page.screenshot({
      path:
        process.env.KUBEVIEW_RAIL_SCREENSHOT ??
        "/tmp/kubeview-cluster-rail.png",
      fullPage: false,
    });

    await openFleetHealth(page);
    await expect(page.getByTestId("fleet-live-indicator")).toBeVisible();
    await expect(
      page.locator('[data-testid="catalog-nav-health"]'),
    ).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(350);
    await page.screenshot({
      path:
        process.env.KUBEVIEW_RAIL_HEALTH_SCREENSHOT ??
        "/tmp/kubeview-cluster-rail-health.png",
      fullPage: false,
    });

    const activeContext = rail.locator(
      '[data-testid="cluster-rail-context"][data-context-name="mock-cluster"]',
    );
    await activeContext.click();
    await expect(
      page.getByRole("tab", { name: "Cluster Overview tab" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(activeContext).toHaveAttribute("aria-pressed", "true");
    await expect(
      rail.locator('[data-testid="cluster-rail-all"]'),
    ).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(350);
    await page.screenshot({
      path:
        process.env.KUBEVIEW_RAIL_OVERVIEW_SCREENSHOT ??
        "/tmp/kubeview-cluster-rail-overview.png",
      fullPage: false,
    });
  });

  test("opens Kubeconfigs as a catalog page instead of a modal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; }",
    });
    await page.locator('[data-testid="cluster-rail-all"]').click();
    await page.locator('[data-testid="catalog-nav-kubeconfigs"]').click();

    await expect(
      page.locator('[data-testid="kubeconfigs-catalog-view"]'),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator('[data-testid="kubeconfig-row"]')).toHaveCount(
      3,
      { timeout: 15000 },
    );
    await expect(
      page.locator('[data-testid="catalog-nav-kubeconfigs"]'),
    ).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(350);
    await page.screenshot({
      path:
        process.env.KUBEVIEW_KUBECONFIGS_SCREENSHOT ??
        "/tmp/kubeview-kubeconfigs.png",
      fullPage: false,
    });
  });

  test("fits the phone viewport without horizontal scrolling", async ({
    page,
  }) => {
    await page.locator('[data-testid="cluster-rail-all"]').click();
    await expect(
      page.locator('[data-testid="cluster-catalog-view"]'),
    ).toBeVisible();
    await openFleetHealth(page);
    await expect(
      page.locator('[data-testid="fleet-cluster-card"]').first(),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(
      page.locator('[data-testid="fleet-overview-view"]'),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
