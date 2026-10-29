import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";

const fetchedAt = "2026-10-27T08:00:00Z";

const contexts = [
  {
    name: "admin@prod-sgp",
    cluster: "prod-sgp",
    server: "https://prod.example:6443",
    user: "admin",
    namespace: "default",
    isCurrent: true,
    provider: "generic",
    authType: "cert",
  },
  {
    name: "staging-sgp",
    cluster: "staging-sgp",
    server: "https://staging.example:6443",
    user: "staging",
    namespace: "default",
    isCurrent: false,
    provider: "gke",
    authType: "exec",
  },
  {
    name: "dev-local",
    cluster: "dev-local",
    server: "https://dev.example:6443",
    user: "dev",
    namespace: "default",
    isCurrent: false,
    provider: "kind",
    authType: "token",
  },
];

function clusterFixture(
  contextName: string,
  status: "healthy" | "degraded" | "offline",
  server: string,
) {
  return {
    contextName,
    cluster: contextName,
    server,
    provider: "generic",
    authType: "cert",
    isCurrent: contextName === "admin@prod-sgp",
    status,
    totalNodes: 2,
    readyNodes: status === "offline" ? 0 : status === "degraded" ? 1 : 2,
    totalPods: 10,
    runningPods: status === "offline" ? 0 : 9,
    pendingPods: 0,
    failedPods: status === "offline" ? 0 : status === "degraded" ? 1 : 0,
    degradedWorkloads: status === "degraded" ? 1 : 0,
    degradedWorkloadsByKind: {
      deployments: status === "degraded" ? 1 : 0,
      replicaSets: 0,
      statefulSets: 0,
      daemonSets: 0,
      jobs: 0,
      cronJobs: 0,
    },
    warningCount: status === "healthy" ? 0 : 2,
    totalCpuCores: 4,
    cpuPercent: 20,
    cpuUsagePercent: 25,
    totalMemoryGiB: 8,
    memoryPercent: 30,
    memoryUsagePercent: 35,
    hasMetrics: status !== "offline",
    fetchedAt,
  };
}

const fleetOverview = {
  clusters: [
    clusterFixture("admin@prod-sgp", "healthy", "https://prod.example:6443"),
    clusterFixture("staging-sgp", "degraded", "https://staging.example:6443"),
    clusterFixture("dev-local", "offline", "https://dev.example:6443"),
  ],
  totals: {
    total: 3,
    healthy: 1,
    degraded: 1,
    offline: 1,
    totalNodes: 6,
    readyNodes: 5,
    totalPods: 30,
    runningPods: 28,
    failedPods: 1,
    degradedWorkloads: 1,
    warningCount: 4,
  },
  fetchedAt,
};

async function bootCatalog(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_splash_seen", "true");
  });
  await mockRpc(page, {
    responses: {
      "clusters.listContexts": {
        currentContext: "admin@prod-sgp",
        configPath: "/tmp/mock-kubeconfig",
        contexts,
      },
      "clusters.fleetOverview": fleetOverview,
    },
  });
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const trigger = page.locator('[data-testid="context-switcher-trigger"]');
  await expect(trigger).toBeVisible({ timeout: 15000 });
  await expect(trigger).toContainText("admin@prod-sgp", {
    timeout: 15000,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  await page.locator('[data-testid="cluster-rail-all"]').click();
  await expect(
    page.locator('[data-testid="cluster-catalog-view"]'),
  ).toBeVisible();
}

test.describe("KubeView catalog features", () => {
  test("sorts the catalog and diagnoses every visible cluster", async ({
    page,
  }) => {
    await bootCatalog(page);

    const rows = page.locator('[data-testid="catalog-cluster-row"]');
    await expect(rows).toHaveCount(3, { timeout: 15000 });
    await expect(rows.first()).toHaveAttribute(
      "data-context-name",
      "admin@prod-sgp",
    );

    await page.getByTestId("catalog-sort-name").click();
    await expect(rows.first()).toHaveAttribute(
      "data-context-name",
      "staging-sgp",
    );
    await page.getByTestId("catalog-sort-name").click();
    await expect(rows.first()).toHaveAttribute(
      "data-context-name",
      "admin@prod-sgp",
    );

    await page.getByTestId("catalog-diagnose-all").click();
    await expect(rows.first()).toContainText("12ms", { timeout: 15000 });
    await page.waitForTimeout(500);

    await page.screenshot({
      path:
        process.env.KUBEVIEW_CATALOG_SCREENSHOT ??
        "/tmp/kubeview-catalog-features.png",
      fullPage: false,
    });
  });

  test("selects rows and runs bulk actions", async ({ page }) => {
    await bootCatalog(page);
    const rows = page.locator('[data-testid="catalog-cluster-row"]');
    await expect(rows).toHaveCount(3, { timeout: 15000 });

    await page.getByTestId("catalog-select-all").check();
    const bulkBar = page.getByTestId("catalog-bulk-bar");
    await expect(bulkBar).toBeVisible();
    await expect(bulkBar).toContainText("3 selected");

    await page.getByTestId("catalog-bulk-remove").click();
    await expect(bulkBar).toContainText(
      "Remove 3 contexts from this kubeconfig?",
    );
    await page.getByTestId("catalog-bulk-remove-cancel").click();
    await expect(bulkBar).toContainText("3 selected");

    await page.getByTestId("catalog-bulk-diagnose").click();
    await expect(rows.first()).toContainText("12ms", { timeout: 15000 });

    await page.getByTestId("catalog-bulk-clear").click();
    await expect(bulkBar).toHaveCount(0);

    await page
      .locator(
        '[data-testid="catalog-select"][data-context-name="staging-sgp"]',
      )
      .check();
    await expect(page.getByTestId("catalog-bulk-bar")).toContainText(
      "1 selected",
    );
    await page.waitForTimeout(300);
    await page.screenshot({
      path:
        process.env.KUBEVIEW_CATALOG_BULK_SCREENSHOT ??
        "/tmp/kubeview-catalog-bulk.png",
      fullPage: false,
    });
  });

  test("opens the drawer, pins a cluster, and labels its environment", async ({
    page,
  }) => {
    await bootCatalog(page);
    const rows = page.locator('[data-testid="catalog-cluster-row"]');
    await expect(rows).toHaveCount(3, { timeout: 15000 });

    await rows.filter({ hasText: "staging-sgp" }).click();
    const drawer = page.getByTestId("catalog-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Live health");

    await page.getByTestId("catalog-drawer-pin").click();
    await expect(page.getByTestId("catalog-drawer-pin")).toContainText("Unpin");

    await page.getByTestId("catalog-env-select").click();
    await page.getByRole("option", { name: "Production" }).click();
    await expect(drawer).toContainText("PROD");
    await page.waitForTimeout(400);

    await page.screenshot({
      path:
        process.env.KUBEVIEW_CATALOG_DRAWER_SCREENSHOT ??
        "/tmp/kubeview-catalog-drawer.png",
      fullPage: false,
    });

    await page.getByTestId("catalog-drawer-close").click();
    await expect(drawer).toHaveCount(0);

    await expect(rows.first()).toHaveAttribute(
      "data-context-name",
      "staging-sgp",
    );
    await expect(
      rows.filter({ hasText: "staging-sgp" }).getByTestId("catalog-env-badge"),
    ).toHaveText("PROD");

    // Pin and environment label survive a reload.
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="cluster-rail-all"]').click();
    await expect(
      page.locator('[data-testid="cluster-catalog-view"]'),
    ).toBeVisible();
    const reloadedRows = page.locator('[data-testid="catalog-cluster-row"]');
    await expect(reloadedRows).toHaveCount(3, { timeout: 15000 });
    await expect(reloadedRows.first()).toHaveAttribute(
      "data-context-name",
      "staging-sgp",
    );
    await expect(
      reloadedRows
        .filter({ hasText: "staging-sgp" })
        .getByTestId("catalog-env-badge"),
    ).toHaveText("PROD");
  });

  test("highlights only the active catalog item", async ({ page }) => {
    await bootCatalog(page);
    const clusters = page.getByTestId("catalog-nav-clusters");
    const learning = page.getByTestId("catalog-nav-learning");

    await expect(clusters).toHaveAttribute("aria-pressed", "true");
    await expect(learning).toHaveAttribute("aria-pressed", "false");

    await learning.click();
    await expect(learning).toHaveAttribute("aria-pressed", "true");
    await expect(clusters).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(350);
    await page.screenshot({
      path:
        process.env.KUBEVIEW_CATALOG_LEARNING_SCREENSHOT ??
        "/tmp/kubeview-catalog-learning.png",
      fullPage: false,
    });

    await clusters.click();
    await expect(clusters).toHaveAttribute("aria-pressed", "true");
    await expect(learning).toHaveAttribute("aria-pressed", "false");
  });

  test("adds, edits, and persists a web link", async ({ page }) => {
    await bootCatalog(page);
    await page.getByTestId("catalog-nav-links").click();
    const view = page.getByTestId("web-links-view");
    await expect(view).toBeVisible();
    await expect(page.getByTestId("web-links-empty")).toBeVisible();

    await page.getByTestId("web-links-add").click();
    await page.getByTestId("web-link-label").fill("Argo CD");
    await page.getByTestId("web-link-url").fill("https://argo.example.com");
    await page.getByTestId("web-link-cluster").click();
    await page.getByRole("option", { name: "staging-sgp" }).click();
    await page.getByTestId("web-link-save").click();

    const linkRow = page.locator(
      '[data-testid="web-link-row"][data-link-label="Argo CD"]',
    );
    await expect(linkRow).toBeVisible();
    await expect(linkRow).toContainText("staging-sgp");

    await page.screenshot({
      path:
        process.env.KUBEVIEW_WEB_LINKS_SCREENSHOT ??
        "/tmp/kubeview-web-links.png",
      fullPage: false,
    });

    await linkRow.getByTestId("web-link-edit").click();
    await page.getByTestId("web-link-label").fill("Argo CD Prod");
    await page.getByTestId("web-link-save").click();
    await expect(
      page.locator(
        '[data-testid="web-link-row"][data-link-label="Argo CD Prod"]',
      ),
    ).toBeVisible();

    // The link survives a reload.
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="cluster-rail-all"]').click();
    await page.getByTestId("catalog-nav-links").click();
    const persisted = page.locator(
      '[data-testid="web-link-row"][data-link-label="Argo CD Prod"]',
    );
    await expect(persisted).toBeVisible();

    await persisted.getByTestId("web-link-delete").click();
    await page.getByTestId("web-link-delete-confirm").click();
    await expect(page.getByTestId("web-links-empty")).toBeVisible();
  });
});
