"use client";

import * as React from "react";
import {
  Server,
  Box,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  ShieldCheck,
  RotateCw,
  Radio,
  ChevronRight,
  Check,
  Activity,
  HardDrive,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import { Logo } from "@/components/brand/Logo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverviewSkeleton, OfflineState, ErrorBanner } from "@/components/ui";

export function ClusterOverviewView() {
  const {
    currentContext,
    serverVersion,
    latencyMs,
    openInspector,
    diagnosticResult,
    connectionStatus,
    diagnoseContext,
    availableNamespaces,
    clusterOverview,
    isOverviewLoading,
    loadClusterOverview,
    setCurrentNamespace,
    loadPods,
  } = useClusterStore();

  const { openTab } = useTabStore();
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (connectionStatus === "connected" || connectionStatus === "degraded") {
      loadClusterOverview();
    }
  }, [connectionStatus, currentContext]);

  // Derived Diagnostic status
  const netStage = diagnosticResult?.stages?.network;
  const authStage = diagnosticResult?.stages?.authentication;
  const tlsStage = diagnosticResult?.stages?.tls;
  const rbacStage = diagnosticResult?.stages?.rbac;

  if (connectionStatus === "offline") {
    return <OfflineState />;
  }

  if ((connectionStatus === "checking" && !diagnosticResult) || (isOverviewLoading && !clusterOverview)) {
    return <OverviewSkeleton />;
  }

  const nodes = clusterOverview?.nodes || [];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 select-none max-w-7xl mx-auto w-full relative">
      {/* Subtle Ambient Gradient Glows (Depth & Polish) */}
      <div className="pointer-events-none absolute -top-12 left-1/4 -translate-x-1/2 w-[540px] h-[260px] bg-gradient-to-br from-[var(--accent)]/10 via-amber-500/5 to-transparent blur-3xl opacity-80 -z-10" />
      <div className="pointer-events-none absolute top-36 right-1/4 w-[420px] h-[220px] bg-gradient-to-bl from-cyan-500/8 via-blue-500/4 to-transparent blur-3xl opacity-70 -z-10" />

      {/* Degraded Warning Banner */}
      {connectionStatus === "degraded" && (
        <ErrorBanner
          message="Cluster connectivity is operating in degraded mode. Some network probes or RBAC checks reported issues."
          actionLabel="Re-run Diagnostics"
          onAction={() => diagnoseContext()}
        />
      )}

      {/* 1. Open, Airy Header Bar with Highlight Shadows */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--surface-hover)] to-[var(--surface)] border border-[var(--border)] flex items-center justify-center shadow-[0_0_24px_rgba(240,138,66,0.35)]">
              <Logo variant="mark" size="md" className="drop-shadow-[0_2px_10px_rgba(240,138,66,0.4)]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[var(--background)] shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--muted)] tracking-tight">
                Cluster Overview
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-gradient-to-r from-[var(--surface)] to-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] shadow-[0_2px_10px_rgba(0,0,0,0.25)]">
                {currentContext || "default"}
              </span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono border inline-flex items-center gap-1.5 uppercase tracking-wider",
                  connectionStatus === "connected"
                    ? "bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.25)]"
                    : connectionStatus === "checking"
                    ? "bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-[0_0_16px_rgba(245,158,11,0.25)]"
                    : "bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_0_16px_rgba(244,63,94,0.25)]"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    connectionStatus === "connected" ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" : "bg-amber-400"
                  )}
                />
                {connectionStatus === "connected" ? "Active" : connectionStatus === "checking" ? "Probing" : "Offline"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--muted)] font-mono mt-1 flex-wrap">
              <span>Kubernetes <strong className="text-[var(--foreground)] font-medium">{serverVersion}</strong></span>
              <span className="text-[var(--border)]">&bull;</span>
              <span>Ping <strong className="text-[var(--foreground)] font-medium">{latencyMs}ms</strong></span>
              <span className="text-[var(--border)]">&bull;</span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans font-medium">
                <ShieldCheck className="w-3.5 h-3.5 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                Local-First & Agentless
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setCurrentNamespace("all");
              openTab({ id: "pods", title: "Pods", closable: true });
              loadPods("all");
              toast.info(`Showing all ${clusterOverview?.totalPods ?? 0} pods across namespaces`);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] transition-all cursor-pointer shadow-xs hover:border-[var(--accent)]/50 hover:shadow-[0_4px_20px_rgba(240,138,66,0.2)] active:scale-[0.98]"
          >
            <Box className="w-4 h-4 text-[var(--accent)]" />
            <span>Browse Pods ({clusterOverview?.totalPods ?? 0})</span>
          </button>

          <button
            onClick={async () => {
              toast.info("Refreshing cluster telemetry...");
              await Promise.all([diagnoseContext(), loadClusterOverview()]);
              toast.success("Telemetry refreshed!");
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-[var(--accent)] to-amber-500 hover:from-[var(--accent-hover)] hover:to-amber-600 text-white text-xs font-semibold shadow-[0_4px_20px_rgba(240,138,66,0.45)] hover:shadow-[0_6px_28px_rgba(240,138,66,0.65)] transition-all cursor-pointer active:scale-[0.98]"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Metric Strip (4 Cards with Highlight Shadows) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CPU Capacity */}
        <div className="relative overflow-hidden p-5 rounded-xl border border-[var(--border)] bg-gradient-to-b from-[var(--accent)]/[0.04] to-[var(--surface)] flex flex-col justify-between space-y-3 shadow-[0_4px_24px_-2px_rgba(240,138,66,0.18)] hover:shadow-[0_10px_36px_0px_rgba(240,138,66,0.3)] hover:border-[var(--accent)]/60 transition-all group">
          {/* Top Hairline Gradient Highlight */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[var(--accent)]/70 to-transparent" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              CPU Allocation
            </span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent)]/5 text-[var(--accent)] border border-[var(--accent)]/20 shadow-[0_0_14px_rgba(240,138,66,0.25)]">
              <Cpu className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.cpuPercent ?? 0}%
              </span>
              <span className="text-xs text-[var(--muted)] font-mono">
                / {clusterOverview?.totalCpuCores ?? 0} Cores
              </span>
            </div>

            {/* Vibrant Gradient Progress Bar with Highlight Shadow */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-amber-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(240,138,66,0.6)]"
                style={{ width: `${Math.min(100, clusterOverview?.cpuPercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)]/70 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span>{clusterOverview?.allocatedCpuCores ?? 0} Cores Allocated</span>
            <span className="text-emerald-500 font-medium">Healthy</span>
          </div>
        </div>

        {/* Card 2: Memory Usage */}
        <div className="relative overflow-hidden p-5 rounded-xl border border-[var(--border)] bg-gradient-to-b from-cyan-500/[0.04] to-[var(--surface)] flex flex-col justify-between space-y-3 shadow-[0_4px_24px_-2px_rgba(6,182,212,0.18)] hover:shadow-[0_10px_36px_0px_rgba(6,182,212,0.3)] hover:border-cyan-500/60 transition-all group">
          {/* Top Hairline Gradient Highlight */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Memory Usage
            </span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 text-cyan-500 border border-cyan-500/20 shadow-[0_0_14px_rgba(6,182,212,0.25)]">
              <Database className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.memoryPercent ?? 0}%
              </span>
              <span className="text-xs text-[var(--muted)] font-mono">
                / {clusterOverview?.totalMemoryGiB ?? 0} GiB
              </span>
            </div>

            {/* Vibrant Gradient Progress Bar with Highlight Shadow */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                style={{ width: `${Math.min(100, clusterOverview?.memoryPercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)]/70 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span>{clusterOverview?.allocatedMemoryGiB ?? 0} GiB Reserved</span>
            <span className="text-cyan-500 font-medium">Optimal</span>
          </div>
        </div>

        {/* Card 3: Pod Density */}
        <div
          onClick={() => {
            setCurrentNamespace("all");
            openTab({ id: "pods", title: "Pods", closable: true });
            loadPods("all");
          }}
          className="relative overflow-hidden p-5 rounded-xl border border-[var(--border)] bg-gradient-to-b from-purple-500/[0.04] to-[var(--surface)] flex flex-col justify-between space-y-3 shadow-[0_4px_24px_-2px_rgba(168,85,247,0.18)] hover:shadow-[0_10px_36px_0px_rgba(168,85,247,0.3)] hover:border-purple-500/60 hover:bg-[var(--surface-hover)] transition-all cursor-pointer group"
        >
          {/* Top Hairline Gradient Highlight */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/70 to-transparent" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Pod Density
            </span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/15 to-purple-500/5 text-purple-500 border border-purple-500/20 shadow-[0_0_14px_rgba(168,85,247,0.25)]">
              <Box className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.totalPods ?? 0}
              </span>
              <span className="text-xs text-[var(--muted)] font-mono">
                / {clusterOverview?.podCapacity ?? 0} Max
              </span>
            </div>

            {/* Vibrant Gradient Progress Bar with Highlight Shadow */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(168,85,247,0.6)]"
                style={{ width: `${Math.min(100, clusterOverview?.podPercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)]/70 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span>{clusterOverview?.runningPods ?? 0} Running &bull; {clusterOverview?.pendingPods ?? 0} Pending</span>
            <span className="text-[var(--accent)] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-sans">
              View &rarr;
            </span>
          </div>
        </div>

        {/* Card 4: Cluster Nodes */}
        <div className="relative overflow-hidden p-5 rounded-xl border border-[var(--border)] bg-gradient-to-b from-emerald-500/[0.04] to-[var(--surface)] flex flex-col justify-between space-y-3 shadow-[0_4px_24px_-2px_rgba(16,185,129,0.18)] hover:shadow-[0_10px_36px_0px_rgba(16,185,129,0.3)] hover:border-emerald-500/60 transition-all group">
          {/* Top Hairline Gradient Highlight */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Cluster Nodes
            </span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 text-emerald-500 border border-emerald-500/20 shadow-[0_0_14px_rgba(16,185,129,0.25)]">
              <Server className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.readyNodes ?? 0}
              </span>
              <span className="text-xs text-[var(--muted)] font-mono">
                / {clusterOverview?.totalNodes ?? 0} Ready
              </span>
            </div>

            {/* Vibrant Gradient Progress Bar with Highlight Shadow */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                style={{
                  width: `${
                    clusterOverview?.totalNodes
                      ? Math.min(100, (clusterOverview.readyNodes * 100) / clusterOverview.totalNodes)
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)]/70 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span>{availableNamespaces.length} Namespaces</span>
            <span className="text-emerald-500 font-medium">{latencyMs}ms Ping</span>
          </div>
        </div>
      </div>

      {/* 3. Node Topology (Unboxed, Airy Grid with Highlight Shadows) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
              Cluster Nodes & Infrastructure
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] shadow-2xs">
              {nodes.length} {nodes.length === 1 ? "Node" : "Nodes"}
            </span>
          </div>
          <span className="text-xs text-[var(--muted)] font-mono hidden sm:inline">Click node to inspect telemetry</span>
        </div>

        {nodes.length === 0 ? (
          <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center text-xs text-[var(--muted)] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.3)]">
            No Kubernetes nodes detected for the active context.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nodes.map((n) => {
              const isSelected = selectedNode === n.name;
              return (
                <div
                  key={n.name}
                  onClick={() => {
                    setSelectedNode(n.name);
                    openInspector({
                      kind: "Node",
                      name: n.name,
                      namespace: "Cluster Scope",
                      status: n.status,
                      data: {
                        name: n.name,
                        status: n.status,
                        roles: n.roles.join(", "),
                        version: n.version,
                        architecture: n.architecture,
                        internalIP: n.internalIP,
                        cpuCapacity: n.cpuCapacity,
                        cpuAllocated: n.cpuAllocated,
                        cpuPercent: `${n.cpuPercent}%`,
                        memoryCapacity: n.memoryCapacity,
                        memoryAllocated: n.memoryAllocated,
                        memoryPercent: `${n.memoryPercent}%`,
                        podCapacity: n.podCapacity,
                        activePods: n.activePods,
                      },
                    });
                  }}
                  className={cn(
                    "relative overflow-hidden p-4 rounded-xl border transition-all cursor-pointer bg-[var(--surface)] space-y-3.5 group",
                    isSelected
                      ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/50 bg-gradient-to-b from-[var(--accent)]/[0.08] to-[var(--surface-hover)] shadow-[0_0_36px_0px_rgba(240,138,66,0.3)]"
                      : "border-[var(--border)] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] hover:border-[var(--accent)]/60 hover:bg-gradient-to-b hover:from-white/[0.02] hover:to-[var(--surface-hover)] hover:shadow-[0_10px_36px_0px_rgba(240,138,66,0.22)]"
                  )}
                >
                  {/* Subtle Top Hairline Gradient Highlight */}
                  <div
                    className={cn(
                      "absolute top-0 inset-x-0 h-[1.5px] transition-opacity duration-300",
                      isSelected
                        ? "bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-100"
                        : "bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent opacity-0 group-hover:opacity-100"
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0",
                          n.status === "Ready"
                            ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                            : "bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                        )}
                      />
                      <span className="font-mono font-semibold text-xs text-[var(--foreground)] truncate">
                        {n.name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--surface-hover)] text-[var(--muted)] border border-[var(--border)] shrink-0 shadow-2xs">
                      {n.roles.join(", ") || "worker"}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-[var(--muted)] font-mono">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span>CPU: {n.cpuAllocated}</span>
                        <span className="text-[var(--foreground)] font-semibold">{n.cpuPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[var(--accent)] to-amber-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(240,138,66,0.5)]"
                          style={{ width: `${Math.min(100, n.cpuPercent)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span>Memory: {n.memoryAllocated}</span>
                        <span className="text-[var(--foreground)] font-semibold">{n.memoryPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                          style={{ width: `${Math.min(100, n.memoryPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[var(--border)]/70 flex items-center justify-between text-[11px] text-[var(--muted)] font-mono">
                    <span>{n.version} &bull; {n.architecture}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{n.activePods} Pods</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Split Grid: Diagnostics & Warning Incidents (Seamless with Highlight Shadows) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: 4-Stage Diagnostic Security Pipeline */}
        <div className="relative overflow-hidden p-5 rounded-xl border border-[var(--border)] bg-gradient-to-b from-emerald-500/[0.03] to-[var(--surface)] flex flex-col justify-between space-y-4 shadow-[0_4px_30px_-4px_rgba(16,185,129,0.15)] hover:shadow-[0_10px_40px_0px_rgba(16,185,129,0.22)] hover:border-emerald-500/40 transition-all">
          {/* Top Hairline Gradient Highlight */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)] drop-shadow-[0_0_6px_rgba(240,138,66,0.5)]" />
                <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
                  Connection Diagnostics
                </h3>
              </div>
              <span className="text-xs font-mono text-[var(--muted)]">k8s.io/client-go</span>
            </div>

            {/* Seamless Divided Stages */}
            <div className="divide-y divide-[var(--border)]/60">
              {/* Stage 1 */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {netStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--foreground)]">
                      1. Network & TCP Handshake
                    </div>
                    <div className="text-[11px] text-[var(--muted)] font-mono truncate">
                      {netStage?.message || "Dialing host API server port..."}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[var(--muted)] shrink-0 px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] shadow-2xs">
                  {netStage?.latencyMs ? `${netStage.latencyMs}ms` : "-"}
                </span>
              </div>

              {/* Stage 2 */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {authStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--foreground)]">
                      2. Authentication & Credentials
                    </div>
                    <div className="text-[11px] text-[var(--muted)] font-mono truncate">
                      {authStage?.message || "Verifying certificates..."}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  {authStage?.passed ? "Authorized" : "Pending"}
                </span>
              </div>

              {/* Stage 3 */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {tlsStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--foreground)]">
                      3. TLS Certificate Authority & Version
                    </div>
                    <div className="text-[11px] text-[var(--muted)] font-mono truncate">
                      {tlsStage?.message || "Validating TLS certificate authority..."}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-gradient-to-r from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  {tlsStage?.passed ? "Verified" : "Failed"}
                </span>
              </div>

              {/* Stage 4 */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {rbacStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--foreground)]">
                      4. RBAC Pre-Flight Verification
                    </div>
                    <div className="text-[11px] text-[var(--muted)] font-mono truncate">
                      {rbacStage?.message || "SelfSubjectAccessReview probe..."}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-gradient-to-r from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400 border border-purple-500/30 shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                  {rbacStage?.details?.clusterAdmin !== false ? "ClusterAdmin" : "Scoped"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)]/70 text-xs text-[var(--muted)] flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-3.5 h-3.5" />
              Credentials Isolated in Host Memory
            </span>
            <span className="font-mono text-[11px]">JSON-RPC 2.0 stdio</span>
          </div>
        </div>

        {/* Right: Live Cluster Events & Warning Stream */}
        <div className="relative overflow-hidden p-5 rounded-xl border border-[var(--border)] bg-gradient-to-b from-amber-500/[0.03] to-[var(--surface)] flex flex-col justify-between space-y-4 shadow-[0_4px_30px_-4px_rgba(245,158,11,0.15)] hover:shadow-[0_10px_40px_0px_rgba(245,158,11,0.22)] hover:border-amber-500/40 transition-all">
          {/* Top Hairline Gradient Highlight */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
                  Warning Events & Incidents
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                {clusterOverview?.warningEvents?.length ?? 0} Active
              </span>
            </div>

            <div className="divide-y divide-[var(--border)]/60 max-h-56 overflow-y-auto pr-1">
              {!clusterOverview?.warningEvents || clusterOverview.warningEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--muted)] flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="font-semibold text-[var(--foreground)]">Cluster Operating Normally</span>
                  <p className="text-[11px] text-[var(--muted)]">No active warning events found across namespaces.</p>
                </div>
              ) : (
                clusterOverview.warningEvents.map((ev, idx) => (
                  <div key={idx} className="py-3 first:pt-2 last:pb-1 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                        <span className="font-semibold text-amber-600 dark:text-amber-400 text-xs">
                          {ev.reason}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--muted)] font-mono">{ev.lastTimestamp}</span>
                    </div>
                    <p className="text-xs text-[var(--muted)] font-mono line-clamp-1 pl-3.5">
                      {ev.message}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-[var(--muted)] font-mono pl-3.5 pt-0.5">
                      <span>Source: {ev.source || "k8s-event"}</span>
                      {ev.count > 1 && <span>Occurred {ev.count} times</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)]/70 text-xs text-[var(--muted)] flex items-center justify-between">
            <span>Aggregated across {availableNamespaces.length} namespaces</span>
            <button
              onClick={() => {
                setCurrentNamespace("all");
                openTab({ id: "pods", title: "Pods", closable: true });
                loadPods("all");
              }}
              className="text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <span>View Pods Explorer</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
