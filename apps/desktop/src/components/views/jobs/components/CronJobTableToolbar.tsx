"use client";

import * as React from "react";
import { Search, X, RefreshCw, PauseCircle, Clock, Radio } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { CronJobSummary } from "@kubeview/contracts";
import { isCronJobActive, isCronJobIdle, isCronJobSuspended, type CronJobStatusFilter } from "../lib/cronJobStatus";

export function CronJobTableToolbar({ search, setSearch, cronJobs, currentNamespace, statusFilter, setStatusFilter, sortedItemsCount, handleRefresh, isLoading }: {
  search: string; setSearch: (value: string) => void; cronJobs: CronJobSummary[]; currentNamespace: string;
  statusFilter: CronJobStatusFilter; setStatusFilter: (value: CronJobStatusFilter) => void;
  sortedItemsCount: number; handleRefresh: () => void; isLoading: boolean;
}) {
  const base = React.useMemo(() => currentNamespace === "all" ? cronJobs : cronJobs.filter((cj) => cj.namespace.toLowerCase() === currentNamespace.toLowerCase()), [cronJobs, currentNamespace]);
  const pills = React.useMemo(() => [
    { id: "all" as const, label: "All", count: base.length },
    { id: "active" as const, label: "Active", count: base.filter(isCronJobActive).length, hasActive: base.some(isCronJobActive) },
    { id: "idle" as const, label: "Idle", count: base.filter(isCronJobIdle).length },
    { id: "suspended" as const, label: "Suspended", count: base.filter(isCronJobSuspended).length, hasSuspended: base.some(isCronJobSuspended) },
  ], [base]);

  return (
    <div className="min-h-11 border-b border-[var(--border)] px-2 sm:px-3 py-1.5 flex flex-wrap lg:flex-nowrap items-center justify-between shrink-0 glass-panel gap-2 sm:gap-3">
      <div className="relative flex-1 min-w-0 w-full max-w-sm order-1 sm:order-none sm:w-auto">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter cronjobs by name, schedule, timezone..." className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-black/30 border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)] transition-all font-mono" aria-label="Filter cronjobs" />
        {search && <Tooltip content="Clear search"><button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer" aria-label="Clear search"><X className="w-3 h-3" /></button></Tooltip>}
      </div>
      <div className="relative flex max-w-full min-w-0 shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap rounded-lg border border-[var(--border)] bg-slate-100/80 p-0.5 text-xs select-none order-2 sm:order-none dark:bg-black/30">
        {pills.map((pill) => {
          const active = statusFilter === pill.id;
          return <button key={pill.id} onClick={() => setStatusFilter(pill.id)} className={cn("relative z-10 px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]", active ? "text-[var(--foreground)] dark:text-white font-semibold" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
            {active && <motion.div layoutId="cronjob-status-filter-pill" transition={{ type: "spring", stiffness: 450, damping: 35 }} className="absolute inset-0 rounded-md bg-white dark:bg-white/[0.12] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none" />}
            {pill.hasActive && <Radio className="w-3 h-3 text-emerald-500 shrink-0" />}
            {pill.hasSuspended && <PauseCircle className="w-3 h-3 text-[var(--muted)] shrink-0" />}
            {pill.id === "idle" && <Clock className="w-3 h-3 text-[var(--muted)] shrink-0" />}
            <span>{pill.label}</span><span className={cn("text-[10px] font-mono tabular-nums", pill.hasSuspended && pill.count > 0 && "text-amber-500 font-medium", !pill.hasSuspended && "text-[var(--muted)]")}>{pill.count}</span>
          </button>;
        })}
      </div>
      <div className="flex max-w-full flex-wrap items-center gap-2 text-xs text-[var(--muted)] shrink-0 order-3 sm:order-none"><span className="font-mono text-[11px]">{sortedItemsCount} items</span><div className="h-3 w-[1px] bg-[var(--border)]" /><Tooltip content="Refresh cronjobs"><button onClick={handleRefresh} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer" aria-label="Refresh cronjobs"><RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-[var(--accent)]")} /></button></Tooltip></div>
    </div>
  );
}
