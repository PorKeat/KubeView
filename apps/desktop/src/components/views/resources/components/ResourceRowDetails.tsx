"use client";

import * as React from "react";
import { motion } from "motion/react";
import { FileText, Terminal, Copy, Layers, Tag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PodSummary } from "@kubeview/contracts";

export interface ResourceRowDetailsProps {
  item: PodSummary;
  onLogsClick: (item: PodSummary, containerName?: string) => void;
  onExecClick: (item: PodSummary, containerName?: string) => void;
  onFilterLabel?: (label: string) => void;
}

export function ResourceRowDetails({
  item,
  onLogsClick,
  onExecClick,
  onFilterLabel,
}: ResourceRowDetailsProps) {
  return (
    <tr className="bg-[var(--surface-active)]/15 dark:bg-white/[0.012] border-b border-[var(--border)]">
      <td
        colSpan={12}
        className="py-3 px-4 pl-10 pr-6"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-2.5"
        >
          {/* Top Header: Meta and Labels */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border)]/60 text-xs">
            <div className="flex items-center gap-2.5">
              <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="font-semibold text-[var(--foreground)]">
                Containers &amp; Sidecars ({item.containers?.length || 0})
              </span>
              {item.controlledBy && (
                <span className="text-[11px] text-[var(--muted)] font-mono">
                  Controlled by:{" "}
                  <strong className="text-[var(--foreground)] font-medium">
                    {item.controlledBy}
                  </strong>
                </span>
              )}
              {item.qosClass && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
                  QoS: {item.qosClass}
                </span>
              )}
            </div>

            {/* Labels: Sleek neutral pills */}
            {item.labels && Object.keys(item.labels).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 max-w-xl">
                <span className="text-[10px] font-medium text-[var(--muted)] flex items-center gap-1">
                  <Tag className="w-3 h-3 opacity-60" /> Labels:
                </span>
                {Object.entries(item.labels)
                  .slice(0, 8)
                  .map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() =>
                        onFilterLabel && onFilterLabel(`${k}=${v}`)
                      }
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
                      title={`Filter pods by label ${k}=${v}`}
                    >
                      <span className="text-[var(--muted)]">{k}</span>
                      <span className="opacity-40">=</span>
                      <span className="text-[var(--foreground)] font-medium truncate max-w-[140px]">
                        {v}
                      </span>
                    </button>
                  ))}
                {Object.keys(item.labels).length > 8 && (
                  <span className="text-[10px] text-[var(--muted)] font-mono">
                    +{Object.keys(item.labels).length - 8} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Containers Flat List (No nested card boxes, no dots) */}
          <div className="divide-y divide-[var(--border)]/50">
            {!item.containers || item.containers.length === 0 ? (
              <div className="text-xs text-[var(--muted)] italic py-2">
                No container telemetry available for this pod.
              </div>
            ) : (
              item.containers.map((c) => {
                const isReady = c.ready;
                const stateStr = c.state || (isReady ? "Running" : "Pending");
                return (
                  <div
                    key={c.name}
                    className="flex flex-wrap items-center justify-between gap-3 py-2 px-1 rounded hover:bg-black/[0.02] dark:hover:bg-white/[0.02] text-xs transition-colors group/c"
                  >
                    {/* Left: Container Identity & Status (No status dot) */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[var(--foreground)] truncate">
                            {c.name}
                          </span>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold",
                              isReady
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                            )}
                          >
                            {c.stateReason || stateStr}
                          </span>
                          {c.restartCount > 0 && (
                            <span className="text-[10px] font-mono text-amber-500 font-medium">
                              {c.restartCount} restart
                              {c.restartCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--muted)] font-mono truncate max-w-xl">
                          <span className="truncate" title={c.image}>
                            {c.image}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Center: Ports if present */}
                    <div className="flex items-center gap-2">
                      {c.ports && c.ports.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {c.ports.map((p, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                              title={
                                p.name
                                  ? `${p.name}: ${p.containerPort}/${p.protocol || "TCP"}`
                                  : `${p.containerPort}/${p.protocol || "TCP"}`
                              }
                            >
                              {p.containerPort}/{p.protocol || "TCP"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Container-specific Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onLogsClick(item, c.name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors cursor-pointer"
                        title={`View logs for container '${c.name}'`}
                      >
                        <FileText className="w-3 h-3 text-[var(--muted)]" />
                        <span>Logs</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onExecClick(item, c.name)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors cursor-pointer"
                        title={`Exec shell in container '${c.name}'`}
                      >
                        <Terminal className="w-3 h-3 text-[var(--muted)]" />
                        <span>Exec</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const cmd = `kubectl logs ${item.name} -c ${c.name} -n ${item.namespace} -f`;
                          navigator.clipboard.writeText(cmd);
                          toast.success(`Copied container logs command`);
                        }}
                        className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Copy kubectl logs CLI command for this container"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </td>
    </tr>
  );
}
