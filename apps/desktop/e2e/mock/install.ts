import type { Page, Route } from "@playwright/test";

import { resultFor } from "./results";

type JsonRecord = Record<string, unknown>;

export interface MockRpcOptions {
  responses?: Record<string, unknown>;
  errors?: Record<string, { code: string; message: string }>;
  /**
   * Navigation groups start collapsed in the product. Most page-level specs
   * need their sidebar destination visible, so keep them expanded unless a
   * test is specifically checking the collapsed default.
   */
  autoExpandNav?: boolean;
}

async function installNavAutoExpand(page: Page) {
  await page.addInitScript(() => {
    const expand = () => {
      document
        .querySelectorAll<HTMLElement>(
          '[data-nav-group][aria-expanded="false"]',
        )
        .forEach((group) => group.click());
    };
    const start = () => {
      // The first pass can run before React hydration attaches handlers.
      // Retry as the app settles so navigation specs still reach their page.
      expand();
      window.setTimeout(expand, 250);
      window.setTimeout(expand, 750);
      window.setTimeout(expand, 1500);
      window.setTimeout(expand, 3000);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  });
}

export async function mockRpc(
  page: Page,
  options: MockRpcOptions = {},
): Promise<void> {
  if (options.autoExpandNav !== false) {
    await installNavAutoExpand(page);
  }
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
