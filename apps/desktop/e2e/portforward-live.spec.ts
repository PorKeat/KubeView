import { test, expect, type Page } from "@playwright/test";
import { expandSidebarGroups } from "./nav";
import net from "node:net";

interface PortForwardItem {
  id: string;
  status: string;
  targetName: string;
  localPort: number;
}

async function listSessions(page: Page): Promise<PortForwardItem[]> {
  const response = await page.request.post("/api/rpc", {
    data: { method: "portforwards.list", params: {} },
  });
  const payload = await response.json();
  return payload.result?.items ?? [];
}

test.describe("KubeView live port forwarding", () => {
  test.describe.configure({ timeout: 60_000 });

  test("starts and stops a real service tunnel", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_skip_boot_splash", "true");
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1200);
    const text = (await trigger.textContent()) ?? "";
    test.skip(
      /no cluster|offline|connect|import kubeconfig|select cluster|checking/i.test(
        text,
      ),
      "No live cluster is connected; live port-forward test skipped.",
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

    const servicesResponse = await page.request.post("/api/rpc", {
      data: {
        method: "services.list",
        params: { namespace: "argocd" },
      },
    });
    const servicesPayload = await servicesResponse.json();
    const service = (servicesPayload.result?.items ?? []).find(
      (item: { name?: string; readyEndpoints?: number }) =>
        item.name === "argo-argocd-server" && (item.readyEndpoints ?? 0) > 0,
    );
    test.skip(
      !service,
      "The argo-argocd-server live test service is not available.",
    );

    let sessionId: string | null = null;
    const beforeActiveIds = new Set(
      (await listSessions(page))
        .filter((item) => item.status === "active")
        .map((item) => item.id),
    );
    try {
      await expandSidebarGroups(page);
      await page.locator('[data-testid="nav-item-portforwards"]').click();
      await expect(
        page.getByRole("heading", { name: "Port Forwarding Manager" }),
      ).toBeVisible();

      await page.locator('[data-testid="port-forward-namespace"]').click();
      await page
        .locator('[data-testid="port-forward-namespace-option-argocd"]')
        .click();
      await expect(
        page.locator('[data-testid="port-forward-target"]'),
      ).toBeEnabled({ timeout: 15000 });
      await page.locator('[data-testid="port-forward-target"]').click();
      await page
        .locator(
          '[data-testid="port-forward-target-option-argo-argocd-server"]',
        )
        .click();
      await expect(
        page.locator('[data-testid="port-forward-remote-port"]'),
      ).toHaveValue("80");
      await page.locator('[data-testid="port-forward-start"]').click();

      const row = page
        .locator('[data-testid="portforwards-row"]')
        .filter({ hasText: "argo-argocd-server" })
        .filter({ hasText: "active" })
        .first();
      await expect(row).toBeVisible({ timeout: 15000 });

      let session: PortForwardItem | undefined;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const sessions = await listSessions(page);
        session = sessions.find(
          (item) =>
            item.status === "active" &&
            item.targetName === "argo-argocd-server" &&
            !beforeActiveIds.has(item.id),
        );
        if (session) break;
        await page.waitForTimeout(250);
      }
      expect(session).toBeTruthy();
      sessionId = session?.id ?? null;

      const localPort = session?.localPort as number;
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({
          host: "127.0.0.1",
          port: localPort,
        });
        const timer = setTimeout(() => {
          socket.destroy();
          reject(new Error("TCP connection timed out"));
        }, 5000);
        socket.once("connect", () => {
          clearTimeout(timer);
          socket.end();
          resolve();
        });
        socket.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });

      await page
        .getByRole("button", { name: `Stop port forward ${sessionId}` })
        .click();
      await expect
        .poll(
          async () =>
            (await listSessions(page)).find((item) => item.id === sessionId)
              ?.status,
          { timeout: 10000 },
        )
        .toBe("stopped");
    } finally {
      const sessions = await listSessions(page).catch(() => []);
      for (const item of sessions) {
        if (item.status === "active" && !beforeActiveIds.has(item.id)) {
          await page.request.post("/api/rpc", {
            data: {
              method: "portforwards.stop",
              params: { id: item.id },
            },
          });
        }
      }
    }
  });
});
