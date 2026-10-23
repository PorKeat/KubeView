"use client";

import * as React from "react";
import { Calendar, Clock } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import { JobListView } from "./JobListView";
import { CronJobListView } from "./CronJobListView";

export function JobsCronJobsListView() {
  const { jobsViewMode, setJobsViewMode, totalJobsCount, totalCronJobsCount, loadJobs, loadCronJobs, currentContext, currentNamespace } = useClusterStore();

  React.useEffect(() => {
    if (!currentContext) return;
    loadJobs(currentNamespace);
    loadCronJobs(currentNamespace);
  }, [currentContext, currentNamespace, loadJobs, loadCronJobs]);

  const handleSelectMode = (mode: "jobs" | "cronjobs") => {
    setJobsViewMode(mode);
    if (mode === "jobs") loadJobs(currentNamespace);
    else loadCronJobs(currentNamespace);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <div className="h-11 border-b border-[var(--border)] px-3 flex items-center justify-between shrink-0 bg-[var(--surface)] gap-3">
        <div className="relative flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] border border-[var(--border)] text-xs">
          <button type="button" data-testid="jobs-view-tab" onClick={() => handleSelectMode("jobs")} className={cn("relative px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]", jobsViewMode === "jobs" ? "text-[var(--foreground)] font-semibold" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
            {jobsViewMode === "jobs" && <motion.span layoutId="jobs-resource-tab" className="absolute inset-0 rounded-md bg-[var(--surface-elevated)] dark:bg-white/10 shadow-xs border border-[var(--border)] -z-10" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
            <Clock className="w-3.5 h-3.5" /><span>Jobs</span><span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/5 text-[var(--muted)]">{totalJobsCount}</span>
          </button>
          <button type="button" data-testid="cronjobs-view-tab" onClick={() => handleSelectMode("cronjobs")} className={cn("relative px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]", jobsViewMode === "cronjobs" ? "text-[var(--foreground)] font-semibold" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
            {jobsViewMode === "cronjobs" && <motion.span layoutId="jobs-resource-tab" className="absolute inset-0 rounded-md bg-[var(--surface-elevated)] dark:bg-white/10 shadow-xs border border-[var(--border)] -z-10" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
            <Calendar className="w-3.5 h-3.5" /><span>CronJobs</span><span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/5 text-[var(--muted)]">{totalCronJobsCount}</span>
          </button>
        </div>
        <span className="text-[11px] text-[var(--muted)] font-mono hidden sm:block">Run-to-completion and scheduled workloads</span>
      </div>
      {jobsViewMode === "jobs" ? <JobListView /> : <CronJobListView />}
    </div>
  );
}
