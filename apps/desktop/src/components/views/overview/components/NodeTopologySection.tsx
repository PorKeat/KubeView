"use client";

import * as React from "react";
import { Server, LayoutGrid, List } from "lucide-react";
import { motion } from "motion/react";
import { NodeMatrixGrid } from "./NodeMatrixGrid";
import { NodeTelemetryTable } from "./NodeTelemetryTable";
import { cn } from "@/lib/utils";
import type { NodeSummary } from "@kubeview/contracts";

export interface NodeTopologySectionProps {
  nodes: NodeSummary[];
  readyNodesCount: number;
  selectedNode: string | null;
  nodeViewMode: "grid" | "table";
  effectiveMode: "usage" | "allocation";
  isNamespaceScoped: boolean;
  currentNamespace: string;
  nodesHostingCount: number;
  nodeScopedPodCounts: Record<string, number>;
  onSetNodeViewMode: (mode: "grid" | "table") => void;
  onInspectNode: (node: NodeSummary) => void;
  onFilterPodsForNode: (nodeName: string) => void;
}

export function NodeTopologySection({
  nodes,
  readyNodesCount,
  selectedNode,
  nodeViewMode,
  effectiveMode,
  isNamespaceScoped,
  currentNamespace,
  nodesHostingCount,
  nodeScopedPodCounts,
  onSetNodeViewMode,
  onInspectNode,
  onFilterPodsForNode,
}: NodeTopologySectionProps) {
  const allReady = nodes.length > 0 && readyNodesCount >= nodes.length;
  const readinessTone =
    readyNodesCount === 0
      ? "text-rose-400"
      : allReady
        ? "text-emerald-400"
        : "text-amber-400";

  return (
    <div id="cluster-nodes-section" className="space-y-4 scroll-mt-6">
      <div className="flex flex-col gap-3 border-b border-[var(--border)]/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <Server
            className="h-4 w-4 shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">
                Cluster Nodes
              </h2>
              <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--muted)] tabular-nums">
                {nodes.length} nodes
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--muted)]">
              <span className={cn("font-mono tabular-nums", readinessTone)}>
                {readyNodesCount}/{nodes.length} ready
              </span>
              {isNamespaceScoped && (
                <>
                  <span aria-hidden="true" className="opacity-40">
                    ·
                  </span>
                  <span className="font-mono tabular-nums">
                    {nodesHostingCount} hosting {currentNamespace}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* View Mode Switcher: Matrix Grid vs Telemetry Table */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className="relative flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[11px] font-mono select-none"
            role="group"
            aria-label="Nodes view mode"
          >
            <button
              type="button"
              onClick={() => onSetNodeViewMode("grid")}
              aria-pressed={nodeViewMode === "grid"}
              aria-label="Grid layout view"
              className={cn(
                "relative z-10 flex h-7 items-center gap-1.5 rounded-md px-2.5 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                nodeViewMode === "grid"
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
              title="Matrix Grid View"
            >
              {nodeViewMode === "grid" && (
                <motion.div
                  layoutId="nodes-view-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-md bg-[var(--surface-active)] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none"
                />
              )}
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => onSetNodeViewMode("table")}
              aria-pressed={nodeViewMode === "table"}
              aria-label="Table telemetry view"
              className={cn(
                "relative z-10 flex h-7 items-center gap-1.5 rounded-md px-2.5 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                nodeViewMode === "table"
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
              title="Telemetry Table View"
            >
              {nodeViewMode === "table" && (
                <motion.div
                  layoutId="nodes-view-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-md bg-[var(--surface-active)] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none"
                />
              )}
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center text-xs text-[var(--muted)] font-mono">
          No Kubernetes nodes detected for the active context.
        </div>
      ) : nodeViewMode === "grid" ? (
        <NodeMatrixGrid
          nodes={nodes}
          selectedNode={selectedNode}
          effectiveMode={effectiveMode}
          isNamespaceScoped={isNamespaceScoped}
          currentNamespace={currentNamespace}
          nodeScopedPodCounts={nodeScopedPodCounts}
          onInspectNode={onInspectNode}
          onFilterPodsForNode={onFilterPodsForNode}
        />
      ) : (
        <NodeTelemetryTable
          nodes={nodes}
          selectedNode={selectedNode}
          isNamespaceScoped={isNamespaceScoped}
          currentNamespace={currentNamespace}
          nodeScopedPodCounts={nodeScopedPodCounts}
          onInspectNode={onInspectNode}
          onFilterPodsForNode={onFilterPodsForNode}
        />
      )}
    </div>
  );
}
