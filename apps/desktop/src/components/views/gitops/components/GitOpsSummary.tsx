"use client";

import type { GitOpsDriftReport } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";

export function GitOpsSummary({ report }: { report: GitOpsDriftReport }) {
  const items = [
    { label: "Manifests", value: report.total, variant: "muted" as const },
    { label: "In sync", value: report.clean, variant: "healthy" as const },
    { label: "Changed", value: report.changed, variant: "warning" as const },
    { label: "Missing", value: report.missing, variant: "critical" as const },
    { label: "Errors", value: report.errors, variant: "offline" as const },
  ];

  return (
    <div
      data-testid="gitops-summary"
      className="grid grid-cols-2 gap-2 sm:grid-cols-5"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-xs"
        >
          <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
            {item.label}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-lg font-semibold tabular-nums text-[var(--foreground)]">
              {item.value}
            </span>
            <StatusBeacon size="xs" variant={item.variant} label={item.label} />
          </div>
        </div>
      ))}
    </div>
  );
}
