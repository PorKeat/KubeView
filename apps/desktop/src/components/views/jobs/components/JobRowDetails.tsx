"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Box, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobSummary } from "@kubeview/contracts";

export interface JobRowDetailsProps {
  item: JobSummary;
  onViewPods: (job: JobSummary) => void;
}

export function JobRowDetails({ item, onViewPods }: JobRowDetailsProps) {
  const conditions = item.conditions ?? [];
  const selector = item.selector ?? {};
  const images = item.images ?? [];
  const labels = item.labels ?? {};

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
              <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="font-semibold text-[var(--foreground)]">
                Job Details
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
                {item.completionMode} · {item.suspend ? "suspended" : "active"}
              </span>
              {item.ownerCronJob && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <span>CronJob:</span>
                  <span className="truncate max-w-[160px]">
                    {item.ownerCronJob}
                  </span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onViewPods(item)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <Box className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>View Pods</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ReplicaTile
              label="Desired completions"
              value={item.desiredCompletions}
            />
            <ReplicaTile
              label="Active"
              value={item.active}
              tone={item.active > 0 ? "warning" : "muted"}
            />
            <ReplicaTile label="Succeeded" value={item.succeeded} />
            <ReplicaTile
              label="Failed"
              value={item.failed}
              tone={item.failed > 0 ? "critical" : "muted"}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
            <MetaItem label="Completions" value={item.completions} />
            <MetaItem label="Parallelism" value={String(item.parallelism)} />
            <MetaItem label="Backoff Limit" value={String(item.backoffLimit)} />
            <MetaItem
              label="Active Deadline"
              value={
                item.activeDeadlineSeconds > 0
                  ? `${item.activeDeadlineSeconds}s`
                  : "-"
              }
            />
            <MetaItem
              label="TTL After Finished"
              value={
                item.ttlSecondsAfterFinished > 0
                  ? `${item.ttlSecondsAfterFinished}s`
                  : "-"
              }
            />
            <MetaItem label="Completion Mode" value={item.completionMode} />
            <MetaItem label="Start Time" value={item.startTime || "-"} />
            <MetaItem
              label="Completion Time"
              value={item.completionTime || "-"}
            />
            <MetaItem
              label="Owner CronJob"
              value={item.ownerCronJob || "none"}
            />
          </div>
          {item.suspend && (
            <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
              This Job is suspended. No new pods are created until it is
              resumed.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 pt-1">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1">
                Conditions
              </div>
              {conditions.length === 0 ? (
                <div className="text-[11px] text-[var(--muted)] italic py-1">
                  No Job conditions reported.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]/40">
                  {conditions.map((condition) => (
                    <div
                      key={`${condition.type}-${condition.reason}`}
                      className="py-1.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-semibold text-[var(--foreground)]">
                          {condition.type}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
                          {condition.status}
                        </span>
                      </div>
                      {condition.reason && (
                        <div className="text-[10px] font-mono text-[var(--muted)] mt-0.5">
                          {condition.reason}
                        </div>
                      )}
                      {condition.message && (
                        <div className="text-[10px] text-[var(--muted)] mt-0.5 leading-relaxed line-clamp-2">
                          {condition.message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 opacity-60" /> Selector
                </div>
                {Object.keys(selector).length === 0 ? (
                  <div className="text-[11px] text-[var(--muted)] italic">
                    No label selector.
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Object.entries(selector).map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                      >
                        <span>{key}</span>
                        <span className="opacity-40">=</span>
                        <span className="text-[var(--foreground)] font-medium truncate max-w-[140px]">
                          {value}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
              {Object.keys(labels).length > 0 && (
                <div>
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
                </div>
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
