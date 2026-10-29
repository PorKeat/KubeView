import { test, expect, type Page } from "@playwright/test";
import { mockRpc, type MockRpcOptions } from "./mockRpc";

async function boot(page: Page, options: MockRpcOptions = {}) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_skip_boot_splash", "true");
  });
  await mockRpc(page, options);
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const trigger = page.locator('[data-testid="context-switcher-trigger"]');
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await expect(trigger).toContainText("mock-cluster", { timeout: 15000 });

  await page.locator('[data-testid="nav-item-permissions"]').click();
  await expect(page.locator('[data-testid="permissions-view"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="permission-effective"]'),
  ).toBeVisible({ timeout: 15000 });
}

test.describe("KubeView permission checker", () => {
  test("shows effective access and allows a matching operation", async ({
    page,
  }) => {
    await boot(page);

    const effective = page.locator('[data-testid="permission-effective"]');
    await expect(effective).toContainText("User kubernetes-admin");
    await expect(
      page.locator('[data-testid="permission-use-current"]'),
    ).toContainText("Current identity");
    await expect(
      page.locator('[data-testid="permission-namespace-access"]'),
    ).toContainText("production");
    await expect(effective).toContainText("pod-reader");
    await expect(effective).toContainText("read-pods");

    await page
      .locator('[data-testid="permission-check-resource"]')
      .fill("pods");
    await page.locator('[data-testid="permission-check"]').click();

    const decision = page.locator('[data-testid="permission-decision"]');
    await expect(decision).toBeVisible({ timeout: 15000 });
    await expect(decision).toContainText("Operation allowed");
    await expect(decision).toContainText("sar_allowed");
    await expect(decision).toContainText("SubjectAccessReview");
    await expect(decision).toContainText("pod-reader");
    await expect(decision).toContainText("read-pods");
  });

  test("explains a denied operation with clustered evidence", async ({
    page,
  }) => {
    await boot(page, {
      responses: { "access.explain": permissionDeniedDecision },
    });

    await page
      .locator('[data-testid="permission-check-resource"]')
      .fill("secrets");
    await page.locator('[data-testid="permission-check-verb"]').click();
    await page
      .locator('[data-testid="permission-check-verb-option-delete"]')
      .click();
    await page.locator('[data-testid="permission-check"]').click();

    const decision = page.locator('[data-testid="permission-decision"]');
    await expect(decision).toBeVisible({ timeout: 15000 });
    await expect(decision).toContainText("Operation denied");
    await expect(decision).toContainText("no_matching_rule");
    await expect(decision).toContainText("No RBAC rule matched");
    await expect(decision).toContainText("RBAC: no rules matched");
  });
});

const permissionDeniedDecision = {
  allowed: false,
  reason: "no_matching_rule",
  summary: "No RBAC binding grants delete on secrets to User kubernetes-admin.",
  matchedRules: [],
  matchedBindings: [
    {
      kind: "RoleBinding",
      name: "read-pods",
      namespace: "production",
      roleKind: "Role",
      roleName: "pod-reader",
      subjects: [
        { kind: "ServiceAccount", name: "default", namespace: "production" },
      ],
    },
  ],
  sar: {
    allowed: false,
    authoritative: true,
    reason: "RBAC: no rules matched",
  },
  warnings: [],
};
