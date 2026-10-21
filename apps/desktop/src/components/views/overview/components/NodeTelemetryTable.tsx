"use client";

import * as React from "react";
import { cleanAlloc } from "../types";
import { cn } from "@/lib/utils";
import type { NodeSummary } from "@kubeview/contracts";

export interface NodeTelemetryTableProps {
  nodes: NodeSummary[];
  selectedNode: string | null;
  isNamespaceScoped: boolean;
  currentNamespace: string;
  nodeScopedPodCounts: Record<string, number>;
  onInspectNode: (node: NodeSummary) => void;
  onFilterPodsForNode: (nodeName: string) => void;
}

export function NodeTelemetryTable({
  nodes,
  selectedNode,
  isNamespaceScoped,
  currentNamespace,
  nodeScopedPodCounts,
  onInspectNode,
  onFilterPodsForNode,
}: NodeTelemetryTableProps) {
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]/40 text-[11px] text-[var(--muted)]">
              <th className="py-2.5 px-3.5 font-medium">Node</th>
              <th className="py-2.5 px-3 font-medium">Status</th>
              <th className="py-2.5 px-3 font-medium">Roles</th>
              <th className="py-2.5 px-3 font-medium">Internal IP</th>
              <th className="py-2.5 px-3 font-medium text-right">CPU Live</th>
              <th className="py-2.5 px-3 font-medium text-right">CPU Req</th>
              <th className="py-2.5 px-3 font-medium text-right">RAM Live</th>
              <th className="py-2.5 px-3 font-medium text-right">RAM Req</th>
              <th className="py-2.5 px-3 font-medium text-right">
                {isNamespaceScoped ? `Pods (${currentNamespace})` : "Pods"}
              </th>
              <th className="py-2.5 px-3 font-medium">Version</th>
              <th className="py-2.5 px-3.5 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]/60">
            {nodes.map((n) => {
              const isSelected = selectedNode === n.name;
              const isNodeReady = n.status === "Ready";
              const scopedNodePods = nodeScopedPodCounts[n.name] ?? (isNamespaceScoped ? 0 : n.activePods);

              return (
                <tr
                  key={n.name}
                  onClick={() => onInspectNode(n)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onInspectNode(n);
                    }
                  }}
                  className={cn(
                    "hover:bg-[var(--surface-hover)] transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                    isSelected && "bg-[var(--surface-hover)] font-semibold"
                  )}
                >
                  <td className="py-3 px-3.5">
                    <span className="font-bold text-[var(--foreground)]">{n.name}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[11px] font-medium font-mono",
                        isNodeReady
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      )}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[var(--muted)]">
                    {n.roles.join(", ") || "worker"}
                  </td>
                  <td className="py-3 px-3 text-[var(--foreground)]">{n.internalIP}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {n.cpuUsage ? `${n.cpuUsage} (${n.cpuUsagePercent ?? 0}%)` : "-"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="tabular-nums text-[var(--foreground)] font-medium">
                      {cleanAlloc(n.cpuAllocated)} ({n.cpuPercent}%)
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {n.memoryUsage ? `${n.memoryUsage} (${n.memoryUsagePercent ?? 0}%)` : "-"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="tabular-nums text-[var(--foreground)] font-medium">
                      {cleanAlloc(n.memoryAllocated)} ({n.memoryPercent}%)
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFilterPodsForNode(n.name);
                      }}
                      title={`Filter Pods view to ${n.name}${isNamespaceScoped ? ` (${currentNamespace})` : ""}`}
                      className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium hover:text-[var(--accent)] hover:underline cursor-pointer transition-colors"
                    >
                      {isNamespaceScoped ? (
                        <span>
                          <strong className={cn(scopedNodePods > 0 ? "text-[var(--accent)] font-bold" : "text-[var(--muted)]")}>
                            {scopedNodePods}
                          </strong>
                          <span className="text-[var(--muted)] font-normal"> / {n.activePods}</span>
                        </span>
                      ) : (
                        `${n.activePods} / ${n.podCapacity}`
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-[var(--muted)]">{n.version}</td>
                  <td className="py-3 px-3.5 text-right">
                    <span className="text-[var(--accent)] hover:underline text-xs font-sans font-medium">
                      Inspect &rarr;
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
