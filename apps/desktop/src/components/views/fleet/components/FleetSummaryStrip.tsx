"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  Server,
} from "lucide-react";
import type { FleetOverviewTotals } from "@kubeview/contracts";
import { cn } from "@/lib/utils";

function SummaryTile({
  icon: Icon,
  label,
  value,
  detail,
  warning,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs">
      <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-[var(--muted)]">
        <Icon
          className={cn(
            "h-3 w-3 shrink-0",
            warning ? "text-amber-500" : "text-[var(--accent)]",
          )}
          aria-hidden="true"
        />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate font-mono text-lg font-semibold tabular-nums tracking-tight text-[var(--foreground)]">
        {value}
      </div>
      <div className="truncate text-[10px] text-[var(--muted)]">{detail}</div>
    </div>
  );
}

export function FleetSummaryStrip({
  totals,
  hasSnapshot,
}: {
  totals: FleetOverviewTotals;
  hasSnapshot: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
      <SummaryTile
        icon={Server}
        label="Clusters"
        value={hasSnapshot ? `${totals.healthy}/${totals.total}` : "—"}
        detail={
          hasSnapshot
            ? `${totals.offline} offline · ${totals.degraded} attention`
            : "Loading cluster data"
        }
      />
      <SummaryTile
        icon={CheckCircle2}
        label="Nodes ready"
        value={hasSnapshot ? `${totals.readyNodes}/${totals.totalNodes}` : "—"}
        detail={
          hasSnapshot
            ? totals.totalNodes > 0
              ? `${Math.round((totals.readyNodes / totals.totalNodes) * 100)}% ready`
              : "No nodes reported"
            : "Waiting for snapshots"
        }
      />
      <SummaryTile
        icon={Box}
        label="Pods running"
        value={hasSnapshot ? `${totals.runningPods}/${totals.totalPods}` : "—"}
        detail={
          hasSnapshot ? `${totals.failedPods} failed` : "Waiting for snapshots"
        }
        warning={hasSnapshot && totals.failedPods > 0}
      />
      <SummaryTile
        icon={Activity}
        label="Workloads"
        value={hasSnapshot ? String(totals.degradedWorkloads) : "—"}
        detail={hasSnapshot ? "degraded controllers" : "Waiting for snapshots"}
        warning={hasSnapshot && totals.degradedWorkloads > 0}
      />
      <SummaryTile
        icon={AlertTriangle}
        label="Warnings"
        value={hasSnapshot ? String(totals.warningCount) : "—"}
        detail={hasSnapshot ? "recent cluster events" : "Waiting for snapshots"}
        warning={hasSnapshot && totals.warningCount > 0}
      />
    </div>
  );
}
