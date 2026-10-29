import { test, expect, type Page } from "@playwright/test";

const AUDIT_DIR =
  process.env.KUBEVIEW_LIVE_PAGES_DIR ?? "/tmp/kubeview-live-pages";

interface LivePage {
  id: string;
  title: string;
}

interface OverflowReport {
  contentWidth: number;
  clientWidth: number;
  overflow: number;
}

const pages: LivePage[] = [
  { id: "overview", title: "Cluster Overview" },
  { id: "fleet", title: "All Clusters" },
  { id: "gitops", title: "GitOps Drift" },
  { id: "pods", title: "Pods" },
  { id: "deployments", title: "Deployments" },
  { id: "replicasets", title: "ReplicaSets" },
  { id: "statefulsets", title: "StatefulSets" },
  { id: "daemonsets", title: "DaemonSets" },
  { id: "jobs", title: "Jobs & CronJobs" },
  { id: "services", title: "Services" },
  { id: "endpoints", title: "Endpoints" },
  { id: "ingresses", title: "Ingresses & Gateways" },
  { id: "networkpolicies", title: "Network Policies" },
  { id: "portforwards", title: "Port Forwards" },
  { id: "cilium", title: "Network Observability" },
  { id: "configmaps", title: "ConfigMaps" },
  { id: "secrets", title: "Secrets" },
  { id: "persistentvolumes", title: "Persistent Volumes" },
  { id: "storageclasses", title: "Storage Classes" },
  { id: "serviceaccounts", title: "Service Accounts" },
  { id: "rbac", title: "Roles & Bindings" },
  { id: "permissions", title: "Permissions Checker" },
  { id: "crds", title: "Custom Resources" },
];

const issuesByPage = new WeakMap<Page, string[]>();

async function expectNoBoundary(page: Page) {
  await expect(page.getByText("Application Exception Encountered")).toHaveCount(
    0,
  );
}

async function assertNoTableOverflow(page: Page, label: string) {
  const reports = await page.locator("main table").evaluateAll((tables) =>
    tables
      .map((table) => {
        let node: HTMLElement | null = table.parentElement;
        while (node && node !== document.body) {
          const style = window.getComputedStyle(node);
          if (style.overflowX === "auto" || style.overflowX === "scroll") {
            break;
          }
          node = node.parentElement;
        }
        if (!node || node === document.body) return null;
        return {
          contentWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          overflow: node.scrollWidth - node.clientWidth,
        };
      })
      .filter((report): report is OverflowReport => Boolean(report))
      .filter((report) => report.overflow > 1),
  );
  expect(reports, `${label} horizontal table overflow`).toEqual([]);
}

async function exerciseSearch(page: Page, label: string) {
  const search = page.locator('main input[placeholder^="Filter"]').first();
  if (!(await search.isVisible().catch(() => false))) return;

  const rows = page.locator("main table tbody tr");
  const initial = await rows.count();
  if (initial === 0) return;

  await search.fill("zzzz-no-such-resource");
  await page.waitForTimeout(450);
  await expectNoBoundary(page);
  const filtered = await rows.count();
  console.log(`[live-pages:${label}] search rows ${initial} -> ${filtered}`);
  await search.fill("");
  await page.waitForTimeout(350);
}

async function exerciseInspector(page: Page, label: string) {
  const rows = page.locator("main table tbody tr");
  if ((await rows.count()) === 0) return;

  await rows.first().click();
  const drawer = page.locator('[data-testid="resource-inspector-drawer"]');
  await expect(drawer).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${AUDIT_DIR}/${label}-inspector.png` });

  const tabs = page.locator('[data-testid^="inspector-tab-"]');
  const tabCount = await tabs.count();
  for (let index = 0; index < tabCount; index += 1) {
    const tab = tabs.nth(index);
    if (!(await tab.isVisible())) continue;
    await tab.click();
    await page.waitForTimeout(300);
    await expectNoBoundary(page);
  }

  const close = page.locator('[data-testid="inspector-close-btn"]');
  if (await close.isVisible()) {
    await close.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await expect(drawer).toHaveCount(0, { timeout: 3000 });
}

test.describe("KubeView live sidebar audit", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
    });

    const issues: string[] = [];
    issuesByPage.set(page, issues);
    page.on("pageerror", (error) => {
      issues.push(`pageerror: ${error.message}`);
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        issues.push(`console: ${message.text()}`);
      }
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const text = (await trigger.textContent()) ?? "";
    test.skip(
      /no cluster|offline|connect|import kubeconfig|select cluster|checking/i.test(
        text,
      ),
      "No live cluster is connected; live sidebar audit skipped.",
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
    await page.waitForTimeout(500);
  });

  for (const item of pages) {
    test(`audits ${item.title}`, async ({ page }) => {
      const navItem = page.locator(`[data-testid="nav-item-${item.id}"]`);
      if (await navItem.isDisabled()) {
        test.skip(true, `${item.title} is marked Soon in the sidebar.`);
        return;
      }
      await navItem.click();
      await expect(
        page.getByRole("tab", { name: `${item.title} tab` }),
      ).toHaveAttribute("aria-selected", "true");
      if (item.id === "cilium") {
        await expect(
          page.locator('[data-testid="network-observability-view"]'),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="cni-provider-name"]'),
        ).toBeVisible({ timeout: 15000 });
      }
      await page.waitForTimeout(1600);
      await expectNoBoundary(page);
      await page.screenshot({ path: `${AUDIT_DIR}/${item.id}.png` });
      await assertNoTableOverflow(page, item.id);
      await exerciseSearch(page, item.id);

      if (item.id === "overview") {
        await page.waitForTimeout(200);
      } else if (item.id === "fleet") {
        await expect(
          page.locator('[data-testid="fleet-overview-view"]'),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="fleet-cluster-card"]').first(),
        ).toBeVisible({ timeout: 15000 });
        await expect(page.getByText("Component Render Error")).toHaveCount(0);
      } else if (item.id === "portforwards") {
        await expect(
          page.getByRole("heading", { name: "Port Forwarding Manager" }),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="port-forward-target"]'),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="port-forward-start"]'),
        ).toBeDisabled();
      } else if (item.id === "cilium") {
        const endpointTab = page.locator(
          '[data-testid="cilium-tab-endpoints"]',
        );
        if ((await endpointTab.count()) > 0) {
          await endpointTab.click();
          await page.waitForTimeout(700);
          await page.screenshot({ path: `${AUDIT_DIR}/cilium-endpoints.png` });
          await expectNoBoundary(page);

          await page.locator('[data-testid="cilium-tab-flows"]').click();
          await page.waitForTimeout(500);
          const loadFlows = page.locator('[data-testid="hubble-load-flows"]');
          if (await loadFlows.isEnabled()) {
            await loadFlows.click();
            await page.waitForTimeout(1600);
          }
          await page.screenshot({ path: `${AUDIT_DIR}/cilium-flows.png` });
          await expectNoBoundary(page);
        }
      } else if (item.id === "permissions") {
        await expect(
          page.locator('[data-testid="permissions-view"]'),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="permission-effective"]'),
        ).toBeVisible({ timeout: 15000 });
      } else if (item.id === "gitops") {
        await expect(page.locator('[data-testid="gitops-view"]')).toBeVisible();
        await expect(
          page.locator('[data-testid="gitops-choose-folder"]'),
        ).toBeVisible();
        await page.locator('[data-testid="gitops-manual-toggle"]').click();
        await expect(
          page.locator('[data-testid="gitops-source-path"]'),
        ).toBeVisible();
      } else {
        await exerciseInspector(page, item.id);

        if (item.id === "jobs") {
          await page.locator('[data-testid="cronjobs-view-tab"]').click();
          await page.waitForTimeout(900);
          await page.screenshot({
            path: `${AUDIT_DIR}/jobs-cronjobs.png`,
          });
          await assertNoTableOverflow(page, "jobs-cronjobs");
          await exerciseSearch(page, "jobs-cronjobs");
          await exerciseInspector(page, "jobs-cronjobs");
        }

        if (item.id === "ingresses") {
          await page.locator('[data-testid="gateways-view-tab"]').click();
          await page.waitForTimeout(900);
          await page.screenshot({
            path: `${AUDIT_DIR}/ingresses-gateways.png`,
          });
          await assertNoTableOverflow(page, "ingresses-gateways");
          await exerciseSearch(page, "ingresses-gateways");
          await exerciseInspector(page, "ingresses-gateways");
        }
      }

      const issues = issuesByPage.get(page) ?? [];
      if (issues.length > 0) {
        console.log(
          `[live-pages:${item.id}] runtime issues`,
          issues.slice(0, 12),
        );
      }
      expect(
        issues.filter((issue) => issue.startsWith("pageerror:")),
        `uncaught errors on ${item.title}`,
      ).toEqual([]);
    });
  }
});
