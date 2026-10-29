import type { Page } from "@playwright/test";

/**
 * The product collapses sidebar groups by default. Most behavior specs need
 * to reach a destination directly, so expand all groups after hydration.
 * The first clicks can fire before React attaches handlers, hence the retry.
 */
export async function expandSidebarGroups(page: Page) {
  await page.waitForFunction(
    () => document.querySelectorAll("[data-nav-group]").length > 0,
    undefined,
    { timeout: 10000 },
  );

  await page.evaluate(async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const groups = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-nav-group][aria-expanded="false"]',
        ),
      );
      if (groups.length === 0) return;
      for (const group of groups) group.click();
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  });
}
