"use client";

import * as React from "react";
import { Activity, Layers, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { MetricTicker } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ClusterOverviewResult } from "@kubeview/contracts";

export interface BentoMetricCardsProps {
  clusterOverview: ClusterOverviewResult | null;
  isNamespaceScoped: boolean;
  currentNamespace: string;
  scopedPodsCount: number;
  nodesHostingCount: number;
  availableNamespacesCount: number;
  hasMetrics: boolean;
  effectiveMode: "usage" | "allocation";
  telemetryMode: "usage" | "allocation";
  onSetTelemetryMode: (mode: "usage" | "allocation") => void;
  onOpenPodsView: () => void;
  onScrollToNodes: () => void;
}

export function BentoMetricCards({
  clusterOverview,
  isNamespaceScoped,
  currentNamespace,
  scopedPodsCount,
  nodesHostingCount,
  availableNamespacesCount,
  hasMetrics,
  effectiveMode,
  onSetTelemetryMode,
  onOpenPodsView,
  onScrollToNodes,
}: BentoMetricCardsProps) {
  // CPU metrics
  const cpuPercent = isNamespaceScoped
    ? clusterOverview?.cpuPercent ?? 0
    : effectiveMode === "usage"
    ? clusterOverview?.cpuUsagePercent ?? 0
    : clusterOverview?.cpuPercent ?? 0;

  const cpuCoresDisplay = isNamespaceScoped
    ? `${clusterOverview?.allocatedCpuCores ?? 0} Cores`
    : effectiveMode === "usage"
    ? `${clusterOverview?.usedCpuCores ?? 0} Cores`
    : `${clusterOverview?.allocatedCpuCores ?? 0} Cores`;

  // Memory metrics
  const memoryPercent = isNamespaceScoped
    ? clusterOverview?.memoryPercent ?? 0
    : effectiveMode === "usage"
    ? clusterOverview?.memoryUsagePercent ?? 0
    : clusterOverview?.memoryPercent ?? 0;

  const memoryDisplay = isNamespaceScoped
    ? `${clusterOverview?.allocatedMemoryGiB ?? 0} GiB`
    : effectiveMode === "usage"
    ? `${clusterOverview?.usedMemoryGiB ?? 0} GiB`
    : `${clusterOverview?.allocatedMemoryGiB ?? 0} GiB`;

  // Pod density metrics
  const podCount = clusterOverview?.totalPods ?? scopedPodsCount;
  const podCap = clusterOverview?.podCapacity ?? 0;
  const podPercent = clusterOverview?.podPercent ?? 0;

  // Node metrics
  const readyNodes = clusterOverview?.readyNodes ?? 0;
  const totalNodes = clusterOverview?.totalNodes ?? 0;
  const nodePercent = totalNodes > 0 ? Math.round((readyNodes / totalNodes) * 100) : 100;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden select-none">
      {/* 1. Cockpit Ribbon Header & Telemetry Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2 border-b border-[var(--border)]/70 bg-[var(--surface-hover)]/25">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
          <span className="text-xs font-semibold text-[var(--foreground)] tracking-tight">
            {isNamespaceScoped ? `Telemetry (${currentNamespace})` : "Cluster Telemetry"}
          </span>
          <span className="text-[11px] font-mono text-[var(--muted)] hidden sm:inline">
            {effectiveMode === "usage" ? "Live consumption metrics" : "Capacity commitments"}
          </span>
        </div>

        {hasMetrics && (
          <div
            className="relative flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono select-none"
            role="group"
            aria-label="Telemetry display mode"
          >
            <button
              type="button"
              onClick={() => onSetTelemetryMode("usage")}
              aria-pressed={effectiveMode === "usage"}
              className={cn(
                "relative z-10 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                effectiveMode === "usage"
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
              title="Live CPU & Memory consumption from metrics-server"
            >
              {effectiveMode === "usage" && (
                <motion.div
                  layoutId="telemetry-mode-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-md bg-[var(--surface-active)] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none"
                />
              )}
              <Activity className="w-3 h-3 text-emerald-500" />
              <span>Live Usage</span>
            </button>
            <button
              type="button"
              onClick={() => onSetTelemetryMode("allocation")}
              aria-pressed={effectiveMode === "allocation"}
              className={cn(
                "relative z-10 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                effectiveMode === "allocation"
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
              title="Scheduled pod resource requests & capacity commitments"
            >
              {effectiveMode === "allocation" && (
                <motion.div
                  layoutId="telemetry-mode-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-md bg-[var(--surface-active)] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none"
                />
              )}
              <Layers className="w-3 h-3 text-amber-500" />
              <span>Allocation</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Unified 4-Segment Cockpit Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]/70">
        {/* Segment 1: CPU */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[var(--muted)] tracking-tight">CPU</span>
            <span className="font-mono text-[10px] text-[var(--muted)] tabular-nums">
              {clusterOverview?.totalCpuCores ?? 0} Cores
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <MetricTicker
                value={cpuPercent}
                suffix="%"
                className="text-xl sm:text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight tabular-nums"
              />
              <span className="text-xs text-[var(--muted)] font-mono tabular-nums">
                {cpuCoresDisplay}
              </span>
            </div>

            <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  cpuPercent > 85
                    ? "bg-rose-500"
                    : cpuPercent > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500 dark:bg-emerald-400"
                )}
                style={{ width: `${Math.min(100, cpuPercent)}%` }}
              />
            </div>
          </div>

          <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
            <span className="tabular-nums truncate">
              {isNamespaceScoped
                ? `Scope: ${currentNamespace}`
                : effectiveMode === "usage" && hasMetrics
                ? `Alloc: ${clusterOverview?.allocatedCpuCores ?? 0} Cores`
                : `Cap: ${clusterOverview?.totalCpuCores ?? 0} Cores`}
            </span>
            <span
              className={cn(
                "font-semibold shrink-0",
                isNamespaceScoped
                  ? "text-[var(--accent)]"
                  : cpuPercent > 85
                  ? "text-rose-500 dark:text-rose-400"
                  : cpuPercent > 70
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isNamespaceScoped
                ? `${scopedPodsCount} Pods`
                : cpuPercent > 85
                ? "Critical"
                : cpuPercent > 70
                ? "High Load"
                : "Healthy"}
            </span>
          </div>
        </div>

        {/* Segment 2: Memory */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[var(--muted)] tracking-tight">Memory</span>
            <span className="font-mono text-[10px] text-[var(--muted)] tabular-nums">
              {clusterOverview?.totalMemoryGiB ?? 0} GiB
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <MetricTicker
                value={memoryPercent}
                suffix="%"
                className="text-xl sm:text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight tabular-nums"
              />
              <span className="text-xs text-[var(--muted)] font-mono tabular-nums">
                {memoryDisplay}
              </span>
            </div>

            <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  memoryPercent > 85
                    ? "bg-rose-500"
                    : memoryPercent > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500 dark:bg-emerald-400"
                )}
                style={{ width: `${Math.min(100, memoryPercent)}%` }}
              />
            </div>
          </div>

          <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
            <span className="tabular-nums truncate">
              {isNamespaceScoped
                ? `Fleet: ${(clusterOverview?.memoryPercent ?? 0).toFixed(1)}%`
                : effectiveMode === "usage" && hasMetrics
                ? `Alloc: ${clusterOverview?.allocatedMemoryGiB ?? 0} GiB`
                : `Cap: ${clusterOverview?.totalMemoryGiB ?? 0} GiB`}
            </span>
            <span
              className={cn(
                "font-semibold shrink-0",
                isNamespaceScoped
                  ? "text-[var(--accent)]"
                  : memoryPercent > 85
                  ? "text-rose-500 dark:text-rose-400"
                  : memoryPercent > 70
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isNamespaceScoped
                ? `${(clusterOverview?.memoryPercent ?? 0).toFixed(1)}% Fleet`
                : memoryPercent > 85
                ? "Critical"
                : memoryPercent > 70
                ? "High Load"
                : "Optimal"}
            </span>
          </div>
        </div>

        {/* Segment 3: Pods (Interactive drilldown) */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`Pod density: ${podCount} of ${podCap} pods. Press Enter or Space to view pods.`}
          onClick={onOpenPodsView}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenPodsView();
            }
          }}
          className="group p-3 sm:p-3.5 flex flex-col justify-between space-y-2 hover:bg-[var(--surface-hover)]/40 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[var(--muted)] tracking-tight">Pods</span>
            <span className="font-mono text-[10px] text-[var(--muted)] tabular-nums">
              {podCap} Max
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <MetricTicker
                value={podCount}
                className="text-xl sm:text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight tabular-nums"
              />
              <span className="text-xs text-[var(--muted)] font-mono tabular-nums">
                / {podCap} ({podPercent}%)
              </span>
            </div>

            <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  podPercent > 85
                    ? "bg-rose-500"
                    : podPercent > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500 dark:bg-emerald-400"
                )}
                style={{ width: `${Math.min(100, podPercent)}%` }}
              />
            </div>
          </div>

          <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
            <span className="tabular-nums truncate">
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {clusterOverview?.runningPods ?? scopedPodsCount}
              </strong>{" "}
              Running
              {Boolean(clusterOverview?.pendingPods) && `, ${clusterOverview?.pendingPods} Pnd`}
              {Boolean(clusterOverview?.failedPods) && `, ${clusterOverview?.failedPods} Fail`}
            </span>
            <span className="text-[var(--accent)] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>View</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Segment 4: Nodes (Interactive drilldown) */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`Cluster nodes: ${readyNodes} of ${totalNodes} ready. Press Enter or Space to view nodes.`}
          onClick={onScrollToNodes}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onScrollToNodes();
            }
          }}
          className="group p-3 sm:p-3.5 flex flex-col justify-between space-y-2 hover:bg-[var(--surface-hover)]/40 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[var(--muted)] tracking-tight">Nodes</span>
            <span className="font-mono text-[10px] text-[var(--muted)] tabular-nums">
              {totalNodes} Total
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <MetricTicker
                value={isNamespaceScoped ? nodesHostingCount : readyNodes}
                className="text-xl sm:text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight tabular-nums"
              />
              <span className="text-xs text-[var(--muted)] font-mono tabular-nums">
                / {totalNodes} {isNamespaceScoped ? "Active" : "Ready"}
              </span>
            </div>

            <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  isNamespaceScoped
                    ? "bg-[var(--accent)]"
                    : totalNodes > 0 && readyNodes === totalNodes
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-amber-500"
                )}
                style={{
                  width: `${
                    isNamespaceScoped
                      ? Math.min(100, (nodesHostingCount * 100) / (totalNodes || 1))
                      : totalNodes > 0
                      ? Math.min(100, (readyNodes * 100) / totalNodes)
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
            <span className="tabular-nums truncate">
              {isNamespaceScoped ? `Scope: ${currentNamespace}` : `${availableNamespacesCount} Namespaces`}
            </span>
            <span className="text-[var(--accent)] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              <span>Inspect</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
