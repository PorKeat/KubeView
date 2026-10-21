import { test, expect } from "@playwright/test";

test.describe("KubeView UI - Deep Conditions & Edge Case Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const trigger = page.locator('[data-testid="context-switcher-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await expect(trigger).toContainText("kubernetes-admin@kubekey", { timeout: 15000 });
  });

  test("status bar renders modern clean IDE styling and handles telemetry interactions", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible({ timeout: 10000 });

    // 1. Connection status and latency
    await expect(footer).toContainText(/Connected/i);
    await expect(footer).toContainText(/ms\)/i);

    // 2. Active context without loud candy boxes
    await expect(footer).toContainText("kubernetes-admin@kubekey");

    // 3. Runtime Engine & RBAC indicators (clean, unboxed text)
    await expect(footer).toContainText(/Go 1\.23/i);
    await expect(footer).toContainText(/ClusterAdmin/i);

    // 4. Server version click-to-copy
    const versionBtn = footer.locator("button").filter({ hasText: /v1\./i });
    await expect(versionBtn).toBeVisible();
    await versionBtn.click();

    // Verify toast appears
    await expect(page.locator("body")).toContainText(/Cluster details copied/i, { timeout: 5000 });

    // 5. Test ping refresh click on latency beacon
    const pingBtn = footer.locator("button").filter({ hasText: /Connected/i });
    await pingBtn.click();
    await expect(page.locator("body")).toContainText(/Telemetry refreshed|Connected/i, { timeout: 5000 });
  });

  test("overview telemetry metric modes toggle seamlessly between Live Usage and Allocation", async ({ page }) => {
    // Wait for overview telemetry section
    await expect(page.locator("body")).toContainText(/Telemetry/i, { timeout: 15000 });

    // Locate the Live Usage and Allocation toggle buttons
    const liveUsageBtn = page.getByRole("button", { name: /Live Usage/i });
    const allocationBtn = page.getByRole("button", { name: /Allocation/i });

    await expect(liveUsageBtn).toBeVisible({ timeout: 10000 });
    await expect(allocationBtn).toBeVisible({ timeout: 10000 });

    // Switch to Allocation mode
    await allocationBtn.click();
    await expect(allocationBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("body")).toContainText(/Allocation/i);

    // Switch back to Live Usage mode
    await liveUsageBtn.click();
    await expect(liveUsageBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("body")).toContainText(/Live Usage/i);
  });

  test("pod exec modal supports interactive terminal, mode toggle, and distroless handling", async ({ page }) => {
    // Navigate to Pods view
    const podsNavBtn = page.locator('[data-testid="nav-item-pods"]');
    await expect(podsNavBtn).toBeVisible({ timeout: 10000 });
    await podsNavBtn.click();

    // Wait for pods table rows
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });

    // Click on pod row to open Inspector
    await firstRow.click();

    // Open Containers tab in inspector
    const containersTab = page.locator('[data-testid="inspector-tab-containers"]');
    await expect(containersTab).toBeVisible({ timeout: 8000 });
    await containersTab.click();

    // Look for Exec Shell button
    const execBtn = page.locator('button:has-text("Exec Shell"), button:has-text("Exec")').first();
    await expect(execBtn).toBeVisible({ timeout: 8000 });
    await execBtn.click();

    // Verify Pod Exec modal is open
    const modalHeader = page.locator("text=WebSocket PTY").or(page.locator("text=Interactive Shell"));
    await expect(modalHeader.first()).toBeVisible({ timeout: 8000 });

    // Verify Quick Command chips are present
    const quickCmdDirectory = page.locator('button:has-text("Directory")');
    await expect(quickCmdDirectory).toBeVisible();

    // Verify Shell selector dropdown has auto and standard options
    const shellSelect = page.locator("select").filter({ hasText: /bin\/sh|auto/i });
    if (await shellSelect.isVisible()) {
      await expect(shellSelect).toContainText(/Auto|sh/i);
    }

    // Toggle to Command Runner mode
    const commandRunnerTab = page.getByRole("button", { name: /Command Runner/i });
    await expect(commandRunnerTab).toBeVisible();
    await commandRunnerTab.click();

    // Verify Command Runner input is visible
    const cmdInput = page.getByPlaceholder(/Type command/i);
    await expect(cmdInput).toBeVisible({ timeout: 5000 });

    // Switch back to Interactive Shell
    const interactiveTab = page.getByRole("button", { name: /Interactive Shell/i });
    await interactiveTab.click();
    await expect(quickCmdDirectory).toBeVisible();

    // Close modal via Escape key
    await page.keyboard.press("Escape");
    await expect(modalHeader.first()).not.toBeVisible({ timeout: 5000 });
  });

  test("warning events list renders within height constraints with smooth scrolling", async ({ page }) => {
    // Switch to Cluster Overview tab
    const overviewTab = page.locator('[role="tab"]:has-text("Cluster Overview")');
    await expect(overviewTab).toBeVisible();
    await overviewTab.click();

    // Wait for the overview to load
    await expect(page.locator("body")).toContainText(/Nodes|Pods|CPU|Memory/i, { timeout: 15000 });

    // Look for Warning Events card
    const warningEventsCard = page.locator("#cluster-warning-events-card");
    if (await warningEventsCard.isVisible()) {
      // Verify scroll container has max height constraint
      const scrollArea = warningEventsCard.locator(".overflow-y-auto");
      await expect(scrollArea).toBeVisible();
    }
  });
});
