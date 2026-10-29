import { test, expect, type Page } from "@playwright/test";
import { expandSidebarGroups } from "./nav";

async function openApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_skip_boot_splash", "true");
  });
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const trigger = page.locator('[data-testid="context-switcher-trigger"]');
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await expect(trigger).toContainText("kubernetes-admin@kubekey", {
    timeout: 15000,
  });
  await expandSidebarGroups(page);
}

test.describe("KubeView Workload Bulk Selection", () => {
  test("selects multiple rows and previews safe bulk commands", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await openApp(page);

    const workloads = [
      {
        id: "replicasets",
        kind: "ReplicaSet",
        filter: /Filter replicasets/i,
        restart: false,
      },
      {
        id: "statefulsets",
        kind: "StatefulSet",
        filter: /Filter statefulsets/i,
        restart: true,
      },
      {
        id: "daemonsets",
        kind: "DaemonSet",
        filter: /Filter daemonsets/i,
        restart: true,
      },
      { id: "jobs", kind: "Job", filter: /Filter jobs/i, restart: false },
    ];

    for (const workload of workloads) {
      await page.getByTestId(`nav-item-${workload.id}`).click();
      await expect(page.getByPlaceholder(workload.filter)).toBeVisible({
        timeout: 15000,
      });

      const checkboxes = page.locator(
        `button[aria-label^="Select ${workload.kind} "]`,
      );
      await expect(checkboxes.first()).toBeVisible({ timeout: 15000 });
      const rowCount = await checkboxes.count();
      expect(rowCount).toBeGreaterThan(0);

      await checkboxes.nth(0).click();
      if (rowCount > 1) await checkboxes.nth(1).click();

      const bulkToolbar = page.getByTestId("bulk-workload-toolbar");
      await expect(bulkToolbar).toBeVisible();
      await expect(bulkToolbar).toContainText("selected");
      await expect(bulkToolbar).toContainText(String(rowCount > 1 ? 2 : 1));

      if (workload.restart) {
        await page.getByTestId("bulk-action-restart").click();
        const restartModal = page.getByTestId("bulk-workload-action-modal");
        await expect(restartModal).toBeVisible();
        await expect(restartModal).toContainText("kubectl rollout restart");
        await page.getByTestId("bulk-workload-action-cancel").click();
        await expect(restartModal).not.toBeVisible();
      }

      await page.getByTestId("bulk-action-delete").click();
      const deleteModal = page.getByTestId("bulk-workload-action-modal");
      await expect(deleteModal).toBeVisible();
      await expect(deleteModal).toContainText("kubectl delete");
      await page.getByTestId("bulk-workload-action-cancel").click();
      await expect(deleteModal).not.toBeVisible();

      await page.getByTestId("bulk-clear-selection").click();
      await expect(bulkToolbar).not.toBeVisible();
    }
  });
});

test.describe("KubeView Workload Bulk Selection - Mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("bulk toolbar and confirmation sheet fit on phone", async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByTestId("nav-item-daemonsets").click();
    await expect(page.getByPlaceholder(/Filter daemonsets/i)).toBeVisible({
      timeout: 15000,
    });

    const checkbox = page
      .locator('button[aria-label^="Select DaemonSet "]')
      .first();
    await expect(checkbox).toBeVisible({ timeout: 15000 });
    await checkbox.click();

    const bulkToolbar = page.getByTestId("bulk-workload-toolbar");
    await expect(bulkToolbar).toBeVisible();
    const toolbarOverflow = await bulkToolbar.evaluate(
      (node) => node.scrollWidth - node.clientWidth,
    );
    expect(toolbarOverflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath("mobile-bulk-toolbar.png"),
    });

    await page.getByTestId("bulk-action-delete").click();
    const modal = page.getByTestId("bulk-workload-action-modal");
    await expect(modal).toBeVisible();
    const modalOverflow = await modal.evaluate(
      (node) => node.scrollWidth - node.clientWidth,
    );
    expect(modalOverflow).toBeLessThanOrEqual(1);
    await expect(modal).toContainText("kubectl delete");
    await page.screenshot({
      path: testInfo.outputPath("mobile-bulk-modal.png"),
    });

    await page.getByTestId("bulk-workload-action-cancel").click();
    await expect(modal).not.toBeVisible();
    await page.getByTestId("bulk-clear-selection").click();
    await expect(bulkToolbar).not.toBeVisible();
  });
});
