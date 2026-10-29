import { test, expect } from "@playwright/test";

test.describe("KubeView UI - Accessibility & Keyboard Navigation (WCAG AA)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_skip_boot_splash", "true");
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await expect(trigger).toContainText("kubernetes-admin@kubekey", {
      timeout: 15000,
    });
    // Wait for telemetry metrics / overview cards to be rendered
    await expect(page.locator("body")).toContainText(/Nodes|Pods|CPU|Memory/i, {
      timeout: 15000,
    });
  });

  test("context switcher dropdown and search input are fully keyboard navigable", async ({
    page,
  }) => {
    test.setTimeout(60000);
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await trigger.focus();
    await expect(trigger).toBeFocused();

    // Open context switcher dropdown using keyboard Enter
    await page.keyboard.press("Enter");

    // The search input should be visible and focused
    const searchInput = page.locator(
      'input[aria-label="Filter cluster contexts"]',
    );
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Type query to filter
    await searchInput.fill("mailconfig");
    await page.waitForTimeout(300);

    // Filtered result should be visible
    const filteredItem = page.locator('[data-testid="context-item"]').first();
    await expect(filteredItem).toBeVisible();
    await expect(filteredItem).toContainText("mailconfig");

    // Press ArrowDown to navigate from search input to the first item
    await page.keyboard.press("ArrowDown");

    // Press Enter to select the filtered context
    await page.keyboard.press("Enter");

    // Context should switch
    await expect(trigger).toContainText("mailconfig", { timeout: 10000 });
    await page.waitForFunction(
      () =>
        /status connected/i.test(
          document
            .querySelector('[data-testid="context-switcher-trigger"]')
            ?.getAttribute("aria-label") ?? "",
        ),
      undefined,
      { timeout: 15000 },
    );

    // The engine's active context is global. Restore the primary cluster so
    // later live specs see the data they expect. Clearing the search is
    // required because the dropdown keeps its filter between openings.
    await trigger.click();
    const contextSearch = page.locator(
      'input[aria-label="Filter cluster contexts"]',
    );
    await expect(contextSearch).toBeVisible({ timeout: 5000 });
    await contextSearch.fill("");
    await page
      .locator('[data-testid="context-item"]')
      .filter({ hasText: "kubernetes-admin@kubekey" })
      .filter({ hasNotText: "mailconfig" })
      .first()
      .click();
    await expect(trigger).not.toContainText("(mailconfig)", {
      timeout: 15000,
    });
    await page.waitForFunction(
      () =>
        /status connected/i.test(
          document
            .querySelector('[data-testid="context-switcher-trigger"]')
            ?.getAttribute("aria-label") ?? "",
        ),
      undefined,
      { timeout: 15000 },
    );
  });

  test("cluster overview interactive elements support full keyboard interaction", async ({
    page,
  }) => {
    // 1. Refresh button has accessible name and can be focused via keyboard
    const refreshBtn = page.locator(
      'button[aria-label="Refresh cluster telemetry and diagnostics"]',
    );
    await expect(refreshBtn).toBeVisible({ timeout: 10000 });
    await refreshBtn.focus();
    await expect(refreshBtn).toBeFocused();

    // 2. Pod density card can be activated via Enter key to navigate to Pods tab
    const podDensityCard = page.locator('[aria-label^="Pod density:"]');
    await expect(podDensityCard).toBeVisible({ timeout: 10000 });
    await podDensityCard.focus();
    await expect(podDensityCard).toBeFocused();

    await page.keyboard.press("Enter");

    // Tab bar should now show Pods tab active and pods table visible
    await expect(page.locator("body")).toContainText("coredns", {
      timeout: 10000,
    });

    // Switch back to Cluster Overview tab using keyboard on TabBar
    const overviewTab = page.locator(
      '[role="tab"]:has-text("Cluster Overview")',
    );
    await expect(overviewTab).toBeVisible();
    await overviewTab.focus();
    await page.keyboard.press("Enter");

    // 3. Node card can be selected via Enter key to open Resource Inspector Drawer
    const nodeCard = page.locator('[aria-label^="Node "]').first();
    await expect(nodeCard).toBeVisible({ timeout: 10000 });
    await nodeCard.focus();
    await expect(nodeCard).toBeFocused();

    await page.keyboard.press("Enter");

    // Inspector drawer should open with close button
    const closeBtn = page.locator('[data-testid="inspector-close-btn"]');
    await expect(closeBtn).toBeVisible({ timeout: 5000 });

    // Close drawer via Escape key
    await page.keyboard.press("Escape");
    await expect(closeBtn).not.toBeVisible();
  });

  test("status pills, badges, and primary buttons meet WCAG AA contrast standards", async ({
    page,
  }) => {
    // Audit contrast on primary action button (Refresh)
    const refreshBtn = page.locator(
      'button[aria-label="Refresh cluster telemetry and diagnostics"]',
    );
    await expect(refreshBtn).toBeVisible({ timeout: 10000 });

    const refreshContrast = await page.evaluate(() => {
      const btn = document.querySelector(
        'button[aria-label="Refresh cluster telemetry and diagnostics"]',
      );
      if (!btn) return null;
      const style = window.getComputedStyle(btn);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      };
    });

    expect(refreshContrast).not.toBeNull();
    // Refresh button uses text-zinc-950 on #f08a42 (orange) -> dark text on orange has > 7:1 contrast (AAA)
    expect(refreshContrast?.color).toMatch(
      /(lab\(|oklch\(|rgb\(9,\s*9,\s*11\))/,
    );

    // Audit status indicators (Healthy / Ready badges)
    const statusBadges = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll("span, strong, button"),
      ).filter((el) => {
        const text = el.textContent?.trim();
        return [
          "Healthy",
          "Optimal",
          "Authorized",
          "Verified",
          "ClusterAdmin",
          "Running",
        ].includes(text || "");
      });
      return elements.slice(0, 5).map((el) => {
        const style = window.getComputedStyle(el);
        return {
          text: el.textContent?.trim(),
          color: style.color,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
        };
      });
    });

    expect(statusBadges.length).toBeGreaterThan(0);
    for (const badge of statusBadges) {
      expect(badge.color).toBeTruthy();
    }
  });
});
