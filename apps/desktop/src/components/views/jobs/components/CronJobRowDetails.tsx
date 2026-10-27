"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Box, Calendar, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import type { CronJobSummary } from "@kubeview/contracts";

export interface CronJobRowDetailsProps {
  item: CronJobSummary;
  onViewJobs: (cronJob: CronJobSummary) => void;
}

export function CronJobRowDetails({
  item,
  onViewJobs,
}: CronJobRowDetailsProps) {
  const openWorkloadAction = useClusterStore(
    (state) => state.openWorkloadAction,
  );
  const labels = item.labels ?? {};
  const images = item.images ?? [];

  const handleTrigger = () => {
    openWorkloadAction({
      kind: "CronJob",
      action: "trigger",
      name: item.name,
      namespace: item.namespace,
      schedule: item.schedule,
      suspend: item.suspend,
      concurrencyPolicy: item.concurrencyPolicy,
    });
  };

  return (
    <tr className="bg-[var(--surface-active)]/15 dark:bg-white/[0.012] border-b border-[var(--border)]">
      <td
        className="py-3 px-4 pl-10 pr-6"
        colSpan={9}
        onClick={(event) => event.stopPropagation()}
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border)]/60 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="font-semibold text-[var(--foreground)]">
                CronJob Details
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
                {item.schedule}
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-mono border",
                  item.suspend
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                )}
              >
                {item.suspend ? "Suspended" : "Scheduling"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onViewJobs(item)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <Box className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>View Jobs</span>
              </button>
              <button
                type="button"
                onClick={handleTrigger}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Trigger Now</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ReplicaTile
              label="Active Jobs"
              value={item.activeJobs}
              tone={item.activeJobs > 0 ? "healthy" : "muted"}
            />
            <ReplicaTile
              label="Successful History"
              value={item.successfulJobHistoryLimit}
            />
            <ReplicaTile
              label="Failed History"
              value={item.failedJobHistoryLimit}
            />
            <ReplicaTile label="Parallelism" value={item.parallelism ?? 1} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
            <MetaItem label="Schedule" value={item.schedule} />
            <MetaItem
              label="Time Zone"
              value={item.timeZone || "controller default"}
            />
            <MetaItem
              label="Concurrency Policy"
              value={item.concurrencyPolicy}
            />
            <MetaItem
              label="Starting Deadline"
              value={
                item.startingDeadlineSeconds > 0
                  ? `${item.startingDeadlineSeconds}s`
                  : "-"
              }
            />
            <MetaItem
              label="Last Schedule"
              value={
                item.lastScheduleTime
                  ? new Date(item.lastScheduleTime).toLocaleString()
                  : "-"
              }
            />
            <MetaItem
              label="Last Success"
              value={
                item.lastSuccessfulTime
                  ? new Date(item.lastSuccessfulTime).toLocaleString()
                  : "-"
              }
            />
            <MetaItem
              label="Job Completions"
              value={
                item.completions !== undefined
                  ? String(item.completions)
                  : "not set"
              }
            />
            <MetaItem
              label="Job Parallelism"
              value={
                item.parallelism !== undefined
                  ? String(item.parallelism)
                  : "not set"
              }
            />
            <MetaItem
              label="Job Backoff Limit"
              value={
                item.backoffLimit !== undefined
                  ? String(item.backoffLimit)
                  : "not set"
              }
            />
            <MetaItem
              label="Job Active Deadline"
              value={
                item.activeDeadlineSeconds !== undefined
                  ? `${item.activeDeadlineSeconds}s`
                  : "not set"
              }
            />
            <MetaItem
              label="Job TTL"
              value={
                item.ttlSecondsAfterFinished !== undefined
                  ? `${item.ttlSecondsAfterFinished}s`
                  : "not set"
              }
            />
            <MetaItem label="Suspended" value={item.suspend ? "Yes" : "No"} />
          </div>
          {item.suspend && (
            <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
              This CronJob is suspended. No new Jobs are created; already
              running Jobs continue.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 pt-1">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1 flex items-center gap-1">
                <Box className="w-3 h-3 opacity-60" /> Images
              </div>
              {images.length === 0 ? (
                <div className="text-[11px] text-[var(--muted)] italic">
                  No container images.
                </div>
              ) : (
                <div className="space-y-1">
                  {images.map((image) => (
                    <div
                      key={image}
                      className="text-[11px] font-mono text-[var(--foreground)] bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]/70 rounded-md px-2 py-1 truncate"
                      title={image}
                    >
                      {image}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              {Object.keys(labels).length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1">
                    Labels
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Object.entries(labels)
                      .slice(0, 8)
                      .map(([key, value]) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                        >
                          <span>{key}</span>
                          <span className="opacity-40">=</span>
                          <span className="text-[var(--foreground)] font-medium truncate max-w-[120px]">
                            {value}
                          </span>
                        </span>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </td>
    </tr>
  );
}

function ReplicaTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "healthy" | "warning" | "critical" | "muted";
}) {
  return (
    <div className="rounded-lg border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">
        {label}
      </div>
      <div
        className={cn(
          "text-sm font-mono font-semibold tabular-nums mt-0.5",
          tone === "healthy" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-500",
          tone === "critical" && "text-rose-500",
          tone === "muted" && "text-[var(--muted)]",
          tone === "default" && "text-[var(--foreground)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold block">
        {label}
      </span>
      <span
        className="font-mono text-[10px] text-[var(--foreground)] truncate block mt-0.5"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
