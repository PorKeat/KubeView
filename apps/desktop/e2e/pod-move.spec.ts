import { test, expect, type Page } from "@playwright/test";
import { mockRpc, type MockRpcOptions } from "./mockRpc";
import { overview, pod } from "./mock/fixtures";

async function boot(page: Page, options: MockRpcOptions = {}) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_skip_boot_splash", "true");
  });
  await mockRpc(page, options);
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const trigger = page.locator('[data-testid="context-switcher-trigger"]');
  await expect(trigger).toBeVisible({ timeout: 15000 });
  await expect(trigger).toContainText("mock-cluster", { timeout: 15000 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId("nav-item-pods").click();
  await expect(page.locator("table tbody tr").first()).toBeVisible({
    timeout: 15000,
  });
}

async function openMoveModal(page: Page) {
  await page.locator("table tbody tr").first().click();
  await expect(page.getByTestId("resource-inspector-drawer")).toBeVisible();
  await page.getByTestId("inspector-move-pod").click();
  const modal = page.getByTestId("move-pod-modal");
  await expect(modal).toBeVisible();
  return modal;
}

test.describe("KubeView pod relocation", () => {
  test("moves a standalone pod to another namespace", async ({ page }) => {
    await boot(page);
    const modal = await openMoveModal(page);

    await modal.getByTestId("move-pod-namespace-tab").click();
    await modal.getByTestId("move-pod-namespace-select").click();
    await modal.getByTestId("move-pod-namespace-option-default").click();

    const moveRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/api/rpc")) return false;
      try {
        const body = request.postDataJSON() as {
          method?: string;
          params?: { targetNamespace?: string };
        };
        return (
          body.method === "pods.move" &&
          body.params?.targetNamespace === "default"
        );
      } catch {
        return false;
      }
    });

    await modal.getByTestId("move-pod-submit").click();
    const request = await moveRequest;
    const payload = request.postDataJSON() as {
      method: string;
      params: {
        podName: string;
        targetNamespace?: string;
        targetNode?: string;
      };
    };
    expect(payload.method).toBe("pods.move");
    expect(payload.params.podName).toBe("web-1");
    expect(payload.params.targetNamespace).toBe("default");
    expect(payload.params.targetNode).toBeUndefined();

    await expect(modal).toHaveCount(0);
    await expect(
      page.getByText("Pod web-1 moved to namespace default"),
    ).toBeVisible();
  });

  test("pins a standalone pod to a specific node", async ({ page }) => {
    const secondNode = {
      ...overview.nodes[0],
      name: "worker-2",
      internalIP: "10.0.0.11",
      podCIDR: "10.244.2.0/24",
      podCIDRs: ["10.244.2.0/24"],
    };
    await boot(page, {
      responses: {
        "clusters.overview": {
          ...overview,
          nodes: [overview.nodes[0], secondNode],
        },
      },
    });
    const modal = await openMoveModal(page);

    await modal.getByTestId("move-pod-node-specific").click();
    await modal.getByTestId("move-pod-node-select").click();
    await modal.getByTestId("move-pod-node-option-worker-2").click();

    const moveRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/api/rpc")) return false;
      try {
        const body = request.postDataJSON() as {
          method?: string;
          params?: { targetNode?: string };
        };
        return (
          body.method === "pods.move" && body.params?.targetNode === "worker-2"
        );
      } catch {
        return false;
      }
    });

    await modal.getByTestId("move-pod-submit").click();
    const request = await moveRequest;
    const payload = request.postDataJSON() as {
      params: { targetNamespace?: string; targetNode?: string };
    };
    expect(payload.params.targetNode).toBe("worker-2");
    expect(payload.params.targetNamespace).toBeUndefined();

    await expect(modal).toHaveCount(0);
    await expect(
      page.getByText("Pod web-1 recreated on node worker-2"),
    ).toBeVisible();
  });

  test("reschedules a managed pod and blocks node pinning and namespace moves", async ({
    page,
  }) => {
    await boot(page, {
      responses: {
        "pods.list": {
          items: [{ ...pod, controlledBy: "ReplicaSet/web-7f9c" }],
          totalCount: 1,
        },
      },
    });
    const modal = await openMoveModal(page);

    await expect(modal.getByTestId("move-pod-namespace-tab")).toBeDisabled();
    await expect(modal.getByTestId("move-pod-node-specific")).toBeDisabled();
    await expect(modal).toContainText("Managed by");
    await expect(modal).toContainText("ReplicaSet/web-7f9c");

    const moveRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/api/rpc")) return false;
      try {
        const body = request.postDataJSON() as { method?: string };
        return body.method === "pods.move";
      } catch {
        return false;
      }
    });

    await modal.getByTestId("move-pod-submit").click();
    const request = await moveRequest;
    const payload = request.postDataJSON() as {
      params: { targetNamespace?: string; targetNode?: string };
    };
    expect(payload.params.targetNamespace).toBeUndefined();
    expect(payload.params.targetNode).toBeUndefined();

    await expect(modal).toHaveCount(0);
    await expect(
      page.getByText("web-1 deleted; ReplicaSet/web-7f9c is recreating it"),
    ).toBeVisible();
  });
});
