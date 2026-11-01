import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";
import { jobSummary } from "./mock/fixtures/jobs";

const deployment = {
  name: "web",
  namespace: "default",
  status: "Healthy",
  ready: "2/2",
  desiredReplicas: 2,
  readyReplicas: 2,
  updatedReplicas: 2,
  availableReplicas: 2,
  unavailableReplicas: 0,
  age: "5m",
  creationTimestamp: "2026-10-27T08:00:00Z",
  images: ["nginx:1.27-alpine"],
  selector: { app: "web" },
  strategy: "RollingUpdate",
  revision: "3",
  paused: false,
  generation: 3,
  observedGeneration: 3,
  conditions: [],
  labels: { app: "web" },
  annotations: {},
};

const nodeInfo = {
  name: "worker-1",
  status: "Ready",
  roles: ["worker"],
  version: "v1.32.0",
  internalIP: "10.0.0.10",
  unschedulable: false,
  taints: [],
  labels: { "kubernetes.io/hostname": "worker-1" },
  age: "5d",
  createdAt: "2026-10-22T08:00:00Z",
};

async function boot(page: Page, responses: Record<string, unknown> = {}) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_skip_boot_splash", "true");
  });
  await mockRpc(page, { responses });
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId("context-switcher-trigger")).toContainText(
    "mock-cluster",
    { timeout: 15000 },
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
}

test.describe("KubeView full control surfaces", () => {
  test("creates a simple resource and bulk deletes rows", async ({ page }) => {
    await boot(page);
    await page.getByTestId("nav-item-leases").click();
    const view = page.getByTestId("simple-resource-view-leases");
    await expect(
      view.locator('[data-testid="simple-resource-row"]'),
    ).toHaveCount(1);

    await view.getByTestId("simple-resource-create-leases").click();
    const editor = page.getByTestId("resource-editor-modal");
    await expect(editor).toBeVisible();
    await expect(editor.getByText("Create Lease")).toBeVisible();
    await expect(editor.getByTestId("create-resource-tab-form")).toBeVisible();
    await editor.getByTestId("create-resource-name").fill("my-lease");
    await editor
      .getByTestId("create-resource-field-holderIdentity")
      .fill("lease-holder");
    await editor.getByTestId("create-resource-tab-yaml").click();
    await expect(editor.getByTestId("resource-editor-textarea")).toContainText(
      "kind: Lease",
    );
    await expect(editor.getByTestId("resource-editor-textarea")).toContainText(
      "holderIdentity: lease-holder",
    );
    await editor.getByTestId("create-resource-tab-form").click();
    await expect(
      editor.getByTestId("create-resource-field-holderIdentity"),
    ).toHaveValue("lease-holder");
    await editor.getByTestId("create-resource-tab-yaml").click();
    await editor.getByTestId("resource-editor-apply").click();
    await expect(editor).toHaveCount(0);

    await view.locator('tbody input[type="checkbox"]').first().check();
    await expect(view.getByTestId("simple-resource-bulk-bar")).toBeVisible();
    await view.getByTestId("simple-resource-bulk-delete").click();
    await view.getByTestId("simple-resource-bulk-delete-confirm").click();
    await expect(view.getByTestId("simple-resource-bulk-bar")).toHaveCount(0);
  });

  test("builds a workload from form fields with a generated YAML preview", async ({
    page,
  }) => {
    await boot(page);
    await page.getByTestId("nav-item-deployments").click();
    await page.getByTestId("deployments-create").click();
    const editor = page.getByTestId("resource-editor-modal");
    await expect(editor.getByTestId("create-resource-tab-form")).toBeVisible();

    await editor.getByTestId("create-resource-name").fill("web-form");
    await editor.getByTestId("create-resource-field-replicas").fill("2");
    await editor
      .getByTestId("create-resource-field-image")
      .fill("nginx:1.26-alpine");
    await editor.getByTestId("create-resource-tab-yaml").click();
    const yaml = editor.getByTestId("resource-editor-textarea");
    await expect(yaml).toContainText("kind: Deployment");
    await expect(yaml).toContainText("replicas: 2");
    await expect(yaml).toContainText("image: nginx:1.26-alpine");
    await expect(yaml).toContainText("namespace: default");
    await expect(yaml).toContainText("containers:");

    await editor.getByTestId("create-resource-tab-form").click();
    await expect(
      editor.getByTestId("create-resource-field-replicas"),
    ).toHaveValue("2");
    await editor.getByTestId("create-resource-tab-yaml").click();
    await editor.getByTestId("resource-editor-apply").click();
    await expect(editor).toHaveCount(0);
  });

  test("confirms before discarding YAML-only create edits", async ({
    page,
  }) => {
    await boot(page);
    await page.getByTestId("nav-item-deployments").click();
    await page.getByTestId("deployments-create").click();
    const editor = page.getByTestId("resource-editor-modal");
    await editor.getByTestId("create-resource-tab-yaml").click();
    const yaml = editor.getByTestId("resource-editor-textarea");
    await yaml.click();
    await page.keyboard.insertText("# user edit\n");

    await editor.getByTestId("create-resource-tab-form").click();
    await expect(
      editor.getByTestId("create-resource-discard-yaml"),
    ).toBeVisible();
    await editor.getByText("Keep editing").click();
    await expect(
      editor.getByTestId("create-resource-discard-yaml"),
    ).toHaveCount(0);
    await expect(yaml).toBeVisible();

    await editor.getByTestId("create-resource-tab-form").click();
    await editor.getByTestId("create-resource-discard-yaml").click();
    await expect(editor.getByTestId("create-resource-name")).toBeVisible();
    await page.getByRole("button", { name: "Close YAML editor" }).click();
  });

  test("creates a namespace with a form or the full manifest", async ({
    page,
  }) => {
    await boot(page);
    await page.getByTestId("nav-item-namespaces").click();
    await page.getByTestId("namespaces-create").click();
    const modal = page.getByTestId("create-namespace-modal");
    await expect(modal.getByTestId("create-namespace-tab-form")).toBeVisible();
    await modal.getByTestId("create-namespace-name").fill("team-alpha");
    await modal.getByTestId("create-namespace-tab-yaml").click();
    await expect(modal.getByTestId("create-namespace-yaml")).toContainText(
      "kind: Namespace",
    );
    await expect(modal.getByTestId("create-namespace-yaml")).toContainText(
      "name: team-alpha",
    );
    await modal.getByTestId("create-namespace-tab-form").click();
    await expect(modal.getByTestId("create-namespace-name")).toHaveValue(
      "team-alpha",
    );
    await modal.getByTestId("create-namespace-cancel").click();
  });

  test("matches workload row height on Events and Namespaces", async ({
    page,
  }) => {
    await boot(page);

    await page.getByTestId("nav-item-pods").click();
    const podRow = page.locator("table tbody tr").first();
    await expect(podRow).toBeVisible();
    const podHeight = (await podRow.boundingBox())?.height ?? 0;

    for (const [nav, view] of [
      ["namespaces", "namespaces"],
      ["events", "events"],
    ] as const) {
      await page.getByTestId(`nav-item-${nav}`).click();
      const row = page
        .getByTestId(`simple-resource-view-${view}`)
        .locator('[data-testid="simple-resource-row"]')
        .first();
      await expect(row).toBeVisible();
      await expect
        .poll(async () => (await row.boundingBox())?.height ?? 0)
        .toBeGreaterThan(20);
      const height = (await row.boundingBox())?.height ?? 0;
      expect(Math.abs(height - podHeight)).toBeLessThanOrEqual(1);
    }
  });

  test("opens field editors from the RBAC and Gateway pickers", async ({
    page,
  }) => {
    await boot(page);

    await page.getByTestId("nav-item-rbac").click();
    await page.getByTestId("rbac-create").click();
    await page.getByTestId("rbac-create-Role").click();
    const editor = page.getByTestId("resource-editor-modal");
    await expect(editor.getByText("Create Role")).toBeVisible();
    await expect(editor.getByTestId("create-resource-tab-form")).toBeVisible();
    await expect(editor.getByTestId("create-resource-field-verbs")).toHaveValue(
      "get, list, watch",
    );
    await page.getByRole("button", { name: "Close YAML editor" }).click();

    await page.getByTestId("nav-item-ingresses").click();
    await page.getByTestId("gateways-view-tab").click();
    await page.getByTestId("gateways-create").click();
    await page.getByTestId("gateway-create-Gateway").click();
    await expect(editor.getByText("Create Gateway")).toBeVisible();
    await expect(editor.getByTestId("create-resource-tab-form")).toBeVisible();
    await expect(
      editor.getByTestId("create-resource-field-listenerName"),
    ).toHaveValue("http");
    await page.getByRole("button", { name: "Close YAML editor" }).click();
  });

  test("edits and deletes read-only simple resource kinds", async ({
    page,
  }) => {
    await boot(page);
    await page.getByTestId("nav-item-verticalpodautoscalers").click();
    const view = page.getByTestId(
      "simple-resource-view-verticalpodautoscalers",
    );
    await view.locator('[data-testid="simple-resource-row"]').first().click();
    await expect(view.getByTestId("simple-resource-edit")).toBeVisible();
    await expect(view.getByTestId("simple-resource-delete")).toBeVisible();
    await view.getByTestId("simple-resource-edit").click();
    await expect(page.getByTestId("resource-editor-modal")).toBeVisible();
    await expect(
      page
        .getByTestId("resource-editor-modal")
        .getByText("Edit VerticalPodAutoscaler"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close YAML editor" }).click();
  });

  test("drives Helm upgrade, rollback, and uninstall from the release drawer", async ({
    page,
  }) => {
    await boot(page, {
      "helm.values": { values: "replicaCount: 2\n" },
      "helm.history": {
        items: [
          {
            revision: 3,
            status: "deployed",
            chart: "web",
            chartVersion: "1.4.2",
            appVersion: "2.1.0",
            description: "Upgrade complete",
            updated: "2026-10-27T08:00:00Z",
          },
          {
            revision: 2,
            status: "superseded",
            chart: "web",
            chartVersion: "1.4.0",
            appVersion: "2.0.0",
            description: "Initial install",
            updated: "2026-10-26T08:00:00Z",
          },
        ],
        totalCount: 2,
      },
      "helm.upgrade": {
        name: "web",
        namespace: "default",
        chart: "web",
        chartVersion: "1.5.0",
        revision: 4,
        status: "deployed",
      },
      "helm.rollback": {
        name: "web",
        namespace: "default",
        chart: "web",
        chartVersion: "1.4.0",
        revision: 4,
        status: "deployed",
      },
      "helm.uninstall": { success: true },
    });

    await page.getByTestId("nav-item-helmreleases").click();
    const view = page.getByTestId("simple-resource-view-helmreleases");
    await view.locator('[data-testid="simple-resource-row"]').first().click();
    await expect(view.getByTestId("helm-release-upgrade")).toBeVisible();
    await expect(view.getByTestId("helm-release-rollback")).toBeVisible();
    await expect(view.getByTestId("helm-release-uninstall")).toBeVisible();

    await view.getByTestId("helm-release-upgrade").click();
    const upgrade = page.getByTestId("helm-upgrade-modal");
    await expect(upgrade).toBeVisible();
    await expect(upgrade.getByTestId("helm-chart-name")).toHaveValue("web");
    await expect(upgrade.getByTestId("helm-values")).toHaveValue(
      /replicaCount: 2/,
    );
    await upgrade
      .getByTestId("helm-repository-url")
      .fill("https://charts.example.com");
    await upgrade.getByTestId("helm-upgrade-submit").click();
    await expect(upgrade).toHaveCount(0);

    const row = view.locator('[data-testid="simple-resource-row"]').first();
    await row.click();
    await view.getByTestId("helm-release-upgrade").click();
    await expect(
      page.getByTestId("helm-upgrade-modal").getByTestId("helm-repository-url"),
    ).toHaveValue("https://charts.example.com");
    await page.getByRole("button", { name: "Close Upgrade release" }).click();
    await expect(page.getByTestId("helm-upgrade-modal")).toHaveCount(0);

    await view.getByTestId("helm-release-rollback").click();
    const rollback = page.getByTestId("helm-rollback-modal");
    await expect(rollback).toBeVisible();
    await expect(rollback.getByText("Revision 3")).toBeVisible();
    await rollback.getByTestId("helm-rollback-2").click();
    await expect(rollback).toHaveCount(0);

    await row.click();
    await view.getByTestId("helm-release-uninstall").click();
    const uninstall = page.getByTestId("helm-uninstall-modal");
    await expect(uninstall).toBeVisible();
    await uninstall.getByTestId("helm-uninstall-confirm-name").fill("web");
    await uninstall.getByTestId("helm-uninstall-submit").click();
    await expect(uninstall).toHaveCount(0);
  });

  test("cordinates, drains, taints, and labels a node", async ({ page }) => {
    await boot(page, {
      "nodes.get": nodeInfo,
      "nodes.cordon": { ...nodeInfo, unschedulable: true },
      "nodes.drain": {
        nodeName: "worker-1",
        evicted: ["default/web-1"],
        skipped: ["kube-system/node-agent (daemonset)"],
        failed: [],
      },
      "nodes.taint": {
        ...nodeInfo,
        taints: [{ key: "dedicated", effect: "NoSchedule" }],
      },
      "nodes.label": {
        ...nodeInfo,
        labels: { ...nodeInfo.labels, team: "platform" },
      },
    });

    await page.getByTestId("node-operations-worker-1").click();
    const modal = page.getByTestId("node-operations-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("worker-1")).toBeVisible();

    await modal.getByTestId("node-cordon-toggle").click();
    await expect(modal.getByText("Uncordon")).toBeVisible();

    await modal.getByTestId("node-drain").click();
    await expect(modal.getByTestId("node-drain-result")).toContainText(
      "Evicted: 1",
    );

    await modal.getByRole("button", { name: "Taints", exact: true }).click();
    await modal.getByRole("button", { name: "Add taint", exact: true }).click();
    await modal.locator('input[aria-label="Taint 1 key"]').fill("dedicated");
    await modal.getByTestId("node-taints-save").click();

    await modal.getByRole("button", { name: "Labels", exact: true }).click();
    await modal.getByRole("button", { name: "Add label", exact: true }).click();
    const labelRows = modal.locator('input[aria-label$=" key"]');
    const labelCount = await labelRows.count();
    await labelRows.nth(labelCount - 1).fill("team");
    await modal
      .locator('input[aria-label$=" value"]')
      .nth(labelCount - 1)
      .fill("platform");
    await modal.getByTestId("node-labels-save").click();
  });

  test("shows rollout history and rolls a Deployment back", async ({
    page,
  }) => {
    await boot(page, {
      "deployments.list": { items: [deployment], totalCount: 1 },
      "deployments.rolloutHistory": {
        items: [
          {
            revision: 2,
            replicaSetName: "web-old",
            images: ["nginx:1.26-alpine"],
            desired: 2,
            ready: 2,
            createdAt: "2026-10-26T08:00:00Z",
            changeCause: "Previous image",
            current: false,
          },
          {
            revision: 3,
            replicaSetName: "web-new",
            images: ["nginx:1.27-alpine"],
            desired: 2,
            ready: 2,
            createdAt: "2026-10-27T08:00:00Z",
            changeCause: "Current image",
            current: true,
          },
        ],
        totalCount: 2,
      },
      "deployments.rollback": { success: true, name: "web", revision: 2 },
    });

    await page.getByTestId("nav-item-deployments").click();
    await page.getByRole("button", { name: "Actions for web" }).click();
    await page.getByText("Rollout History").click();
    const modal = page.getByTestId("deployment-rollout-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Revision 3")).toBeVisible();
    await expect(modal.getByTestId("deployment-rollback-3")).toBeDisabled();
    await modal.getByTestId("deployment-rollback-2").click();
    await expect(modal).toHaveCount(0);
  });

  test("retries and clones a Job", async ({ page }) => {
    await boot(page, {
      "jobs.clone": { ...jobSummary, name: "web-backfill-clone" },
      "jobs.retry": { ...jobSummary, name: "web-backfill-retry-abcde" },
    });

    await page.getByTestId("nav-item-jobs").click();
    await page
      .getByRole("button", { name: "Actions for web-backfill" })
      .click();
    await page.getByText("Clone Job").click();
    const modal = page.getByTestId("job-clone-modal");
    await expect(modal).toBeVisible();
    await modal.getByTestId("job-clone-name").fill("web-backfill-clone");
    await modal.getByTestId("job-clone-submit").click();
    await expect(modal).toHaveCount(0);

    await page
      .getByRole("button", { name: "Actions for web-backfill" })
      .click();
    await page.getByText("Retry Job").click();
  });
});
