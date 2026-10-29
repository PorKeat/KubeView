import { test, expect, type Page } from "@playwright/test";
import { expandSidebarGroups } from "./nav";

const AUDIT_DIR = process.env.KUBEVIEW_AUDIT_DIR ?? "/tmp/kubeview-live-audit";

async function expectNoTableOverflow(page: Page) {
  const scrollers = page.locator('[data-testid$="-table-scroll"]');
  const count = await scrollers.count();
  for (let index = 0; index < count; index += 1) {
    const scroller = scrollers.nth(index);
    if (!(await scroller.isVisible())) continue;
    const overflows = await scroller.evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    expect(overflows).toBeFalsy();
  }
}

const pages = [
  { id: "services", title: "Services" },
  { id: "endpoints", title: "Endpoints" },
  { id: "ingresses", title: "Ingresses & Gateways" },
  { id: "networkpolicies", title: "Network Policies" },
  { id: "portforwards", title: "Port Forwards" },
  { id: "cilium", title: "Network Observability" },
];

test.describe("KubeView live networking audit", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_skip_boot_splash", "true");
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
      "No live cluster is connected; live audit skipped.",
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
    await expandSidebarGroups(page);

    for (const id of [
      "services",
      "endpoints",
      "ingresses",
      "networkpolicies",
    ]) {
      await expect(
        page.locator(`[data-testid="nav-item-${id}"]`),
      ).toContainText(/\d+/, { timeout: 20000 });
    }
    await expect(page.locator('[data-testid="nav-item-cilium"]')).toBeVisible();
  });

  for (const item of pages) {
    test(`audits ${item.title}`, async ({ page }) => {
      await page.locator(`[data-testid="nav-item-${item.id}"]`).click();
      await page.waitForTimeout(1800);
      await expect(page.locator("main")).toBeVisible();
      await expect(
        page.locator("text=Application Exception Encountered"),
      ).toHaveCount(0);
      await page.screenshot({
        path: `${AUDIT_DIR}/${item.id}.png`,
      });
      await expectNoTableOverflow(page);

      if (!["portforwards", "cilium"].includes(item.id)) {
        const rows = page.locator('[data-testid$="-row"]');
        if ((await rows.count()) > 0) {
          await rows.first().click();
          await page.waitForTimeout(900);
          await page.screenshot({
            path: `${AUDIT_DIR}/${item.id}-inspector.png`,
          });
          await page.keyboard.press("Escape");
        }
      }

      if (item.id === "ingresses") {
        await page.locator('[data-testid="gateways-view-tab"]').click();
        await page.waitForTimeout(900);
        await page.screenshot({
          path: `${AUDIT_DIR}/ingresses-gateways.png`,
        });
        await expectNoTableOverflow(page);
      }

      if (item.id === "cilium") {
        await page.locator('[data-testid="cilium-tab-endpoints"]').click();
        await page.waitForTimeout(700);
        await page.screenshot({
          path: `${AUDIT_DIR}/cilium-endpoints.png`,
        });
        await expectNoTableOverflow(page);
        await page.locator('[data-testid="cilium-tab-flows"]').click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `${AUDIT_DIR}/cilium-flows.png`,
        });
        await expectNoTableOverflow(page);
      }
    });
  }
});
