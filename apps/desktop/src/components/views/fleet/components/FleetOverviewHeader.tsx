"use client";

import { RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { OverviewViewSwitch } from "../../overview/components/OverviewViewSwitch";

export interface FleetOverviewHeaderProps {
  configuredCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onManage: () => void;
}

export function FleetOverviewHeader({
  configuredCount,
  isRefreshing,
  onRefresh,
  onManage,
}: FleetOverviewHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-2.5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              All Clusters
            </h1>
            <span className="rounded border border-[var(--border)] bg-[var(--surface-active)] px-2 py-0.5 font-mono text-[10px] text-[var(--foreground)]">
              {configuredCount} configured
            </span>
            <span className="font-mono text-[10px] text-[var(--muted)]">
              All namespaces
            </span>
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            Compare health, node capacity, failing workloads, and alerts without
            switching contexts.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <OverviewViewSwitch active="fleet" />
          <button
            type="button"
            data-testid="fleet-manage-clusters"
            onClick={onManage}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <Settings className="h-3.5 w-3.5 text-[var(--muted)]" />
            <span className="hidden sm:inline">Manage</span>
          </button>
          <button
            type="button"
            data-testid="fleet-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#f08a42] to-[#e85d26] px-3 py-1 text-xs font-semibold text-zinc-950 shadow-xs transition-all hover:from-[#ff9d5c] hover:to-[#f08a42] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              className={cn("h-3 w-3", isRefreshing && "animate-spin")}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
