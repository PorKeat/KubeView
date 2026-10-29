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

async function expectNoHorizontalOverflow(page: Page, selector: string) {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible();
  const overflow = await element.evaluate(
    (node) => node.scrollWidth - node.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("KubeView Responsive Shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile header fits, navigation drawer works, and tables scroll", async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await page.screenshot({
      path: testInfo.outputPath("mobile-header.png"),
    });
    await expect(page.locator('[aria-label^="Pod density:"]')).toBeVisible({
      timeout: 15000,
    });
    await page.screenshot({
      path: testInfo.outputPath("mobile-overview-live.png"),
    });
    await expectNoHorizontalOverflow(page, "header");
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Open navigation" }).click();
    const sidebar = page.locator('aside[aria-label="Resource navigation"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveClass(/fixed/);
    await page.screenshot({
      path: testInfo.outputPath("mobile-navigation.png"),
    });
    await page.keyboard.press("Escape");
    await expect(sidebar).not.toBeVisible();

    await page
      .getByRole("button", { name: "Search resources", exact: true })
      .click();
    const commandInput = page.getByPlaceholder(/Type a command/);
    await expect(commandInput).toBeVisible();
    const paletteOverflow = await page.evaluate(() => {
      const root = document.querySelector("[cmdk-root]") as HTMLElement | null;
      const panel = root?.parentElement as HTMLElement | null;
      return panel ? panel.scrollWidth - panel.clientWidth : 0;
    });
    expect(paletteOverflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath("mobile-command-palette.png"),
    });
    await page.keyboard.press("Escape");
    await expect(commandInput).not.toBeVisible();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByTestId("nav-item-deployments").click();
    await expect(sidebar).not.toBeVisible();
    const deploymentFilter = page.getByPlaceholder(/Filter deployments/i);
    await expect(deploymentFilter).toBeVisible({ timeout: 15000 });

    const tableScroll = await page
      .locator("table")
      .first()
      .evaluate((table) => {
        const wrapper = table.parentElement as HTMLElement;
        return {
          scrollWidth: wrapper.scrollWidth,
          clientWidth: wrapper.clientWidth,
        };
      });
    expect(tableScroll.scrollWidth).toBeGreaterThan(tableScroll.clientWidth);

    const pageOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: testInfo.outputPath("mobile-deployments.png"),
    });
  });

  test("every workload table stays scrollable at phone width", async ({
    page,
  }) => {
    await openApp(page);
    const workloadPages = [
      { id: "pods", placeholder: /Filter pods/i },
      { id: "deployments", placeholder: /Filter deployments/i },
      { id: "replicasets", placeholder: /Filter replicasets/i },
      { id: "statefulsets", placeholder: /Filter statefulsets/i },
      { id: "daemonsets", placeholder: /Filter daemonsets/i },
      { id: "jobs", placeholder: /Filter jobs/i },
    ];

    for (const workload of workloadPages) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByTestId(`nav-item-${workload.id}`).click();
      await expect(page.getByPlaceholder(workload.placeholder)).toBeVisible({
        timeout: 15000,
      });
      const table = page.locator("table").first();
      await expect(table).toBeVisible({ timeout: 15000 });
      const scrollable = await table.evaluate((node) => {
        const wrapper = node.parentElement as HTMLElement;
        return wrapper.scrollWidth > wrapper.clientWidth;
      });
      expect(scrollable).toBe(true);
      const pageOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(pageOverflow).toBeLessThanOrEqual(1);
    }

    // CronJobs shares the workload list shell with Jobs, but has its own table
    // and toolbar, so verify that tab at the same phone width.
    await page.getByTestId("cronjobs-view-tab").click();
    await expect(page.getByPlaceholder(/Filter cronjobs/i)).toBeVisible({
      timeout: 15000,
    });
    const cronJobTable = page.locator("table").first();
    await expect(cronJobTable).toBeVisible({ timeout: 15000 });
    const cronJobScrollable = await cronJobTable.evaluate((node) => {
      const wrapper = node.parentElement as HTMLElement;
      return wrapper.scrollWidth > wrapper.clientWidth;
    });
    expect(cronJobScrollable).toBe(true);
    const cronJobPageOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(cronJobPageOverflow).toBeLessThanOrEqual(1);
  });

  test("mobile settings page changes font size and stays within the viewport", async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await page.getByTestId("open-settings").click();
    const settingsView = page.getByTestId("settings-view");
    await expect(settingsView).toBeVisible();
    await expect(page.getByRole("tab", { name: "Settings tab" })).toBeVisible();
    await expectNoHorizontalOverflow(page, '[data-testid="settings-view"]');
    await page.screenshot({
      path: testInfo.outputPath("mobile-settings-top.png"),
    });

    await page.getByTestId("settings-font-lg").click();
    await expect(page.locator("html")).toHaveAttribute("data-font-size", "lg");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).fontSize,
      ),
    ).toBe("18px");

    await page.getByTestId("settings-reduced-motion").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );

    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByTestId("settings-nav-data-refresh").click();
    await expect(page.getByTestId("settings-page-size-50")).toBeVisible();

    await page.getByTestId("settings-page-size-100").click();
    await page.getByTestId("settings-refresh-30").click();
    await expect(page.getByTestId("settings-refresh-30")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("settings-page-size-100")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.waitForTimeout(100);
    await page.screenshot({
      path: testInfo.outputPath("mobile-settings.png"),
    });

    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("kubeview-preferences") ?? "{}"),
    );
    expect(saved.state.fontSize).toBe("lg");
    expect(saved.state.defaultPageSize).toBe(100);
    expect(saved.state.autoRefreshSeconds).toBe(30);
    expect(saved.state.reducedMotion).toBe(true);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-font-size", "lg");
    await expect(page.locator("html")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
    await expectNoHorizontalOverflow(page, "header");

    await expandSidebarGroups(page);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByTestId("nav-item-deployments").click();
    await expect(page.getByPlaceholder(/Filter deployments/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId("page-size-100")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("switches the sidebar to settings navigation and offers Back", async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByTestId("nav-item-settings").click();
    await expect(page.getByTestId("settings-view")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Settings tab" })).toBeVisible();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByTestId("settings-nav-appearance")).toBeVisible();
    await expect(page.getByTestId("settings-nav-data-refresh")).toBeVisible();
    await expect(page.getByTestId("settings-nav-shortcuts")).toBeVisible();
    await expect(page.getByTestId("nav-back")).toBeVisible();
    await expect(page.getByTestId("nav-item-deployments")).toBeHidden();
    await expect(page.getByTestId("settings-nav-appearance")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.screenshot({
      path: testInfo.outputPath("mobile-settings-sidebar.png"),
    });

    await page.getByTestId("settings-nav-data-refresh").click();
    await expect(page.getByTestId("settings-page-size-50")).toBeVisible();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByTestId("settings-nav-data-refresh")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.screenshot({
      path: testInfo.outputPath("mobile-settings-sidebar-active.png"),
    });

    await page.getByTestId("nav-back").click();
    await expect(page.getByTestId("settings-view")).not.toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Cluster Overview tab/i }),
    ).toBeVisible();
  });

  test("mobile header remains usable at extra-large font", async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await page.getByTestId("open-settings").click();
    await expect(page.getByTestId("settings-view")).toBeVisible();
    await page.getByTestId("settings-font-xl").click();
    await page.getByRole("tab", { name: /Cluster Overview tab/i }).click();
    await expect(page.getByTestId("settings-view")).not.toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-font-size", "xl");
    await expectNoHorizontalOverflow(page, "header");
    await page.screenshot({
      path: testInfo.outputPath("mobile-header-xl.png"),
    });
  });

  test("mobile inspector header stays usable at 390px", async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByTestId("nav-item-deployments").click();
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });
    await firstRow.click();

    const drawer = page.getByTestId("resource-inspector-drawer");
    await expect(drawer).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(350);
    await expectNoHorizontalOverflow(
      page,
      '[data-testid="resource-inspector-drawer"]',
    );
    await expect(page.getByTestId("inspector-close-btn")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("mobile-inspector.png"),
    });

    await page.getByRole("button", { name: "Scale Replicas" }).click();
    const actionModal = page.getByTestId("workload-action-modal");
    await expect(actionModal).toBeVisible();
    const actionPanel = actionModal.locator("> div").first();
    const actionOverflow = await actionPanel.evaluate(
      (node) => node.scrollWidth - node.clientWidth,
    );
    expect(actionOverflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath("mobile-workload-action.png"),
    });
    await page.keyboard.press("Escape");
    await expect(actionModal).not.toBeVisible();
    await expect(drawer).toBeVisible();

    await page.getByTestId("inspector-close-btn").click();
    await expect(drawer).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe("KubeView Tablet Shell", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("keeps the desktop sidebar and header usable at tablet width", async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await expectNoHorizontalOverflow(page, "header");
    await expect(
      page.locator('aside[aria-label="Resource navigation"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeHidden();
    await page.screenshot({
      path: testInfo.outputPath("tablet-shell.png"),
    });
  });
});

test.describe("KubeView Desktop Shell", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("keeps the full sidebar and search trigger at desktop width", async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await expectNoHorizontalOverflow(page, "header");
    await expect(
      page.locator('aside[aria-label="Resource navigation"]'),
    ).toBeVisible();
    await expect(page.getByTestId("nav-item-settings")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Search resources, pods, logs/i }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("desktop-shell.png"),
    });

    await page.getByTestId("open-settings").click();
    await expect(page.getByTestId("settings-view")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Settings tab" })).toBeVisible();
    await expect(page.getByTestId("settings-nav-appearance")).toBeVisible();
    await expect(page.getByTestId("settings-nav-appearance")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("nav-back")).toBeVisible();
    await expect(page.getByTestId("nav-item-settings")).toBeHidden();
    await expectNoHorizontalOverflow(page, '[data-testid="settings-view"]');
    await page.screenshot({
      path: testInfo.outputPath("desktop-settings.png"),
    });
  });
});

test.describe("KubeView Compact Desktop", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("shows the full search trigger without header overflow", async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await expectNoHorizontalOverflow(page, "header");
    await expect(
      page.getByRole("button", { name: /Search resources, pods, logs/i }),
    ).toBeVisible();
    await expect(
      page.locator('aside[aria-label="Resource navigation"]'),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("compact-desktop-shell.png"),
    });
  });
});
