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
    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 select-none cyber-grid">
      {/* Degraded Warning Banner */}
      {connectionStatus === "degraded" && (
        <ErrorBanner
          message="Cluster connectivity is operating in degraded mode. Some network probes or RBAC checks reported issues."
          actionLabel="Re-run Diagnostics"
          onAction={() => diagnoseContext()}
        />
      )}

      {/* 1. Sleek Compact Header Bar */}
      <div className="p-3.5 px-4 rounded-xl glass-panel border border-[var(--border)] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="p-2 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20 shadow-2xs">
              <Activity className="w-4 h-4" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-[var(--surface)]" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                Cluster Overview
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-black/5 dark:bg-white/5 text-[var(--foreground)] border border-[var(--border)]">
                {currentContext || "default"}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-semibold font-mono border inline-flex items-center gap-1.5 uppercase tracking-wider",
                  connectionStatus === "connected"
                    ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/25"
                    : connectionStatus === "checking"
                    ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/25"
                    : "bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/25"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    connectionStatus === "connected" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  )}
                />
                {connectionStatus === "connected" ? "Active" : connectionStatus === "checking" ? "Probing" : "Offline"}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-[11px] text-[var(--muted)] font-mono mt-0.5">
              <span>k8s <strong className="text-[var(--foreground)] font-semibold">{serverVersion}</strong></span>
              <span>&bull;</span>
              <span>ping <strong className="text-[var(--foreground)] font-semibold">{latencyMs}ms</strong></span>
              <span>&bull;</span>
              <span className="text-[10px] text-emerald-500 dark:text-emerald-400 flex items-center gap-1 font-sans font-medium">
                <ShieldCheck className="w-3 h-3" />
                Local-First & Agentless
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setCurrentNamespace("all");
              openTab({ id: "pods", title: "Pods", closable: true });
              loadPods("all");
              toast.info(`Showing all ${clusterOverview?.totalPods ?? 0} pods across namespaces`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] transition-all cursor-pointer shadow-2xs hover:border-[var(--accent)]/50"
          >
            <Box className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Browse Pods ({clusterOverview?.totalPods ?? 0})</span>
          </button>

          <button
            onClick={async () => {
              toast.info("Refreshing cluster telemetry...");
              await Promise.all([diagnoseContext(), loadClusterOverview()]);
              toast.success("Telemetry refreshed!");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Metric Strip (4 Consistent Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: CPU Capacity */}
        <div className="glass-card p-3.5 rounded-xl border border-[var(--border)] flex flex-col justify-between space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              CPU Allocation
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.cpuPercent ?? 0}%
              </span>
              <span className="text-[11px] text-[var(--muted)] font-mono">
                / {clusterOverview?.totalCpuCores ?? 0} Cores
              </span>
            </div>

            {/* Sleek Progress Bar */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, clusterOverview?.cpuPercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
            <span>{clusterOverview?.allocatedCpuCores ?? 0} Cores Allocated</span>
            <span className="text-emerald-500 font-medium">Healthy</span>
          </div>
        </div>

        {/* Card 2: Memory Usage */}
        <div className="glass-card p-3.5 rounded-xl border border-[var(--border)] flex flex-col justify-between space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Memory Usage
            </span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Database className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.memoryPercent ?? 0}%
              </span>
              <span className="text-[11px] text-[var(--muted)] font-mono">
                / {clusterOverview?.totalMemoryGiB ?? 0} GiB
              </span>
            </div>

            {/* Sleek Progress Bar */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-cyan-500 dark:bg-cyan-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, clusterOverview?.memoryPercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
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
          className="glass-card p-3.5 rounded-xl border border-[var(--border)] flex flex-col justify-between space-y-2.5 shadow-2xs cursor-pointer hover:border-[var(--accent)]/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Pod Density
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Box className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.totalPods ?? 0}
              </span>
              <span className="text-[11px] text-[var(--muted)] font-mono">
                / {clusterOverview?.podCapacity ?? 0} Max
              </span>
            </div>

            {/* Sleek Progress Bar */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-purple-500 dark:bg-purple-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, clusterOverview?.podPercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
            <span>{clusterOverview?.runningPods ?? 0} Running &bull; {clusterOverview?.pendingPods ?? 0} Pending</span>
            <span className="text-[var(--accent)] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-sans">
              View &rarr;
            </span>
          </div>
        </div>

        {/* Card 4: Cluster Nodes */}
        <div className="glass-card p-3.5 rounded-xl border border-[var(--border)] flex flex-col justify-between space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Cluster Nodes
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Server className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.readyNodes ?? 0}
              </span>
              <span className="text-[11px] text-[var(--muted)] font-mono">
                / {clusterOverview?.totalNodes ?? 0} Ready
              </span>
            </div>

            {/* Sleek Progress Bar */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-700 ease-out"
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

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
            <span>{availableNamespaces.length} Namespaces</span>
            <span className="text-emerald-500 font-medium">{latencyMs}ms Ping</span>
          </div>
        </div>
      </div>

      {/* 3. Node Topology Strip */}
      <div className="p-4 rounded-xl glass-panel border border-[var(--border)] space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
              Cluster Node Topology & Infrastructure
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
              {nodes.length} Active {nodes.length === 1 ? "Node" : "Nodes"}
            </span>
          </div>
          <span className="text-[11px] text-[var(--muted)] font-mono">Click node to inspect</span>
        </div>

        {nodes.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--muted)]">
            No Kubernetes nodes detected for the active context.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                    "p-3.5 rounded-xl border transition-all cursor-pointer relative",
                    isSelected
                      ? "bg-[var(--accent)]/10 dark:bg-white/[0.08] border-[var(--accent)] shadow-md"
                      : "bg-slate-50 dark:bg-black/30 border border-[var(--border)] hover:border-slate-300 dark:hover:border-white/20 hover:shadow-2xs"
                  )}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          n.status === "Ready" ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-rose-500 shadow-[0_0_8px_#ef4444]"
                        )}
                      />
                      <span className="font-mono font-semibold text-xs text-[var(--foreground)] truncate">
                        {n.name}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-black/5 dark:bg-white/5 text-[var(--foreground)] border border-[var(--border)] shrink-0">
                      {n.roles.join(", ") || "worker"}
                    </span>
                  </div>

                  <div className="space-y-2 text-[11px] text-[var(--muted)] font-mono">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>CPU: {n.cpuAllocated}</span>
                        <span className="text-[var(--foreground)] font-semibold">{n.cpuPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.min(100, n.cpuPercent)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Memory: {n.memoryAllocated}</span>
                        <span className="text-[var(--foreground)] font-semibold">{n.memoryPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 dark:bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, n.memoryPercent)}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
                    <span>{n.version} &bull; {n.architecture}</span>
                    <span className="text-emerald-500 font-medium">{n.activePods} Pods</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Split Grid: Diagnostic Stepper & Warning Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Left: 4-Stage Diagnostic Security Pipeline */}
        <div className="glass-panel p-4 rounded-xl border border-[var(--border)] flex flex-col justify-between space-y-3.5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-xs font-bold text-[var(--foreground)] tracking-tight uppercase">
                  Connection Diagnostics
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--muted)]">k8s.io/client-go</span>
            </div>

            {/* Stages Flow */}
            <div className="space-y-2">
              {/* Stage 1 */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-black/25 border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {netStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      1. Network & TCP Handshake
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-mono truncate">
                      {netStage?.message || "Dialing host API server port..."}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium text-[var(--muted)] shrink-0 px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]">
                  {netStage?.latencyMs ? `${netStage.latencyMs}ms` : "-"}
                </span>
              </div>

              {/* Stage 2 */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-black/25 border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {authStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      2. Authentication & Credentials
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-mono truncate">
                      {authStage?.message || "Verifying certificates..."}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  {authStage?.passed ? "Authorized" : "Pending"}
                </span>
              </div>

              {/* Stage 3 */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-black/25 border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {tlsStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      3. TLS Certificate Authority & Version
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-mono truncate">
                      {tlsStage?.message || "Validating TLS certificate authority..."}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                  {tlsStage?.passed ? "Verified" : "Failed"}
                </span>
              </div>

              {/* Stage 4 */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-black/25 border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {rbacStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      4. RBAC Pre-Flight Verification
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-mono truncate">
                      {rbacStage?.message || "SelfSubjectAccessReview probe..."}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                  {rbacStage?.details?.clusterAdmin !== false ? "ClusterAdmin" : "Scoped"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted)] flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-500">
              <Check className="w-3.5 h-3.5" />
              Credentials Isolated in Host Memory
            </span>
            <span className="font-mono">JSON-RPC 2.0 stdio</span>
          </div>
        </div>

        {/* Right: Live Cluster Events & Warning Stream */}
        <div className="glass-panel p-4 rounded-xl border border-[var(--border)] flex flex-col justify-between space-y-3.5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-[var(--foreground)] tracking-tight uppercase">
                  Warning Events & Incidents
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/25">
                {clusterOverview?.warningEvents?.length ?? 0} Active Warnings
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {!clusterOverview?.warningEvents || clusterOverview.warningEvents.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-black/25 border border-[var(--border)] text-center text-xs text-[var(--muted)] flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span className="font-semibold text-[var(--foreground)]">Cluster Operating Normally</span>
                  <p className="text-[11px] text-[var(--muted)]">No active warning events found across namespaces.</p>
                </div>
              ) : (
                clusterOverview.warningEvents.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-black/25 border border-[var(--border)] transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="font-semibold text-amber-600 dark:text-amber-400 text-[11px]">
                          {ev.reason}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--muted)] font-mono">{ev.lastTimestamp}</span>
                    </div>
                    <p className="text-[11px] text-[var(--muted)] font-mono line-clamp-1">
                      {ev.message}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-[var(--muted)] font-mono pt-0.5">
                      <span>Source: {ev.source || "k8s-event"}</span>
                      {ev.count > 1 && <span>Occurred {ev.count} times</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted)] flex items-center justify-between">
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
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
