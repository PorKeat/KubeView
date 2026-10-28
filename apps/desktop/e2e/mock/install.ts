import type { Page, Route } from "@playwright/test";

import { resultFor } from "./results";

type JsonRecord = Record<string, unknown>;

export interface MockRpcOptions {
  responses?: Record<string, unknown>;
  errors?: Record<string, { code: string; message: string }>;
}

export async function mockRpc(
  page: Page,
  options: MockRpcOptions = {},
): Promise<void> {
  await page.route("**/api/rpc", async (route: Route) => {
    let body: { method?: string; params?: JsonRecord } = {};
    try {
      body = route.request().postDataJSON() as typeof body;
    } catch {
      body = {};
    }
    const method = body.method ?? "";
    const hasError = Object.prototype.hasOwnProperty.call(
      options.errors ?? {},
      method,
    );
    if (hasError) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: options.errors?.[method] }),
      });
      return;
    }
    const hasOverride = Object.prototype.hasOwnProperty.call(
      options.responses ?? {},
      method,
    );
    const result = hasOverride
      ? options.responses?.[method]
      : resultFor(method, body.params);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result }),
    });
  });
}
