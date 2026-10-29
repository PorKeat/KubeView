import { test, expect, type Locator, type Page } from "@playwright/test";
import { mockRpc, type MockRpcOptions } from "./mockRpc";

async function readYaml(editor: Locator) {
  return (await editor.innerText()).replace(/ /g, " ");
}

async function replaceYaml(page: Page, editor: Locator, value: string) {
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(value);
}

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
  await page.locator('[data-testid="nav-item-serviceaccounts"]').click();
  await expect(page.locator('[data-testid="serviceaccounts-row"]')).toHaveCount(
    1,
  );
}

test.describe("KubeView generic resource editor", () => {
  test("edits, validates, and creates a ServiceAccount", async ({ page }) => {
    await boot(page);

    await page.locator('[data-testid="serviceaccounts-edit"]').click();
    const drawer = page.locator('[data-testid="resource-inspector-drawer"]');
    const inline = page.locator('[data-testid="inspector-resource-editor"]');
    await expect(drawer).toBeVisible();
    await expect(inline).toBeVisible();
    await expect(
      inline.locator('[data-testid="inspector-resource-editor-yaml"]'),
    ).toContainText(/kind: ServiceAccount/);
    await expect(
      inline.locator('[data-testid="inspector-resource-editor-delete"]'),
    ).toBeVisible();

    const maximize = inline.locator(
      '[data-testid="inspector-resource-editor-maximize"]',
    );
    const widthBefore = (await drawer.boundingBox())?.width ?? 0;
    await maximize.click();
    await expect(maximize).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(async () => (await drawer.boundingBox())?.width ?? 0)
      .toBeGreaterThan(widthBefore);
    await maximize.click();
    await expect(maximize).toHaveAttribute("aria-pressed", "false");

    const yamlEditor = inline.locator(
      '[data-testid="inspector-resource-editor-yaml"]',
    );
    await replaceYaml(
      page,
      yamlEditor,
      `${await readYaml(yamlEditor)}# edited\n`,
    );

    await inline
      .locator('[data-testid="inspector-resource-editor-validate"]')
      .click();
    await expect(
      inline.locator('[data-testid="inspector-resource-editor-validate"]'),
    ).toContainText("Valid");

    await inline
      .locator('[data-testid="inspector-resource-editor-apply-close"]')
      .click();
    await expect(drawer).toHaveCount(0);

    await page.locator('[data-testid="serviceaccounts-create"]').click();
    const modal = page.locator('[data-testid="resource-editor-modal"]');
    await expect(modal.getByText("Create ServiceAccount")).toBeVisible();
    await page.locator('[data-testid="resource-editor-apply"]').click();
    await expect(modal).toHaveCount(0);
  });

  test("deletes a resource through the generic confirmation flow", async ({
    page,
  }) => {
    await boot(page);

    await page.locator('[data-testid="serviceaccounts-edit"]').click();
    await expect(
      page.locator('[data-testid="inspector-resource-editor"]'),
    ).toBeVisible();
    await page
      .locator('[data-testid="inspector-resource-editor-delete"]')
      .click();

    const deleteModal = page.locator('[data-testid="delete-resource-modal"]');
    await expect(deleteModal).toBeVisible();
    await page
      .getByLabel("Type resource name to confirm deletion")
      .fill("default");
    await deleteModal
      .getByRole("button", { name: "Delete ServiceAccount" })
      .click();

    await expect(deleteModal).toHaveCount(0);
  });

  test("disables apply when the identity cannot update the resource", async ({
    page,
  }) => {
    await boot(page, {
      responses: {
        "resources.capabilities": {
          get: true,
          create: true,
          update: false,
          delete: false,
          reasons: {
            update: "insufficient permission to update serviceaccounts",
            delete: "insufficient permission to delete serviceaccounts",
          },
        },
      },
    });

    await page.locator('[data-testid="serviceaccounts-edit"]').click();
    const inline = page.locator('[data-testid="inspector-resource-editor"]');
    await expect(inline).toBeVisible();
    await expect(
      inline.getByText("insufficient permission to update serviceaccounts"),
    ).toBeVisible();
    await expect(
      inline.locator('[data-testid="inspector-resource-editor-apply"]'),
    ).toBeDisabled();
    await expect(
      inline.locator('[data-testid="inspector-resource-editor-delete"]'),
    ).toBeDisabled();
  });

  test("opens the inline editor from the inspector and create actions", async ({
    page,
  }) => {
    await boot(page);

    await page.locator('[data-testid="serviceaccounts-row"]').first().click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toBeVisible();
    await page.locator('[data-testid="inspector-edit-yaml"]').click();

    const inline = page.locator('[data-testid="inspector-resource-editor"]');
    await expect(inline).toBeVisible();
    await expect(
      inline.locator('[data-testid="inspector-resource-editor-yaml"]'),
    ).toContainText(/kind: ServiceAccount/);
    await page.locator('[data-testid="inspector-close-btn"]').click();

    await page.locator('[data-testid="nav-item-deployments"]').click();
    await expect(page.getByPlaceholder(/Filter deployments/i)).toBeVisible();
    await page.locator('[data-testid="deployments-create"]').click();
    const modal = page.locator('[data-testid="resource-editor-modal"]');
    await expect(modal.getByText("Create Deployment")).toBeVisible();
    await page.getByRole("button", { name: "Close YAML editor" }).click();

    await page.locator('[data-testid="nav-item-ingresses"]').click();
    await expect(
      page.locator('[data-testid="ingresses-create"]'),
    ).toBeVisible();
    await page.locator('[data-testid="ingresses-create"]').click();
    await expect(modal.getByText("Create Ingress")).toBeVisible();
    await page.getByRole("button", { name: "Close YAML editor" }).click();

    await page.locator('[data-testid="gateways-view-tab"]').click();
    await expect(page.locator('[data-testid="gateways-create"]')).toBeVisible();
    await page.locator('[data-testid="gateways-create"]').click();
    await expect(modal.getByText("Create Gateway")).toBeVisible();
  });

  test("shows a diff, confirms destructive changes, and guards unsaved edits", async ({
    page,
  }) => {
    await boot(page);

    await page.locator('[data-testid="serviceaccounts-edit"]').click();
    const inline = page.locator('[data-testid="inspector-resource-editor"]');
    const yamlEditor = inline.locator(
      '[data-testid="inspector-resource-editor-yaml"]',
    );
    await expect(inline).toBeVisible();
    const original = await readYaml(yamlEditor);

    await replaceYaml(page, yamlEditor, `${original}# changed\n`);
    await page
      .locator('[data-testid="inspector-resource-editor-view-diff"]')
      .click();
    const diff = page.locator('[data-testid="inspector-resource-editor-diff"]');
    await expect(diff).toBeVisible();
    await expect(diff).toContainText("# changed");

    await page.locator('[data-testid="inspector-close-btn"]').click();
    const guard = page.locator('[data-testid="inspector-discard-guard"]');
    await expect(guard).toBeVisible();
    await page.locator('[data-testid="inspector-keep-editing"]').click();
    await expect(inline).toBeVisible();

    await page
      .locator('[data-testid="inspector-resource-editor-view-yaml"]')
      .click();
    const current = await readYaml(yamlEditor);
    await replaceYaml(
      page,
      yamlEditor,
      current.replace("  namespace: production\n", ""),
    );
    await page
      .locator('[data-testid="inspector-resource-editor-apply"]')
      .click();
    await expect(
      page.locator('[data-testid="inspector-resource-editor-apply-confirm"]'),
    ).toBeVisible();
    await page
      .locator('[data-testid="inspector-resource-editor-cancel-apply"]')
      .click();

    await page.locator('[data-testid="inspector-close-btn"]').click();
    await expect(guard).toBeVisible();
    await page.locator('[data-testid="inspector-discard-changes"]').click();
    await expect(
      page.locator('[data-testid="resource-inspector-drawer"]'),
    ).toHaveCount(0);
  });

  test("opens the permission checker from a forbidden apply", async ({
    page,
  }) => {
    await boot(page, {
      errors: {
        "resources.apply": {
          code: "K8S_FORBIDDEN",
          message: "serviceaccounts is forbidden",
        },
      },
    });

    await page.locator('[data-testid="serviceaccounts-edit"]').click();
    const inline = page.locator('[data-testid="inspector-resource-editor"]');
    const yamlEditor = inline.locator(
      '[data-testid="inspector-resource-editor-yaml"]',
    );
    await expect(inline).toBeVisible();
    await replaceYaml(
      page,
      yamlEditor,
      `${await readYaml(yamlEditor)}# denied\n`,
    );
    await page
      .locator('[data-testid="inspector-resource-editor-apply"]')
      .click();

    const explain = page.getByRole("button", { name: "Why denied?" });
    await expect(explain).toBeVisible({ timeout: 10000 });
    await explain.click();

    await expect(
      page.locator('[data-testid="permissions-view"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="permission-prefilled"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="permission-check-resource"]'),
    ).toHaveValue("serviceaccounts");
    await expect(
      page.locator('[data-testid="permission-check-verb"]'),
    ).toContainText("update");
    await expect(
      page.locator('[data-testid="permission-check-namespace"]'),
    ).toHaveValue("production");
  });
});
