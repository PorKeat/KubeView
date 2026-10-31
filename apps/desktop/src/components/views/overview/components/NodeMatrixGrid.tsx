"use client";

import { Box, ArrowRight } from "lucide-react";
import { SpotlightCard } from "@/components/ui";
import { NodeTelemetryGraph } from "./NodeTelemetryGraph";
import { cleanAlloc } from "../types";
import { cn } from "@/lib/utils";
import type { NodeSummary } from "@kubeview/contracts";

export interface NodeMatrixGridProps {
  nodes: NodeSummary[];
  selectedNode: string | null;
  effectiveMode: "usage" | "allocation";
  isNamespaceScoped: boolean;
  currentNamespace: string;
  nodeScopedPodCounts: Record<string, number>;
  onInspectNode: (node: NodeSummary) => void;
  onFilterPodsForNode: (nodeName: string) => void;
}

export function NodeMatrixGrid({
  nodes,
  selectedNode,
  effectiveMode,
  isNamespaceScoped,
  currentNamespace,
  nodeScopedPodCounts,
  onInspectNode,
  onFilterPodsForNode,
}: NodeMatrixGridProps) {
  return (
    <div
      className={cn(
        "grid w-full gap-4",
        nodes.length === 1
          ? "grid-cols-1"
          : nodes.length === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
      )}
    >
      {nodes.map((n) => {
        const isSelected = selectedNode === n.name;
        const isNodeReady = n.status === "Ready";
        const scopedNodePods =
          nodeScopedPodCounts[n.name] ?? (isNamespaceScoped ? 0 : n.activePods);
        const podCap = n.podCapacity || 110;
        const cpuPercent =
          effectiveMode === "usage" && n.cpuUsage
            ? (n.cpuUsagePercent ?? 0)
            : n.cpuPercent;
        const memoryPercent =
          effectiveMode === "usage" && n.memoryUsage
            ? (n.memoryUsagePercent ?? 0)
            : n.memoryPercent;

        return (
          <SpotlightCard
            key={n.name}
            role="button"
            tabIndex={0}
            isSelected={isSelected}
            aria-label={`Node ${n.name}, status ${n.status}, CPU ${cpuPercent} percent, memory ${memoryPercent} percent. Press Enter or Space to inspect.`}
            onClick={() => onInspectNode(n)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onInspectNode(n);
              }
            }}
            containerClassName="group/node aspect-square w-full max-w-[360px] justify-self-center cursor-pointer rounded-2xl hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            className="flex h-full flex-col"
          >
            <div className="flex h-full flex-col p-4">
              {/* Identity */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-mono text-base font-semibold tracking-tight text-[var(--foreground)]">
                    {n.name}
                  </h3>
                  <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {(n.roles.length > 0 ? n.roles : ["worker"]).join(" · ")}
                  </p>
                </div>

                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium",
                    isNodeReady
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                      : "border-rose-500/25 bg-rose-500/10 text-rose-400",
                  )}
                >
                  {n.status}
                </span>
              </div>

              {/* Core metrics */}
              <div className="flex flex-1 items-center">
                <NodeTelemetryGraph
                  compact
                  nodeName={n.name}
                  cpuPercent={cpuPercent}
                  cpuDisplay={
                    effectiveMode === "usage" && n.cpuUsage
                      ? n.cpuUsage
                      : cleanAlloc(n.cpuAllocated)
                  }
                  memoryPercent={memoryPercent}
                  memoryDisplay={
                    effectiveMode === "usage" && n.memoryUsage
                      ? n.memoryUsage
                      : cleanAlloc(n.memoryAllocated)
                  }
                  activePods={n.activePods}
                  podCapacity={podCap}
                  scopedNamespace={currentNamespace}
                  scopedPodsCount={scopedNodePods}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-[var(--border)]/60 pt-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterPodsForNode(n.name);
                  }}
                  title={`View pods on ${n.name}${isNamespaceScoped ? ` (${currentNamespace})` : ""}`}
                  aria-label={`View pods on ${n.name}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-black/[0.05] hover:text-[var(--accent)] dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  <Box className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[var(--accent)]">
                  <span>Inspect</span>
                  <ArrowRight
                    className="h-3 w-3 transition-transform group-hover/spotlight:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </div>
          </SpotlightCard>
        );
      })}
    </div>
  );
}
