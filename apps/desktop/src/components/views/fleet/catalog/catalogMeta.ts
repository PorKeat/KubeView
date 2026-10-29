import type { EnvTag } from "@/stores/catalogStore";

export type CatalogStatus = "healthy" | "degraded" | "offline" | "checking";

export const CATALOG_STATUS_ORDER: Record<CatalogStatus, number> = {
  healthy: 0,
  checking: 1,
  degraded: 2,
  offline: 3,
};

export function catalogStatusMeta(status: CatalogStatus) {
  switch (status) {
    case "healthy":
      return {
        label: "Connected",
        dot: "bg-emerald-500",
        text: "text-emerald-700 dark:text-emerald-400",
      };
    case "degraded":
      return {
        label: "Needs attention",
        dot: "bg-amber-500",
        text: "text-amber-700 dark:text-amber-400",
      };
    case "checking":
      return {
        label: "Connecting",
        dot: "bg-sky-500 animate-pulse",
        text: "text-sky-700 dark:text-sky-400",
      };
    default:
      return {
        label: "Offline",
        dot: "bg-rose-500",
        text: "text-rose-700 dark:text-rose-400",
      };
  }
}

export const ENV_META: Record<EnvTag, { label: string; badge: string }> = {
  prod: {
    label: "PROD",
    badge: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  staging: {
    label: "STAGING",
    badge:
      "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  dev: {
    label: "DEV",
    badge: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  other: {
    label: "OTHER",
    badge:
      "border-[var(--border)] bg-black/[0.04] text-[var(--muted)] dark:bg-white/[0.05]",
  },
};
