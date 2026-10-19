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
  LayoutGrid,
  List,
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
  const [nodeViewMode, setNodeViewMode] = React.useState<"grid" | "table">("grid");

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
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 select-none max-w-7xl mx-auto w-full">
      {/* Degraded Warning Banner (Semantic Warning: 10% accent) */}
      {connectionStatus === "degraded" && (
        <ErrorBanner
          message="Cluster connectivity is operating in degraded mode. Some network probes or RBAC checks reported issues."
          actionLabel="Re-run Diagnostics"
          onAction={() => diagnoseContext()}
        />
      )}

      {/* 1. Page Header (60% Dominant canvas + 30% Structural scaffolding + 10% Brand/Status accent) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]/60">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
              <Logo variant="mark" size="md" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              {connectionStatus === "connected" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5 border border-[var(--surface)]",
                  connectionStatus === "connected"
                    ? "bg-emerald-500"
                    : connectionStatus === "checking"
                    ? "bg-amber-400"
                    : "bg-rose-500"
                )}
              />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight">
                Cluster Overview
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]">
                {currentContext || "default"}
              </span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono border inline-flex items-center gap-1.5 uppercase tracking-wider",
                  connectionStatus === "connected"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                    : connectionStatus === "checking"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    connectionStatus === "connected"
                      ? "bg-emerald-500 animate-pulse"
                      : connectionStatus === "checking"
                      ? "bg-amber-400"
                      : "bg-rose-500"
                  )}
                />
                {connectionStatus === "connected" ? "Active" : connectionStatus === "checking" ? "Probing" : "Offline"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--muted)] font-mono mt-1 flex-wrap">
              <span>Kubernetes <strong className="text-[var(--foreground)] font-medium">{serverVersion}</strong></span>
              <span className="text-[var(--border)]">&bull;</span>
              <span>
                Ping{" "}
                <strong
                  className={cn(
                    "font-medium",
                    latencyMs < 300
                      ? "text-emerald-600 dark:text-emerald-400"
                      : latencyMs < 800
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {latencyMs}ms
                </strong>
              </span>
              <span className="text-[var(--border)]">&bull;</span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Local-First & Agentless
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions (10% Intentional Accent on Primary Action) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setCurrentNamespace("all");
              openTab({ id: "pods", title: "Pods", closable: true });
              loadPods("all");
              toast.info(`Showing all ${clusterOverview?.totalPods ?? 0} pods across namespaces`);
            }}
            aria-label={`Browse all ${clusterOverview?.totalPods ?? 0} pods across namespaces`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer hover:border-[var(--accent)]/40 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <Box className="w-4 h-4 text-[var(--muted)]" aria-hidden="true" />
            <span>Browse Pods ({clusterOverview?.totalPods ?? 0})</span>
          </button>

          <button
            onClick={async () => {
              toast.info("Refreshing cluster telemetry...");
              await Promise.all([diagnoseContext(), loadClusterOverview()]);
              toast.success("Telemetry refreshed!");
            }}
            aria-label="Refresh cluster telemetry and diagnostics"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-hidden"
          >
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Metric Strip (design-taste-frontend: Type-led KPIs, no redundant icon tiles, sentence-case) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CPU Capacity */}
        <div className="group p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between space-y-3.5 hover:border-[var(--accent)]/40 hover:bg-[var(--surface-hover)]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted)]">
              CPU Allocation
            </span>
            <span className="text-xs font-mono text-[var(--muted)]">
              {clusterOverview?.totalCpuCores ?? 0} Cores Total
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.cpuPercent ?? 0}%
              </span>
            </div>

            {/* Semantic Utilization Progress Bar */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  (clusterOverview?.cpuPercent ?? 0) > 85
                    ? "bg-rose-500"
                    : (clusterOverview?.cpuPercent ?? 0) > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500 dark:bg-emerald-400"
                )}
                style={{ width: `${Math.min(100, clusterOverview?.cpuPercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)]/70 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span>{clusterOverview?.allocatedCpuCores ?? 0} Cores Allocated</span>
            <span
              className={cn(
                "font-semibold",
                (clusterOverview?.cpuPercent ?? 0) > 85
                  ? "text-rose-600 dark:text-rose-400"
                  : (clusterOverview?.cpuPercent ?? 0) > 70
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {(clusterOverview?.cpuPercent ?? 0) > 85 ? "Critical" : (clusterOverview?.cpuPercent ?? 0) > 70 ? "High Load" : "Healthy"}
            </span>
          </div>
        </div>

        {/* Card 2: Memory Usage */}
        <div className="group p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between space-y-3.5 hover:border-[var(--accent)]/40 hover:bg-[var(--surface-hover)]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted)]">
              Memory Usage
            </span>
            <span className="text-xs font-mono text-[var(--muted)]">
              {clusterOverview?.totalMemoryGiB ?? 0} GiB Total
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.memoryPercent ?? 0}%
              </span>
            </div>

            {/* Semantic Utilization Progress Bar */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  (clusterOverview?.memoryPercent ?? 0) > 85
                    ? "bg-rose-500"
                    : (clusterOverview?.memoryPercent ?? 0) > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500 dark:bg-emerald-400"
                )}
                style={{ width: `${Math.min(100, clusterOverview?.memoryPercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)]/70 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span>{clusterOverview?.allocatedMemoryGiB ?? 0} GiB Reserved</span>
            <span
              className={cn(
                "font-semibold",
                (clusterOverview?.memoryPercent ?? 0) > 85
                  ? "text-rose-600 dark:text-rose-400"
                  : (clusterOverview?.memoryPercent ?? 0) > 70
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {(clusterOverview?.memoryPercent ?? 0) > 85 ? "Critical" : (clusterOverview?.memoryPercent ?? 0) > 70 ? "High Load" : "Optimal"}
            </span>
          </div>
        </div>

        {/* Card 3: Pod Density */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`Pod density: ${clusterOverview?.totalPods ?? 0} of ${clusterOverview?.podCapacity ?? 0} pods. Press Enter or Space to view pods explorer.`}
          onClick={() => {
            setCurrentNamespace("all");
            openTab({ id: "pods", title: "Pods", closable: true });
            loadPods("all");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setCurrentNamespace("all");
              openTab({ id: "pods", title: "Pods", closable: true });
              loadPods("all");
            }
          }}
          className="group p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between space-y-3.5 cursor-pointer hover:border-[var(--accent)]/40 hover:bg-[var(--surface-hover)]/40 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted)]">
              Pod Density
            </span>
            <span className="text-xs font-mono text-[var(--muted)]">
              {clusterOverview?.podCapacity ?? 0} Capacity
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.totalPods ?? 0}
              </span>
              <span className="text-xs text-[var(--muted)] font-mono">
                / {clusterOverview?.podCapacity ?? 0}
              </span>
            </div>

            {/* Semantic Pod Utilization Bar */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  (clusterOverview?.podPercent ?? 0) > 85
                    ? "bg-rose-500"
                    : (clusterOverview?.podPercent ?? 0) > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500 dark:bg-emerald-400"
                )}
                style={{ width: `${Math.min(100, clusterOverview?.podPercent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)]/70 flex items-center justify-between text-xs text-[var(--muted)] font-mono">
            <span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{clusterOverview?.runningPods ?? 0}</strong> Running
              {" "}&bull;{" "}
              <strong className={clusterOverview?.pendingPods ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-[var(--muted)] font-normal"}>
                {clusterOverview?.pendingPods ?? 0}
              </strong> Pending
            </span>
            <span className="text-[var(--accent)] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-sans">
              View &rarr;
            </span>
          </div>
        </div>

        {/* Card 4: Cluster Nodes */}
        <div className="group p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between space-y-3.5 hover:border-[var(--accent)]/40 hover:bg-[var(--surface-hover)]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted)]">
              Cluster Nodes
            </span>
            <span className="text-xs font-mono text-[var(--muted)]">
              {clusterOverview?.totalNodes ?? 0} Total
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                {clusterOverview?.readyNodes ?? 0}
              </span>
              <span className="text-xs text-[var(--muted)] font-mono">
                / {clusterOverview?.totalNodes ?? 0} Ready
              </span>
            </div>

            {/* Semantic Node Availability Bar */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  clusterOverview?.totalNodes && clusterOverview.readyNodes === clusterOverview.totalNodes
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-amber-500"
                )}
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
            <span
              className={cn(
                "font-semibold",
                latencyMs < 300
                  ? "text-emerald-600 dark:text-emerald-400"
                  : latencyMs < 800
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {latencyMs}ms Ping
            </span>
          </div>
        </div>
      </div>
      {/* 3. Node Topology & Infrastructure (Architectural Layout & Typographic Rhythm) */}
      <div className="space-y-3.5">
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
              &bull; {clusterOverview?.readyNodes ?? 0} Ready &bull; {clusterOverview?.totalCpuCores ?? 0} Cores Total &bull; {clusterOverview?.totalMemoryGiB ?? 0} GiB Total
            </span>
          </div>

          {/* High-Craft Segmented View Switcher: Matrix Cards vs Telemetry Table */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-[var(--muted)] font-mono hidden lg:inline">
              Click node to inspect
            </span>
            <div className="flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono" role="group" aria-label="Nodes view mode">
              <button
                type="button"
                onClick={() => setNodeViewMode("grid")}
                aria-pressed={nodeViewMode === "grid"}
                aria-label="Grid layout view"
                className={cn(
                  "px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                  nodeViewMode === "grid"
                    ? "bg-[var(--surface-active)] text-[var(--foreground)] font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
                title="Matrix Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setNodeViewMode("table")}
                aria-pressed={nodeViewMode === "table"}
                aria-label="Table telemetry view"
                className={cn(
                  "px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                  nodeViewMode === "table"
                    ? "bg-[var(--surface-active)] text-[var(--foreground)] font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
                title="Telemetry Table View"
              >
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nodes.map((n) => {
              const isSelected = selectedNode === n.name;
              const isNodeReady = n.status === "Ready";
              const openNodeInspector = () => {
                setSelectedNode(n.name);
                openInspector({
                  kind: "Node",
                  name: n.name,
                  namespace: "Cluster Scope",
                  status: n.status,
                  data: {
                    name: n.name,
                    status: n.status,
                    roles: n.roles,
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
              };

              return (
                <div
                  key={n.name}
                  role="button"
                  tabIndex={0}
                  aria-label={`Node ${n.name}, status ${n.status}, CPU ${n.cpuPercent} percent, memory ${n.memoryPercent} percent. Press Enter or Space to inspect.`}
                  onClick={openNodeInspector}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openNodeInspector();
                    }
                  }}
                  className={cn(
                    "group p-5 rounded-xl border transition-all cursor-pointer bg-[var(--surface)] space-y-4 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                    isSelected
                      ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/30 bg-[var(--surface-hover)]"
                      : "border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-hover)]/40"
                  )}
                >
                  {/* Top Line: Host Identity & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          isNodeReady ? "bg-emerald-500" : "bg-rose-500"
                        )}
                        aria-hidden="true"
                      />
                      <span className="font-mono font-bold text-xs text-[var(--foreground)] truncate tracking-tight">
                        {n.name}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold",
                          isNodeReady
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        )}
                      >
                        {n.status}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--surface-hover)] text-[var(--muted)] border border-[var(--border)] shrink-0">
                      {n.roles.join(", ") || "worker"}
                    </span>
                  </div>

                  {/* Architecture & Host Specs Bar */}
                  <div className="text-[11px] font-mono text-[var(--muted)] flex items-center justify-between pb-1 border-b border-[var(--border)]/60">
                    <span>IP: <strong className="text-[var(--foreground)] font-medium">{n.internalIP}</strong></span>
                    <span>{n.architecture} &bull; {n.version}</span>
                  </div>

                  {/* Precision Allocation Rhythms */}
                  <div className="space-y-3 font-mono text-xs">
                    {/* CPU Barometer */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--muted)]">CPU Allocation</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--foreground)] tabular-nums">{n.cpuAllocated}</span>
                          <span className="text-[var(--muted)]">/ {n.cpuCapacity}</span>
                          <span
                            className={cn(
                              "font-semibold text-xs ml-1",
                              n.cpuPercent > 85
                                ? "text-rose-600 dark:text-rose-400"
                                : n.cpuPercent > 70
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-[var(--foreground)]"
                            )}
                          >
                            {n.cpuPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            n.cpuPercent > 85
                              ? "bg-rose-500"
                              : n.cpuPercent > 70
                              ? "bg-amber-500"
                              : "bg-emerald-500 dark:bg-emerald-400"
                          )}
                          style={{ width: `${Math.min(100, n.cpuPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Memory Barometer */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--muted)]">Memory Reserved</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--foreground)] tabular-nums">{n.memoryAllocated}</span>
                          <span className="text-[var(--muted)]">/ {n.memoryCapacity}</span>
                          <span
                            className={cn(
                              "font-semibold text-xs ml-1",
                              n.memoryPercent > 85
                                ? "text-rose-600 dark:text-rose-400"
                                : n.memoryPercent > 70
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-[var(--foreground)]"
                            )}
                          >
                            {n.memoryPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            n.memoryPercent > 85
                              ? "bg-rose-500"
                              : n.memoryPercent > 70
                              ? "bg-amber-500"
                              : "bg-emerald-500 dark:bg-emerald-400"
                          )}
                          style={{ width: `${Math.min(100, n.memoryPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Pod Density Barometer */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--muted)]">Pod Density</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">{n.activePods}</span>
                          <span className="text-[var(--muted)]">/ {n.podCapacity}</span>
                          <span className="font-medium text-[var(--foreground)] text-xs ml-1">
                            {n.podCapacity ? Math.round((n.activePods * 100) / n.podCapacity) : 0}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
                          style={{
                            width: `${
                              n.podCapacity ? Math.min(100, (n.activePods * 100) / n.podCapacity) : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Affordance & Telemetry */}
                  <div className="pt-3 border-t border-[var(--border)]/70 flex items-center justify-between text-[11px] text-[var(--muted)] font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Ready</span>
                    </span>
                    <span className="text-[var(--accent)] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Inspect Node &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* High-Density Topology Telemetry Table View */
          <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]/40 text-[11px] text-[var(--muted)]">
                    <th className="py-2.5 px-3.5 font-medium">Node</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Roles</th>
                    <th className="py-2.5 px-3 font-medium">Internal IP</th>
                    <th className="py-2.5 px-3 font-medium text-right">CPU Alloc</th>
                    <th className="py-2.5 px-3 font-medium text-right">RAM Alloc</th>
                    <th className="py-2.5 px-3 font-medium text-right">Pods</th>
                    <th className="py-2.5 px-3 font-medium">Version</th>
                    <th className="py-2.5 px-3.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60">
                  {nodes.map((n) => {
                    const isSelected = selectedNode === n.name;
                    const isNodeReady = n.status === "Ready";
                    const openNodeInspector = () => {
                      setSelectedNode(n.name);
                      openInspector({
                        kind: "Node",
                        name: n.name,
                        namespace: "Cluster Scope",
                        status: n.status,
                        data: {
                          name: n.name,
                          status: n.status,
                          roles: n.roles,
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
                    };

                    return (
                      <tr
                        key={n.name}
                        onClick={openNodeInspector}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openNodeInspector();
                          }
                        }}
                        className={cn(
                          "hover:bg-[var(--surface-hover)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                          isSelected && "bg-[var(--surface-hover)] font-semibold"
                        )}
                      >
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                isNodeReady ? "bg-emerald-500" : "bg-rose-500"
                              )}
                              aria-hidden="true"
                            />
                            <span className="font-bold text-[var(--foreground)]">{n.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold",
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
                          <span className="tabular-nums text-[var(--foreground)] font-medium">
                            {n.cpuAllocated} ({n.cpuPercent}%)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="tabular-nums text-[var(--foreground)] font-medium">
                            {n.memoryAllocated} ({n.memoryPercent}%)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                            {n.activePods} / {n.podCapacity}
                          </span>
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
        )}
      </div>

      {/* 4. Split Grid: Diagnostics & Warning Incidents (Strict Semantic Success/Warning/Error/Info) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: 4-Stage Diagnostic Security Pipeline */}
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
                  Connection Diagnostics
                </h3>
              </div>
              <span className="text-xs font-mono text-[var(--muted)]">k8s.io/client-go</span>
            </div>

            {/* Seamless Divided Stages */}
            <div className="divide-y divide-[var(--border)]/60">
              {/* Stage 1: Network & TCP */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {netStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
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
                <span className="text-[11px] font-mono font-medium text-[var(--muted)] shrink-0 px-2.5 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)]">
                  {netStage?.latencyMs ? `${netStage.latencyMs}ms` : "-"}
                </span>
              </div>

              {/* Stage 2: Authentication */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {authStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
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
                <span
                  className={cn(
                    "text-[10px] font-mono font-medium px-2.5 py-0.5 rounded border shrink-0",
                    authStage?.passed
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  )}
                >
                  {authStage?.passed ? "Authorized" : "Pending"}
                </span>
              </div>

              {/* Stage 3: TLS */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {tlsStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
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
                <span
                  className={cn(
                    "text-[10px] font-mono font-medium px-2.5 py-0.5 rounded border shrink-0",
                    tlsStage?.passed
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  )}
                >
                  {tlsStage?.passed ? "Verified" : "Failed"}
                </span>
              </div>

              {/* Stage 4: RBAC */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {rbacStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
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
                <span
                  className={cn(
                    "text-[10px] font-mono font-medium px-2.5 py-0.5 rounded border shrink-0",
                    rbacStage?.details?.clusterAdmin !== false
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  )}
                >
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
            <span className="font-mono text-[11px] text-[var(--muted)]">JSON-RPC 2.0 stdio</span>
          </div>
        </div>

        {/* Right: Live Cluster Events & Warning Stream (Semantic Warning & Error Mapping) */}
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]/70">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
                  Warning Events & Incidents
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {clusterOverview?.warningEvents?.length ?? 0} Active
              </span>
            </div>

            <div className="divide-y divide-[var(--border)]/60 max-h-56 overflow-y-auto pr-1">
              {!clusterOverview?.warningEvents || clusterOverview.warningEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--muted)] flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span className="font-semibold text-[var(--foreground)]">Cluster Operating Normally</span>
                  <p className="text-[11px] text-[var(--muted)]">No active warning events found across namespaces.</p>
                </div>
              ) : (
                clusterOverview.warningEvents.map((ev, idx) => {
                  const isSevere =
                    ev.reason?.toLowerCase().includes("fail") ||
                    ev.message?.toLowerCase().includes("fail") ||
                    ev.message?.toLowerCase().includes("backoff");

                  return (
                    <div key={idx} className="py-3 first:pt-2 last:pb-1 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              isSevere ? "bg-rose-500" : "bg-amber-500"
                            )}
                          />
                          <span
                            className={cn(
                              "font-semibold text-xs",
                              isSevere
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {ev.reason}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--muted)] font-mono">{ev.lastTimestamp}</span>
                      </div>
                      <p className="text-xs text-[var(--muted)] font-mono line-clamp-1 pl-3.5" title={ev.message}>
                        {ev.message}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[var(--muted)] font-mono pl-3.5 pt-0.5">
                        <span>Source: {ev.source || "k8s-event"}</span>
                        {ev.count > 1 && <span>Occurred {ev.count} times</span>}
                      </div>
                    </div>
                  );
                })
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
              aria-label="View pods explorer"
              className="text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1 font-medium focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded focus-visible:outline-hidden"
            >
              <span>View Pods Explorer</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
