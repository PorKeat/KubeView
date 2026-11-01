"use client";

import * as React from "react";
import { isTauri } from "@/lib/ipc";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUpdateStore } from "@/stores/updateStore";

const FIRST_CHECK_DELAY_MS = 4_000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Schedules background update checks and leaves the alerting/install UI to the
 * banner and Settings → About & Updates.
 */
export function UpdateChecker() {
  const autoCheckUpdates = useSettingsStore((state) => state.autoCheckUpdates);

  React.useEffect(() => {
    if (!isTauri()) {
      useUpdateStore.setState({ phase: "unsupported" });
      return;
    }
    if (!autoCheckUpdates) return;
    // Development builds talk to the production update channel; only check in
    // packaged production builds.
    if (process.env.NODE_ENV !== "production") return;

    const firstCheck = window.setTimeout(() => {
      void useUpdateStore.getState().checkForUpdates(false);
    }, FIRST_CHECK_DELAY_MS);
    const interval = window.setInterval(() => {
      void useUpdateStore.getState().checkForUpdates(false);
    }, CHECK_INTERVAL_MS);

    return () => {
      window.clearTimeout(firstCheck);
      window.clearInterval(interval);
    };
  }, [autoCheckUpdates]);

  return null;
}
