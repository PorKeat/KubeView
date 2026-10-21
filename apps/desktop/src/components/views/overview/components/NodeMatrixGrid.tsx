"use client";

import * as React from "react";
import { Copy, Check, Box, ArrowRight } from "lucide-react";
import { toast } from "sonner";
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
  const [copiedIp, setCopiedIp] = React.useState<string | null>(null);

  const handleCopyIp = (e: React.MouseEvent, ip: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    toast.success(`Copied Node IP: ${ip}`);
    setTimeout(() => setCopiedIp(null), 1500);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {nodes.map((n) => {
        const isSelected = selectedNode === n.name;
        const isNodeReady = n.status === "Ready";
        const scopedNodePods =
          nodeScopedPodCounts[n.name] ?? (isNamespaceScoped ? 0 : n.activePods);
        const podCap = n.podCapacity || 110;
        const availablePods = Math.max(0, podCap - n.activePods);

        return (
          <SpotlightCard
            key={n.name}
            role="button"
            tabIndex={0}
            isSelected={isSelected}
            aria-label={`Node ${n.name}, status ${n.status}, CPU ${
              effectiveMode === "usage" && n.cpuUsage
                ? n.cpuUsagePercent
                : n.cpuPercent
            } percent, memory ${
              effectiveMode === "usage" && n.memoryUsage
                ? n.memoryUsagePercent
                : n.memoryPercent
            } percent. Press Enter or Space to inspect.`}
            onClick={() => onInspectNode(n)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onInspectNode(n);
              }
            }}
            containerClassName="cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            className="p-6 space-y-5 flex flex-col justify-between"
          >
            {/* Top Line: Host Identity & Status */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0",
                      isNodeReady
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                        : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]",
                    )}
                  />
                  <span className="font-mono font-bold text-lg text-[var(--foreground)] truncate tracking-tight">
                    {n.name}
                  </span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-mono text-[var(--muted)] bg-white/[0.04] dark:bg-white/[0.06] border border-white/[0.08] dark:border-white/[0.08] shrink-0">
                    {n.roles.join(", ") || "worker"}
                  </span>
                </div>

                {/* Internal IP with Quick Copy */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted)] pl-5">
                  <span>{n.internalIP}</span>
                  {n.internalIP && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyIp(e, n.internalIP)}
                      className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 hover:text-[var(--foreground)] transition-colors cursor-pointer"
                      title="Copy IP address"
                    >
                      {copiedIp === n.internalIP ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium font-mono shrink-0",
                  isNodeReady
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/15 text-rose-400 border border-rose-500/20",
                )}
              >
                {n.status}
              </span>
            </div>

            {/* Precision Telemetry Activity Graph & Key Metrics */}
            <NodeTelemetryGraph
              nodeName={n.name}
              cpuPercent={
                effectiveMode === "usage" && n.cpuUsage
                  ? (n.cpuUsagePercent ?? 0)
                  : n.cpuPercent
              }
              cpuDisplay={
                effectiveMode === "usage" && n.cpuUsage
                  ? n.cpuUsage
                  : cleanAlloc(n.cpuAllocated)
              }
              memoryPercent={
                effectiveMode === "usage" && n.memoryUsage
                  ? (n.memoryUsagePercent ?? 0)
                  : n.memoryPercent
              }
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

            {/* Card Footer: Filter Workloads Affordance & Inspect Link */}
            <div className="pt-3.5 border-t border-[var(--border)]/60 flex items-center justify-between text-xs font-mono">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilterPodsForNode(n.name);
                }}
                title={`Filter Pods list to ${n.name}${isNamespaceScoped ? ` (${currentNamespace})` : ""}`}
                className="text-[var(--muted)] hover:text-[var(--accent)] hover:underline inline-flex items-center gap-1.5 transition-colors cursor-pointer group/avail"
              >
                <Box className="w-3 h-3 text-[#f08a42]" />
                {isNamespaceScoped ? (
                  <span
                    className={cn(
                      "tabular-nums font-mono text-xs",
                      scopedNodePods > 0
                        ? "text-[#f08a42] font-semibold"
                        : "text-[var(--muted)]",
                    )}
                  >
                    {scopedNodePods} {scopedNodePods === 1 ? "pod" : "pods"} in{" "}
                    {currentNamespace}
                  </span>
                ) : (
                  <span className="tabular-nums">
                    {n.activePods} active {n.activePods === 1 ? "pod" : "pods"}
                    <span className="text-[var(--muted)] opacity-75 font-normal ml-1">
                      ({availablePods} free)
                    </span>
                  </span>
                )}
              </button>

              <span className="text-[#f97316] font-semibold flex items-center gap-1 group-hover/spotlight:translate-x-0.5 transition-transform">
                <span>Inspect</span>
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </span>
            </div>
          </SpotlightCard>
        );
      })}
    </div>
  );
}
