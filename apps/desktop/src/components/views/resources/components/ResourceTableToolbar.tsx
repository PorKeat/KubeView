"use client";

import * as React from "react";
import { Search, X, Server, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { PodSummary } from "@kubeview/contracts";

export interface ResourceTableToolbarProps {
  search: string;
  setSearch: (val: string) => void;
  resourceType: string;
  podNodeFilter: string | null;
  setPodNodeFilter: (node: string | null) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  pods: PodSummary[];
  currentNamespace: string;
  sortedItemsCount: number;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (interval: number) => void;
  handleRefresh: () => void;
  isPodsLoading: boolean;
}

export function ResourceTableToolbar({
  search,
  setSearch,
  resourceType,
  podNodeFilter,
  setPodNodeFilter,
  statusFilter,
  setStatusFilter,
  pods,
  currentNamespace,
  sortedItemsCount,
  autoRefreshInterval,
  setAutoRefreshInterval,
  handleRefresh,
  isPodsLoading,
}: ResourceTableToolbarProps) {
  const basePods = React.useMemo(() => {
    if (podNodeFilter) {
      return pods.filter(
        (p) => p.nodeName && p.nodeName.toLowerCase() === podNodeFilter.toLowerCase()
      );
    }
    return currentNamespace === "all"
      ? pods
      : pods.filter((p) => p.namespace === currentNamespace);
  }, [podNodeFilter, pods, currentNamespace]);

  const filterPills = React.useMemo(() => {
    return [
      { id: "all", label: "All", count: basePods.length },
      { id: "running", label: "Running", count: basePods.filter((p) => p.status === "Running").length },
      {
        id: "pending",
        label: "Pending",
        count: basePods.filter((p) => p.status === "Pending" || p.status === "ContainerCreating").length,
      },
      {
        id: "failing",
        label: "Failing",
        count: basePods.filter(
          (p) => !["Running", "Completed", "Pending", "Succeeded"].includes(p.status)
        ).length,
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
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Active Node Filter Pill */}
      {podNodeFilter && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 text-xs font-mono font-medium shrink-0 animate-in fade-in duration-150">
          <Server className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            Node: <strong className="text-[var(--foreground)]">{podNodeFilter}</strong>
          </span>
          <button
            type="button"
            onClick={() => setPodNodeFilter(null)}
            className="ml-1 p-0.5 hover:bg-[var(--accent)]/20 rounded-full transition-colors cursor-pointer"
            title="Clear node filter"
            aria-label="Clear node filter"
          >
            <X className="w-3 h-3" />
          </button>
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
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="resource-status-filter-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-md bg-white dark:bg-white/[0.12] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none"
                />
              )}
              <span>{pill.label}</span>
              <span className="text-[10px] text-[var(--muted)] font-mono tabular-nums">
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)] shrink-0">
        {/* Live Watch Stream Indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium"
          title="Real-time Kubernetes Watcher active (Zero polling load)"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>Live Stream</span>
        </div>

        {/* Auto Refresh Interval Dropdown */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-[var(--border)] bg-slate-100/70 dark:bg-black/20 text-[11px]">
          <span className="text-[var(--muted)] flex items-center gap-1 text-[10px]">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                autoRefreshInterval > 0 ? "bg-emerald-500" : "bg-[var(--muted)]/50"
              )}
            />
            <span>Auto:</span>
          </span>
          <select
            value={autoRefreshInterval}
            onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
            className="bg-transparent text-[var(--foreground)] font-mono text-[10px] outline-hidden cursor-pointer"
            title="Set automatic poll/refresh interval"
          >
            <option value={0} className="bg-[var(--surface)] text-[var(--foreground)]">
              Off
            </option>
            <option value={3000} className="bg-[var(--surface)] text-[var(--foreground)]">
              3s
            </option>
            <option value={5000} className="bg-[var(--surface)] text-[var(--foreground)]">
              5s
            </option>
            <option value={10000} className="bg-[var(--surface)] text-[var(--foreground)]">
              10s
            </option>
            <option value={30000} className="bg-[var(--surface)] text-[var(--foreground)]">
              30s
            </option>
          </select>
        </div>

        <span className="font-mono text-[11px]">{sortedItemsCount} items</span>
        <div className="h-3 w-[1px] bg-[var(--border)]" />
        <button
          onClick={handleRefresh}
          disabled={isPodsLoading}
          className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="Refresh list"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isPodsLoading && "animate-spin text-[var(--accent)]")}
          />
        </button>
      </div>
    </div>
  );
}
