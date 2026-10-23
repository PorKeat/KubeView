"use client";

import * as React from "react";
import { Cpu, Activity, Box, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { NodeSummary, PodSummary } from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";

export interface InspectorNodeOverviewProps {
  nodeData: NodeSummary;
  nodePods: PodSummary[];
  onFilterPodsForNode: (nodeName: string) => void;
  onInspectPod: (pod: SelectedResource) => void;
  onViewAllPods: () => void;
}

export function InspectorNodeOverview({
  nodeData,
  nodePods,
  onFilterPodsForNode,
  onInspectPod,
  onViewAllPods,
}: InspectorNodeOverviewProps) {
  const cpuNum =
    typeof nodeData.cpuPercent === "number"
      ? nodeData.cpuPercent
      : parseFloat(String(nodeData.cpuPercent)) || 0;
  const memNum =
    typeof nodeData.memoryPercent === "number"
      ? nodeData.memoryPercent
      : parseFloat(String(nodeData.memoryPercent)) || 0;
  const podCap = nodeData.podCapacity || 110;
  const podNum = Math.round(((nodeData.activePods || 0) / podCap) * 100);

  const getGaugeColor = (pct: number) => {
    if (pct >= 90) return "bg-rose-500 dark:bg-rose-400";
    if (pct >= 70) return "bg-amber-500 dark:bg-amber-400";
    return "bg-emerald-500 dark:bg-emerald-400";
  };

  const getTextColor = (pct: number) => {
    if (pct >= 90) return "text-rose-600 dark:text-rose-400";
    if (pct >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-[var(--foreground)]";
  };

  const cleanAlloc = (val: string | undefined) => {
    if (!val) return "0";
    return val.replace(/\s*\(\d+%\)/, "");
  };

  const renderStatusBadge = (status: string) => {
    const isOk = status === "Running" || status === "Ready";
    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border",
          isOk
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        )}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Node Specifications */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
        <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block font-mono">
          Node Specification & Status
        </span>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[var(--muted)] block text-[10px] font-mono">
              Role
            </span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {(() => {
                const rolesList = Array.isArray(nodeData.roles)
                  ? nodeData.roles
                  : typeof nodeData.roles === "string"
                    ? (nodeData.roles as string)
                        .split(",")
                        .map((r) => r.trim())
                        .filter(Boolean)
                    : [];
                return rolesList.length > 0 ? (
                  rolesList.map((role: string) => (
                    <span
                      key={role}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)]"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)]">
                    worker
                  </span>
                );
              })()}
            </div>
          </div>
          <div>
            <span className="text-[var(--muted)] block text-[10px] font-mono">
              Kubelet Version
            </span>
            <span className="font-mono text-[var(--foreground)] font-medium">
              {nodeData.version || "-"}
            </span>
          </div>
          <div>
            <span className="text-[var(--muted)] block text-[10px] font-mono">
              Internal IP
            </span>
            <span className="font-mono text-[var(--foreground)] font-medium">
              {nodeData.internalIP || "-"}
            </span>
          </div>
          <div>
            <span className="text-[var(--muted)] block text-[10px] font-mono">
              Architecture
            </span>
            <span className="font-mono text-[var(--foreground)] font-medium">
              {nodeData.architecture || "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Real Resource Allocations Telemetry */}
      <div className="space-y-4">
        {/* 1. Real-Time Telemetry from Metrics Server (kubectl top) */}
        {(nodeData.cpuUsage || nodeData.memoryUsage) && (
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block font-mono">
                Live Node Telemetry
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                kubectl top node
              </span>
            </div>

            {/* Live CPU Usage */}
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                  <Cpu
                    className="w-3.5 h-3.5 text-emerald-500"
                    aria-hidden="true"
                  />
                  <span>CPU Live Usage</span>
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[var(--foreground)] font-bold tabular-nums">
                    {nodeData.cpuUsage || "-"}
                  </span>
                  <span
                    className={cn(
                      "font-semibold text-xs ml-1 tabular-nums",
                      getTextColor(nodeData.cpuUsagePercent ?? 0),
                    )}
                  >
                    ({nodeData.cpuUsagePercent ?? 0}%)
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                    getGaugeColor(nodeData.cpuUsagePercent ?? 0),
                  )}
                  style={{
                    width: `${Math.min(100, Math.max(0, nodeData.cpuUsagePercent ?? 0))}%`,
                  }}
                />
              </div>
            </div>

            {/* Live Memory Usage */}
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                  <Activity
                    className="w-3.5 h-3.5 text-emerald-500"
                    aria-hidden="true"
                  />
                  <span>Memory Live Usage</span>
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[var(--foreground)] font-bold tabular-nums">
                    {nodeData.memoryUsage || "-"}
                  </span>
                  <span
                    className={cn(
                      "font-semibold text-xs ml-1 tabular-nums",
                      getTextColor(nodeData.memoryUsagePercent ?? 0),
                    )}
                  >
                    ({nodeData.memoryUsagePercent ?? 0}%)
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                    getGaugeColor(nodeData.memoryUsagePercent ?? 0),
                  )}
                  style={{
                    width: `${Math.min(100, Math.max(0, nodeData.memoryUsagePercent ?? 0))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Scheduled Resource Allocations (Pod Requests) */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
          <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block font-mono">
            Scheduled Pod Allocations (Requests)
          </span>

          {/* CPU Allocation */}
          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                <Cpu
                  className="w-3.5 h-3.5 text-[var(--muted)]"
                  aria-hidden="true"
                />
                <span>CPU Requested</span>
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-[var(--foreground)] tabular-nums">
                  {cleanAlloc(nodeData.cpuAllocated)}
                </span>
                <span className="text-[var(--muted)]">
                  / {nodeData.cpuCapacity}
                </span>
                <span
                  className={cn(
                    "font-semibold text-xs ml-1.5",
                    getTextColor(cpuNum),
                  )}
                >
                  {cpuNum}%
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  getGaugeColor(cpuNum),
                )}
                style={{ width: `${Math.min(100, Math.max(0, cpuNum))}%` }}
              />
            </div>
          </div>

          {/* Memory Allocation */}
          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                <Activity
                  className="w-3.5 h-3.5 text-[var(--muted)]"
                  aria-hidden="true"
                />
                <span>Memory Reserved</span>
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-[var(--foreground)] tabular-nums">
                  {cleanAlloc(nodeData.memoryAllocated)}
                </span>
                <span className="text-[var(--muted)]">
                  / {nodeData.memoryCapacity}
                </span>
                <span
                  className={cn(
                    "font-semibold text-xs ml-1.5",
                    getTextColor(memNum),
                  )}
                >
                  {memNum}%
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  getGaugeColor(memNum),
                )}
                style={{ width: `${Math.min(100, Math.max(0, memNum))}%` }}
              />
            </div>
          </div>

          {/* Pod Density */}
          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                <Box
                  className="w-3.5 h-3.5 text-[var(--muted)]"
                  aria-hidden="true"
                />
                <span>Pod Density</span>
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-[var(--foreground)] tabular-nums">
                  {nodeData.activePods}
                </span>
                <span className="text-[var(--muted)]">/ {podCap}</span>
                <span
                  className={cn(
                    "font-semibold text-xs ml-1.5",
                    getTextColor(podNum),
                  )}
                >
                  {podNum}%
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                  getGaugeColor(podNum),
                )}
                style={{ width: `${Math.min(100, Math.max(0, podNum))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pods on this Node Interactive Panel */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider font-mono">
              Pods Scheduled on this Node
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)]">
            {nodePods.length > 0
              ? `${nodePods.length} pods`
              : `${nodeData.activePods} pods`}
          </span>
        </div>

        {/* Action Button: 1-Click Filter to this node */}
        <button
          type="button"
          onClick={() => onFilterPodsForNode(nodeData.name)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--accent)] text-white hover:opacity-95 font-medium text-xs transition-all cursor-pointer shadow-xs active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4" />
            <span>Filter & View Pods on {nodeData.name}</span>
          </div>
          <span className="font-mono text-[11px] opacity-90">&rarr;</span>
        </button>

        {/* Sample Pods List on this Node */}
        {nodePods.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-mono text-[var(--muted)]">
              Pods on node ({Math.min(nodePods.length, 6)} of {nodePods.length}
              ):
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {nodePods.slice(0, 6).map((pod) => (
                <div
                  key={`${pod.namespace}/${pod.name}`}
                  onClick={() => {
                    onInspectPod({
                      kind: "Pod",
                      name: pod.name,
                      namespace: pod.namespace,
                      status: pod.status,
                      data: pod as unknown as Record<string, unknown>,
                    });
                  }}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-[var(--border)]/60 text-xs font-mono transition-colors cursor-pointer"
                  title="Click to inspect this pod"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-[var(--foreground)] font-medium truncate text-[11px]">
                      {pod.name}
                    </div>
                    <div className="text-[10px] text-[var(--muted)] truncate">
                      {pod.namespace}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {renderStatusBadge(pod.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-[var(--muted)] font-mono">
            {nodeData.activePods} active pods scheduled on this host. Click
            above to view and filter.
          </p>
        )}
      </div>

      {/* Cluster-Wide Pods Fallback Button */}
      <button
        type="button"
        onClick={onViewAllPods}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-transparent hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] font-medium text-xs transition-colors cursor-pointer"
      >
        <span>View All Pods (Cluster-Wide)</span>
      </button>
    </div>
  );
}
