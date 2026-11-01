import { test, expect, type Page } from "@playwright/test";
import { mockRpc } from "./mockRpc";

async function boot(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kubeview_skip_boot_splash", "true");
  });
  await mockRpc(page);
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await expect(
    page.locator('[data-testid="context-switcher-trigger"]'),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.locator('[data-testid="context-switcher-trigger"]'),
  ).toContainText("mock-cluster", { timeout: 15000 });
  await page.setViewportSize({ width: 1440, height: 900 });
}

test.describe("Job and CronJob creation", () => {
  test("creates a Job from the form and a CronJob from advanced YAML", async ({
    page,
  }) => {
    await boot(page);
    await page.getByTestId("nav-item-jobs").click();

    const jobRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/api/rpc")) return false;
      try {
        const body = request.postDataJSON() as {
          method?: string;
          params?: { mode?: string; yaml?: string };
        };
        return (
          body.method === "resources.apply" &&
          body.params?.mode === "create" &&
          String(body.params?.yaml ?? "").includes("kind: Job")
        );
      } catch {
        return false;
      }
    });

    await page.getByTestId("jobs-create").click();
    await expect(page.getByTestId("create-workload-modal")).toBeVisible();
    await page.getByTestId("create-workload-name").fill("cleanup-report");
    await page.getByTestId("create-workload-image").fill("busybox:1.36");
    await page.getByTestId("create-workload-submit").click();

    const jobPayload = (await jobRequest).postDataJSON() as {
      params: { yaml: string };
    };
    expect(jobPayload.params.yaml).toContain("restartPolicy: Never");
    expect(jobPayload.params.yaml).toContain('name: "cleanup-report"');
    await expect(page.getByTestId("create-workload-modal")).toHaveCount(0);
    await page.getByRole("button", { name: /Close drawer/ }).click();

    await page.getByTestId("cronjobs-view-tab").click();
    await page.getByTestId("cronjobs-create").click();
    await expect(page.getByTestId("create-workload-modal")).toBeVisible();
    await page.getByTestId("create-workload-name").fill("nightly-cleanup");
    await page.getByTestId("create-workload-schedule").fill("0 2 * * *");

    const cronRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/api/rpc")) return false;
      try {
        const body = request.postDataJSON() as {
          method?: string;
          params?: { mode?: string; yaml?: string };
        };
        return (
          body.method === "resources.apply" &&
          body.params?.mode === "create" &&
          String(body.params?.yaml ?? "").includes("kind: CronJob")
        );
      } catch {
        return false;
      }
    });
    await page.getByTestId("create-workload-submit").click();
    const cronPayload = (await cronRequest).postDataJSON() as {
      params: { yaml: string };
    };
    expect(cronPayload.params.yaml).toContain('schedule: "0 2 * * *"');
    await expect(page.getByTestId("create-workload-modal")).toHaveCount(0);
    await page.getByRole("button", { name: /Close drawer/ }).click();

    // Advanced YAML reflects the generated manifest.
    await page.getByTestId("cronjobs-create").click();
    await page.getByTestId("create-workload-tab-yaml").click();
    await expect(page.getByTestId("create-workload-yaml")).toContainText(
      "kind: CronJob",
    );
  });

  test("disables Submit when the identity cannot create Jobs", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kubeview_skip_boot_splash", "true");
    });
    await mockRpc(page, {
      responses: {
        "resources.capabilities": {
          get: true,
          create: false,
          update: false,
          delete: false,
          reasons: { create: "RBAC denies create on jobs." },
        },
      },
    });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.locator('[data-testid="context-switcher-trigger"]'),
    ).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId("nav-item-jobs").click();
    await page.getByTestId("jobs-create").click();

    await expect(page.getByTestId("create-workload-capability")).toContainText(
      "RBAC denies create on jobs.",
    );
    await expect(page.getByTestId("create-workload-submit")).toBeDisabled();
  });
});
