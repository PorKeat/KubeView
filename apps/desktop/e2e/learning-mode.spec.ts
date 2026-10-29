import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";

async function bootApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_splash_seen", "true");
  });
  await mockRpc(page);
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await expect(
    page.locator('[data-testid="context-switcher-trigger"]'),
  ).toBeVisible({ timeout: 15000 });
}

async function openLearningCenter(page: Page) {
  await page.locator('[data-testid="nav-item-learning"]').click();
  await expect(
    page.getByRole("heading", { name: "Learning Center" }),
  ).toBeVisible();
}

test.describe("KubeView UI - Learning mode", () => {
  test("completes a guided lesson, keeps progress, and filters the glossary", async ({
    page,
  }) => {
    await bootApp(page);
    await openLearningCenter(page);

    await expect(
      page.locator('[data-testid="learning-path-list"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="learning-path-card-first-steps"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="learning-lesson-what-is-a-cluster"]'),
    ).toHaveAttribute("aria-current", "step");
    await expect(
      page.locator('[data-testid="learning-progress"]'),
    ).toContainText("0 of 21 lessons complete");

    await page
      .locator('[data-testid="learning-quiz-option-what-is-a-cluster-nodes"]')
      .click();
    await expect(page.getByText("Correct", { exact: true })).toBeVisible();

    await page
      .locator('[data-testid="learning-complete-what-is-a-cluster"]')
      .click();
    await expect(
      page.locator('[data-testid="learning-complete-what-is-a-cluster"]'),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator('[data-testid="learning-progress"]'),
    ).toContainText("1 of 21 lessons complete");

    await page.reload();
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toBeVisible({ timeout: 15000 });
    await openLearningCenter(page);
    await expect(
      page.locator('[data-testid="learning-progress"]'),
    ).toContainText("1 of 21 lessons complete");
    await page
      .locator('[data-testid="learning-lesson-what-is-a-cluster"]')
      .click();
    await expect(
      page.locator('[data-testid="learning-complete-what-is-a-cluster"]'),
    ).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("tab", { name: "Glossary" }).click();
    await expect(page.getByRole("heading", { name: "Glossary" })).toBeVisible();
    await page
      .locator('[data-testid="learning-glossary-search"]')
      .fill("Ingress");
    await expect(
      page.locator('[data-testid="learning-glossary-term-ingress"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="learning-glossary-term-pod"]'),
    ).toHaveCount(0);

    await page
      .locator('[data-testid="learning-glossary-term-ingress"]')
      .click();
    await expect(page.getByText("kubectl get ingress -A")).toBeVisible();

    await page.locator('[data-testid="learning-glossary-search"]').fill("");
    await page
      .locator('[data-testid="learning-glossary-category-workloads"]')
      .click();
    await expect(
      page.locator('[data-testid="learning-glossary-term-deployment"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="learning-glossary-term-service"]'),
    ).toHaveCount(0);
  });

  test("changes guide depth, dismisses per page, and disables learning mode", async ({
    page,
  }) => {
    await bootApp(page);
    const strip = page.locator('[data-testid="learning-context-strip"]');
    await expect(strip).toBeVisible();
    await expect(strip).toContainText("Cluster Overview");
    await expect(strip).toContainText("health dashboard");

    await openLearningCenter(page);
    await page.locator('[data-testid="learning-level-intermediate"]').click();
    await page.locator('[data-testid="nav-item-pods"]').click();
    await expect(strip).toBeVisible();
    await expect(strip).toContainText("Compare readiness");
    await expect(strip).toContainText("kubectl get pods -A -o wide");

    await page.locator('[data-testid="learning-context-dismiss"]').click();
    await expect(strip).toHaveCount(0);

    await page.locator('[data-testid="nav-item-deployments"]').click();
    await expect(strip).toBeVisible();
    await expect(strip).toContainText("Deployments");

    await page.locator('[data-testid="open-settings"]').click();
    await expect(page.locator('[data-testid="settings-view"]')).toBeVisible();
    await page.locator('[data-testid="settings-nav-learning"]').click();
    await expect(
      page.locator('[data-testid="settings-learning-panel"]'),
    ).toBeVisible();
    const modeToggle = page.locator(
      '[data-testid="settings-learning-mode-toggle"]',
    );
    await expect(modeToggle).toHaveAttribute("aria-checked", "true");
    await modeToggle.click();
    await expect(modeToggle).toHaveAttribute("aria-checked", "false");

    await page.locator('[data-testid="settings-open-learning"]').click();
    await expect(
      page.getByRole("heading", { name: "Learning Center" }),
    ).toBeVisible();
    await page.locator('[data-testid="nav-item-pods"]').click();
    await expect(
      page.locator('[data-testid="learning-context-strip"]'),
    ).toHaveCount(0);
  });

  test("explains an inline permission error without hiding the recovery action", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_splash_seen", "true");
    });
    await mockRpc(page, {
      errors: {
        "access.effective": {
          code: "FORBIDDEN",
          message: "forbidden: User cannot list roles in namespace production",
        },
      },
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toBeVisible({ timeout: 15000 });

    await page.locator('[data-testid="nav-item-permissions"]').click();
    const explainButton = page.locator('[data-testid="error-banner-explain"]');
    await expect(explainButton).toBeVisible({ timeout: 10000 });
    await explainButton.click();

    const explanation = page.locator(
      '[data-testid="error-explanation-content"]',
    );
    await expect(explanation).toBeVisible();
    await expect(explanation).toContainText(
      "The cluster understood you, but said no",
    );
    await expect(explanation).toContainText("Open Permissions Checker");
    await expect(explainButton).toHaveAttribute("aria-expanded", "true");
  });

  test("runs an optional spotlight walkthrough with keyboard navigation", async ({
    page,
  }) => {
    await bootApp(page);
    await expect(page.locator('[data-tour="overview-header"]')).toBeVisible();

    const guideButton = page.locator('[data-testid="learning-guide-me"]');
    await expect(guideButton).toBeVisible();
    await guideButton.click();

    const card = page.locator('[data-testid="guided-tour-card"]');
    const stepLabel = page.locator('[data-testid="guided-tour-step-label"]');
    await expect(card).toBeVisible();
    await expect(
      page.locator('[data-testid="guided-tour-highlight"]'),
    ).toBeVisible();
    await expect(stepLabel).toHaveText("Step 1 of 3");
    await expect(card).toContainText("Check which cluster you are viewing");

    await page.locator('[data-testid="guided-tour-next"]').click();
    await expect(stepLabel).toHaveText("Step 2 of 3");
    await expect(card).toContainText("Read the health cards");

    await page.keyboard.press("ArrowLeft");
    await expect(stepLabel).toHaveText("Step 1 of 3");
    await page.keyboard.press("ArrowRight");
    await expect(stepLabel).toHaveText("Step 2 of 3");

    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);

    await guideButton.click();
    await expect(card).toBeVisible();
    await page.locator('[data-testid="guided-tour-skip"]').click();
    await expect(card).toHaveCount(0);
  });

  test("finishes a walkthrough, saves it, and offers a replay", async ({
    page,
  }) => {
    await bootApp(page);
    await expect(page.locator('[data-tour="overview-header"]')).toBeVisible();

    const guideButton = page.locator('[data-testid="learning-guide-me"]');
    await guideButton.click();

    const card = page.locator('[data-testid="guided-tour-card"]');
    const next = page.locator('[data-testid="guided-tour-next"]');
    await expect(card).toContainText("Step 1 of 3");
    await next.click();
    await next.click();
    await expect(card).toContainText("Step 3 of 3");
    await expect(next).toContainText("Finish");
    await next.click();
    await expect(card).toHaveCount(0);
    await expect(guideButton).toContainText("Tour again");

    await page.reload();
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="learning-guide-me"]'),
    ).toContainText("Tour again");
  });

  test("provides page-specific steps on the Pods page", async ({ page }) => {
    await bootApp(page);
    await page.locator('[data-testid="nav-item-pods"]').click();
    await expect(page.locator('[data-tour="pods-search"]')).toBeVisible();
    await expect(page.locator('[data-tour="pods-table"]')).toBeVisible();

    const guideButton = page.locator('[data-testid="learning-guide-me"]');
    await guideButton.click();
    const card = page.locator('[data-testid="guided-tour-card"]');
    await expect(card).toContainText("Find the Pod you need");
    await expect(
      page.locator('[data-testid="guided-tour-highlight"]'),
    ).toBeVisible();

    await page.locator('[data-testid="guided-tour-next"]').click();
    await expect(card).toContainText("Filter by what is going wrong");
    await page.locator('[data-testid="guided-tour-next"]').click();
    await expect(card).toContainText("Open a row to inspect it");
    await expect(
      page.locator('[data-testid="guided-tour-highlight"]'),
    ).toBeVisible();
    await page.locator('[data-testid="guided-tour-skip"]').click();
  });

  test("offers a walkthrough on every core resource page", async ({ page }) => {
    await bootApp(page);
    const tourPages = [
      { nav: "deployments", firstStep: "Find a Deployment" },
      { nav: "services", firstStep: "Find a Service" },
      { nav: "configmaps", firstStep: "Find configuration" },
      { nav: "permissions", firstStep: "Confirm the cluster identity" },
    ];

    for (const tourPage of tourPages) {
      await page.locator(`[data-testid="nav-item-${tourPage.nav}"]`).click();
      const guideButton = page.locator('[data-testid="learning-guide-me"]');
      await expect(guideButton).toBeVisible({ timeout: 10000 });
      await guideButton.click();

      const card = page.locator('[data-testid="guided-tour-card"]');
      await expect(card).toContainText(tourPage.firstStep);
      await expect(
        page.locator('[data-testid="guided-tour-highlight"]'),
      ).toBeVisible();
      await page.locator('[data-testid="guided-tour-skip"]').click();
      await expect(card).toHaveCount(0);
    }
  });

  test("keeps the path rail sticky while a lesson scrolls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await bootApp(page);
    await openLearningCenter(page);

    const rail = page.locator('[data-testid="learning-path-list"]');
    const scrollContainer = page.locator(
      '[data-testid="learning-center-scroll"]',
    );
    await expect(rail).toBeVisible();
    const initialRail = await rail.boundingBox();
    const scrollBox = await scrollContainer.boundingBox();
    expect(initialRail).not.toBeNull();
    expect(scrollBox).not.toBeNull();
    if (!initialRail || !scrollBox) return;

    await scrollContainer.evaluate((element) => {
      element.scrollTop = 900;
    });
    await page.waitForTimeout(200);

    const stickyRail = await rail.boundingBox();
    expect(stickyRail).not.toBeNull();
    if (!stickyRail) return;
    expect(stickyRail.y).toBeLessThan(initialRail.y);
    expect(stickyRail.y).toBeGreaterThanOrEqual(scrollBox.y + 8);
    expect(stickyRail.y).toBeLessThanOrEqual(scrollBox.y + 24);
  });

  test("keeps the walkthrough card inside a phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootApp(page);
    await expect(page.locator('[data-tour="overview-header"]')).toBeVisible();

    const guideButton = page.locator('[data-testid="learning-guide-me"]');
    await expect(guideButton).toBeVisible();
    await guideButton.click();

    const card = page.locator('[data-testid="guided-tour-card"]');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390.5);
    expect(box.y + box.height).toBeLessThanOrEqual(844.5);

    await page.locator('[data-testid="guided-tour-skip"]').click();
  });
});
