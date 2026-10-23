"use client";

import * as React from "react";
import { Search, X, RefreshCw, AlertTriangle, Clock, MinusCircle } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { ReplicaSetSummary } from "@kubeview/contracts";
import {
  isReplicaSetDegraded,
  isReplicaSetHealthy,
  isReplicaSetProgressing,
  isReplicaSetScaledDown,
  type ReplicaSetStatusFilter,
} from "../lib/replicaSetStatus";

export interface ReplicaSetTableToolbarProps {
  search: string;
  setSearch: (val: string) => void;
  replicaSets: ReplicaSetSummary[];
  currentNamespace: string;
  statusFilter: ReplicaSetStatusFilter;
  setStatusFilter: (status: ReplicaSetStatusFilter) => void;
  sortedItemsCount: number;
  handleRefresh: () => void;
  isLoading: boolean;
}

export function ReplicaSetTableToolbar({
  search,
  setSearch,
  replicaSets,
  currentNamespace,
  statusFilter,
  setStatusFilter,
  sortedItemsCount,
  handleRefresh,
  isLoading,
}: ReplicaSetTableToolbarProps) {
  const baseReplicaSets = React.useMemo(() => {
    if (currentNamespace === "all") return replicaSets;
    return replicaSets.filter(
      (replicaSet) =>
        replicaSet.namespace.toLowerCase() === currentNamespace.toLowerCase(),
    );
  }, [replicaSets, currentNamespace]);

  const filterPills = React.useMemo(
    () => [
      { id: "all" as const, label: "All", count: baseReplicaSets.length },
      {
        id: "healthy" as const,
        label: "Healthy",
        count: baseReplicaSets.filter(isReplicaSetHealthy).length,
      },
      {
        id: "progressing" as const,
        label: "Progressing",
        count: baseReplicaSets.filter(isReplicaSetProgressing).length,
        hasPending: baseReplicaSets.some(isReplicaSetProgressing),
      },
      {
        id: "degraded" as const,
        label: "Degraded",
        count: baseReplicaSets.filter(isReplicaSetDegraded).length,
        hasWarning: baseReplicaSets.some(isReplicaSetDegraded),
      },
      {
        id: "scaleddown" as const,
        label: "Scaled Down",
        count: baseReplicaSets.filter(isReplicaSetScaledDown).length,
        hasScaledDown: baseReplicaSets.some(isReplicaSetScaledDown),
      },
    ],
    [baseReplicaSets],
  );

  return (
    <div className="min-h-11 border-b border-[var(--border)] px-2 sm:px-3 py-1.5 flex flex-wrap lg:flex-nowrap items-center justify-between shrink-0 glass-panel gap-2 sm:gap-3">
      <div className="relative flex-1 min-w-0 w-full max-w-sm order-1 sm:order-none sm:w-auto">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter replicasets by name, owner, image, selector..."
          className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-black/30 border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)] transition-all font-mono"
          aria-label="Filter replicasets"
        />
        {search && (
          <Tooltip content="Clear search">
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="relative flex max-w-full min-w-0 shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap rounded-lg border border-[var(--border)] bg-slate-100/80 p-0.5 text-xs select-none order-2 sm:order-none dark:bg-black/30">
        {filterPills.map((pill) => {
          const isActive = statusFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={cn(
                "relative z-10 px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                isActive
                  ? "text-[var(--foreground)] dark:text-white font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="replicaset-status-filter-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-md bg-white dark:bg-white/[0.12] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none"
                />
              )}
              {pill.hasWarning && (
                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
              )}
              {pill.hasPending && (
                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              )}
              {pill.hasScaledDown && (
                <MinusCircle className="w-3 h-3 text-[var(--muted)] shrink-0" />
              )}
              <span>{pill.label}</span>
              <span
                className={cn(
                  "text-[10px] font-mono tabular-nums",
                  pill.hasWarning && pill.count > 0 && "text-rose-500 font-semibold",
                  ((pill.hasPending || pill.hasScaledDown) && pill.count > 0) &&
                    "text-amber-500 font-medium",
                  !pill.hasWarning &&
                    !pill.hasPending &&
                    !pill.hasScaledDown &&
                    "text-[var(--muted)]",
                )}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex max-w-full flex-wrap items-center gap-2 text-xs text-[var(--muted)] shrink-0 order-3 sm:order-none">
        <span className="font-mono text-[11px]">{sortedItemsCount} items</span>
        <div className="h-3 w-[1px] bg-[var(--border)]" />
        <Tooltip content="Refresh replicasets">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            aria-label="Refresh replicasets"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5",
                isLoading && "animate-spin text-[var(--accent)]",
              )}
            />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
