"use client";

import { motion } from "motion/react";
import { Box, Database, Tag } from "lucide-react";
import type { StatefulSetSummary } from "@kubeview/contracts";
import { MetaItem, ReplicaTile } from "./rowPrimitives";

export function StatefulSetExpandedRow({
  item,
  desired,
  current,
  ready,
  updated,
  available,
  onViewPods,
}: {
  item: StatefulSetSummary;
  desired: number;
  current: number;
  ready: number;
  updated: number;
  available: number;
  onViewPods: () => void;
}) {
  const conditions = item.conditions ?? [];
  const selector = item.selector ?? {};
  const images = item.images ?? [];
  const labels = item.labels ?? {};

  return (
    <tr className="bg-[var(--surface-active)]/15 dark:bg-white/[0.012] border-b border-[var(--border)]">
      <td
        className="py-3 px-4 pl-10 pr-6"
        colSpan={11}
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
              <Database className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="font-semibold text-[var(--foreground)]">
                StatefulSet Details
              </span>
              {item.serviceName && (
                <span
                  title={item.serviceName}
                  className="inline-flex max-w-full min-w-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                >
                  <span className="shrink-0">Service:</span>
                  <span className="truncate max-w-[200px]">
                    {item.serviceName}
                  </span>
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
                {item.updateStrategy}
                {item.updateStrategy === "RollingUpdate" && item.partition > 0
                  ? ` · partition ${item.partition}`
                  : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={onViewPods}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <Box className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>View Pods</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <ReplicaTile label="Desired" value={desired} />
            <ReplicaTile
              label="Current"
              value={current}
              tone={current !== desired ? "warning" : "healthy"}
            />
            <ReplicaTile
              label="Ready"
              value={ready}
              tone={ready < desired ? "warning" : "healthy"}
            />
            <ReplicaTile
              label="Updated"
              value={updated}
              tone={updated < desired ? "warning" : "healthy"}
            />
            <ReplicaTile
              label="Available"
              value={available}
              tone={available < desired ? "warning" : "healthy"}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
            <MetaItem label="Service" value={item.serviceName || "none"} />
            <MetaItem label="Pod Management" value={item.podManagementPolicy} />
            <MetaItem label="Update Strategy" value={item.updateStrategy} />
            <MetaItem label="Partition" value={String(item.partition)} />
            <MetaItem
              label="Max Unavailable"
              value={item.maxUnavailable || "-"}
            />
            <MetaItem
              label="Current Revision"
              value={item.currentRevision || "-"}
            />
            <MetaItem
              label="Update Revision"
              value={item.updateRevision || "-"}
            />
            <MetaItem
              label="Revision History"
              value={String(item.revisionHistoryLimit)}
            />
            <MetaItem
              label="Min Ready Seconds"
              value={String(item.minReadySeconds)}
            />
            <MetaItem
              label="Ordinals Start"
              value={String(item.ordinalsStart)}
            />
            <MetaItem
              label="Observed Generation"
              value={`${item.observedGeneration}/${item.generation}`}
            />
            <MetaItem
              label="Collision Count"
              value={String(item.collisionCount)}
            />
            <MetaItem
              label="PVC Templates"
              value={
                item.volumeClaimTemplates.length > 0
                  ? item.volumeClaimTemplates.join(", ")
                  : "none"
              }
            />
            <MetaItem
              label="PVC Retain on Delete"
              value={item.persistentVolumeClaimRetentionWhenDeleted}
            />
            <MetaItem
              label="PVC Retain on Scale"
              value={item.persistentVolumeClaimRetentionWhenScaled}
            />
          </div>

          {item.updateStrategy === "OnDelete" && (
            <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
              OnDelete strategy: a rollout patches the pod template, but pods
              update only when you delete them.
            </div>
          )}
          {(item.persistentVolumeClaimRetentionWhenDeleted === "Delete" ||
            item.persistentVolumeClaimRetentionWhenScaled === "Delete") && (
            <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
              PVC retention policy deletes persistent volume claims when this
              StatefulSet is deleted or scaled down.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 pt-1">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1">
                Conditions
              </div>
              {conditions.length === 0 ? (
                <div className="text-[11px] text-[var(--muted)] italic py-1">
                  No StatefulSet conditions reported.
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
