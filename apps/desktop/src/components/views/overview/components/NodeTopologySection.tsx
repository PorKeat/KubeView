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
  totalCpuCores: number;
  totalMemoryGiB: number;
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
  totalCpuCores,
  totalMemoryGiB,
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
  return (
    <div id="cluster-nodes-section" className="space-y-3.5 scroll-mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[var(--border)]/60">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Server className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
            Cluster Nodes & Infrastructure
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] font-medium">
            {nodes.length} {nodes.length === 1 ? "Node" : "Nodes"}
          </span>
          <span className="text-xs text-[var(--muted)] font-mono hidden md:inline">
            &bull; {readyNodesCount} Ready &bull;{" "}
            {isNamespaceScoped
              ? `${nodesHostingCount} hosting ${currentNamespace}`
              : `${totalCpuCores} Cores Total • ${totalMemoryGiB} GiB Total`}
          </span>
        </div>

        {/* View Mode Switcher: Matrix Grid vs Telemetry Table */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] text-[var(--muted)] font-mono hidden lg:inline">
            Click node to inspect
          </span>
          <div
            className="relative flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono select-none"
            role="group"
            aria-label="Nodes view mode"
          >
            <button
              type="button"
              onClick={() => onSetNodeViewMode("grid")}
              aria-pressed={nodeViewMode === "grid"}
              aria-label="Grid layout view"
              className={cn(
                "relative z-10 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                nodeViewMode === "grid"
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
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
                "relative z-10 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                nodeViewMode === "table"
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
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
