"use client";

import * as React from "react";
import {
  Search,
  X,
  Server,
  RefreshCw,
  AlertTriangle,
  Clock,
  Tag,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { PodSummary } from "@kubeview/contracts";
import {
  isPodFailing,
  isPodRunning,
  isPodPending,
} from "../lib/podIssues";

export interface ResourceTableToolbarProps {
  search: string;
  setSearch: (val: string) => void;
  resourceType: string;
  podNodeFilter: string | null;
  setPodNodeFilter: (node: string | null) => void;
  labelFilter?: string | null;
  setLabelFilter?: (label: string | null) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  pods: PodSummary[];
  currentNamespace: string;
  sortedItemsCount: number;
  autoRefreshInterval?: number;
  setAutoRefreshInterval?: (interval: number) => void;
  handleRefresh: () => void;
  isPodsLoading: boolean;
  density: "comfortable" | "compact";
  onToggleDensity: () => void;
}

export function ResourceTableToolbar({
  search,
  setSearch,
  resourceType,
  podNodeFilter,
  setPodNodeFilter,
  labelFilter,
  setLabelFilter,
  statusFilter,
  setStatusFilter,
  pods,
  currentNamespace,
  sortedItemsCount,
  autoRefreshInterval,
  setAutoRefreshInterval,
  handleRefresh,
  isPodsLoading,
  density,
  onToggleDensity,
}: ResourceTableToolbarProps) {
  const basePods = React.useMemo(() => {
    let list =
      currentNamespace === "all"
        ? pods
        : pods.filter(
            (p) =>
              p.namespace.toLowerCase() === currentNamespace.toLowerCase(),
          );

    if (podNodeFilter) {
      list = list.filter((p) => {
        if (!p.nodeName) return false;
        const pNode = p.nodeName.trim().toLowerCase();
        const fNode = podNodeFilter.trim().toLowerCase();
        return (
          pNode === fNode ||
          pNode.startsWith(fNode + ".") ||
          fNode.startsWith(pNode + ".")
        );
      });
    }

    if (labelFilter) {
      list = list.filter((p) => {
        if (!p.labels) return false;
        const [filterKey, filterVal] = labelFilter.includes("=")
          ? labelFilter.split("=")
          : [labelFilter, undefined];
        const actualVal = p.labels[filterKey.trim()];
        if (actualVal === undefined) return false;
        if (
          filterVal !== undefined &&
          actualVal.trim() !== filterVal.trim()
        ) {
          return false;
        }
        return true;
      });
    }

    return list;
  }, [podNodeFilter, labelFilter, pods, currentNamespace]);

  const filterPills = React.useMemo(() => {
    const failingCount = basePods.filter((p) => isPodFailing(p)).length;
    const runningCount = basePods.filter((p) => isPodRunning(p)).length;
    const pendingCount = basePods.filter((p) => isPodPending(p)).length;

    return [
      { id: "all", label: "All", count: basePods.length },
      {
        id: "running",
        label: "Running",
        count: runningCount,
      },
      {
        id: "pending",
        label: "Pending",
        count: pendingCount,
        hasPending: pendingCount > 0,
      },
      {
        id: "failing",
        label: "Failing",
        count: failingCount,
        hasWarning: failingCount > 0,
      },
    ];
  }, [basePods]);

  return (
    <div className="h-11 border-b border-[var(--border)] px-3 flex items-center justify-between shrink-0 glass-panel gap-3">
      {/* Left: Search Bar */}
      <div className="relative flex-1 max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            podNodeFilter
              ? `Filter pods on ${podNodeFilter}...`
              : `Filter ${resourceType.toLowerCase()} by name, node, IP...`
          }
          className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-black/30 border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)] transition-all font-mono"
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

      {/* Active Node Filter Pill */}
      {podNodeFilter && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 text-xs font-mono font-medium shrink-0 animate-in fade-in duration-150">
          <Server className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            Node:{" "}
            <strong className="text-[var(--foreground)]">
              {podNodeFilter}
            </strong>
          </span>
          <Tooltip content="Clear node filter">
            <button
              type="button"
              onClick={() => setPodNodeFilter(null)}
              className="ml-1 p-0.5 hover:bg-[var(--accent)]/20 rounded-full transition-colors cursor-pointer"
              aria-label="Clear node filter"
            >
              <X className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Active Label Filter Pill */}
      {labelFilter && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30 text-xs font-mono font-medium shrink-0 animate-in fade-in duration-150">
          <Tag className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            Label:{" "}
            <strong className="text-[var(--foreground)] dark:text-white">
              {labelFilter}
            </strong>
          </span>
          <Tooltip content="Clear label filter">
            <button
              type="button"
              onClick={() => setLabelFilter && setLabelFilter(null)}
              className="ml-1 p-0.5 hover:bg-indigo-500/20 rounded-full transition-colors cursor-pointer"
              aria-label="Clear label filter"
            >
              <X className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Center: Status Filter Pills */}
      <div className="relative flex items-center gap-1 bg-slate-100/80 dark:bg-black/30 p-0.5 rounded-lg border border-[var(--border)] text-xs select-none">
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
                  layoutId="resource-status-filter-pill"
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
              <span>{pill.label}</span>
              <span
                className={cn(
                  "text-[10px] font-mono tabular-nums",
                  pill.hasWarning && pill.count > 0 && "text-rose-500 font-semibold",
                  pill.hasPending && pill.count > 0 && "text-amber-500 font-medium",
                  !pill.hasWarning && !pill.hasPending && "text-[var(--muted)]",
                )}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)] shrink-0">
        <span className="font-mono text-[11px]">{sortedItemsCount} items</span>
        <div className="h-3 w-[1px] bg-[var(--border)]" />
        <Tooltip content="Refresh list">
          <button
            onClick={handleRefresh}
            disabled={isPodsLoading}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            aria-label="Refresh list"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5",
                isPodsLoading && "animate-spin text-[var(--accent)]",
              )}
            />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
