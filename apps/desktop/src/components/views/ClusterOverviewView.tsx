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
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Terminal,
  FileCode,
  Sparkles,
  ExternalLink,
  RotateCw,
  HardDrive,
  Radio,
  Zap,
  ChevronRight,
  Check,
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
  } = useClusterStore();
  const { openTab } = useTabStore();
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  // Derived Diagnostic status
  const netStage = diagnosticResult?.stages?.network;
  const authStage = diagnosticResult?.stages?.authentication;
  const tlsStage = diagnosticResult?.stages?.tls;
  const rbacStage = diagnosticResult?.stages?.rbac;

  if (connectionStatus === "offline") {
    return <OfflineState />;
  }

  if (connectionStatus === "checking" && !diagnosticResult) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5 select-none cyber-grid">
      {/* Degraded Warning Banner */}
      {connectionStatus === "degraded" && (
        <ErrorBanner
          message="Cluster connectivity is operating in degraded mode. Some network probes or RBAC checks reported issues."
          actionLabel="Re-run Diagnostics"
          onAction={() => diagnoseContext()}
        />
      )}

      {/* 1. Ambient Glass Hero Banner */}
      <div className="relative overflow-hidden p-5 rounded-2xl glass-panel border border-[var(--border)] shadow-2xl">
        {/* Ambient Gradient Glows */}
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-[var(--accent)]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Logo variant="mark" size="lg" className="drop-shadow-[0_4px_16px_rgba(240,138,66,0.35)]" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[var(--surface)]" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight">
                  Cluster Overview
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-black/[0.05] dark:bg-white/[0.06] text-[var(--foreground)] border border-black/10 dark:border-white/10 shadow-inner">
                  {currentContext || "default"}
                </span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1.5 shadow-xs uppercase tracking-wider",
                  connectionStatus === "connected"
                    ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/25"
                    : connectionStatus === "checking"
                    ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/25"
                    : "bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/25"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    connectionStatus === "connected" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  )} />
                  {connectionStatus === "connected" ? "Active Plane" : connectionStatus === "checking" ? "Probing" : "Unreachable"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-1.5 font-mono">
                <span>Kubernetes <strong className="text-[var(--foreground)] font-semibold">{serverVersion}</strong></span>
                <span>•</span>
                <span>Ping <strong className="text-[var(--foreground)] font-semibold">{latencyMs}ms</strong></span>
                <span>•</span>
                <span className="text-[11px] text-[var(--accent)] font-medium font-sans flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Agentless & Local-First
                </span>
              </div>
            </div>
          </div>

          {/* Quick HUD Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                openTab({ id: "pods", title: "Pods", closable: true });
                toast.info("Navigated to Pods Explorer");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] transition-all cursor-pointer shadow-xs hover:border-[var(--accent)]/50"
            >
              <Box className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Browse Pods</span>
            </button>

            <button
              onClick={async () => {
                toast.info("Running live diagnostic pipeline...");
                await diagnoseContext();
                toast.success("Telemetry updated!");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Re-Test Probes</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Visual Capacity Gauges (SVG Circular Rings & Wave Sparklines) */}
      <div className="grid grid-cols-4 gap-3.5">
        {/* CPU Capacity Card */}
        <div className="glass-card p-4 rounded-xl relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                CPU Capacity
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold font-mono text-[var(--foreground)]">32%</span>
                <span className="text-[10px] text-[var(--muted)] font-mono">/ 16 Cores</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium mt-0.5 inline-block">
                4.8 Cores Allocated
              </span>
            </div>

            {/* Circular SVG Gauge */}
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-black/[0.08] dark:text-white/[0.08]"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[var(--accent)] transition-all duration-1000 ease-out"
                  strokeDasharray="32, 100"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Cpu className="w-4 h-4 text-[var(--accent)] absolute" />
            </div>
          </div>

          {/* Sparkline curve */}
          <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>Peak: 5.2 Cores</span>
            <span className="text-emerald-400 font-mono">Optimal</span>
          </div>
        </div>

        {/* Memory Pressure Card */}
        <div className="glass-card p-4 rounded-xl relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                Memory Usage
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold font-mono text-[var(--foreground)]">58%</span>
                <span className="text-[10px] text-[var(--muted)] font-mono">/ 32 GiB</span>
              </div>
              <span className="text-[11px] text-cyan-400 font-medium mt-0.5 inline-block">
                18.6 GiB Reserved
              </span>
            </div>

            {/* Circular SVG Gauge */}
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-black/[0.08] dark:text-white/[0.08]"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-400 transition-all duration-1000 ease-out"
                  strokeDasharray="58, 100"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Database className="w-4 h-4 text-cyan-400 absolute" />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>Buffer: 13.4 GiB free</span>
            <span className="text-cyan-400 font-mono">No Pressure</span>
          </div>
        </div>

        {/* Pod Density Card */}
        <div
          onClick={() => openTab({ id: "pods", title: "Pods", closable: true })}
          className="glass-card p-4 rounded-xl relative overflow-hidden group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                Pod Allocation
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold font-mono text-[var(--foreground)]">42</span>
                <span className="text-[10px] text-[var(--muted)] font-mono">/ 110 Max</span>
              </div>
              <span className="text-[11px] text-purple-400 font-medium mt-0.5 inline-block">
                38% Node Density
              </span>
            </div>

            {/* Circular SVG Gauge */}
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-black/[0.08] dark:text-white/[0.08]"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-purple-400 transition-all duration-1000 ease-out"
                  strokeDasharray="38, 100"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Box className="w-4 h-4 text-purple-400 absolute" />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>40 Running • 2 Pending</span>
            <span className="text-[var(--accent)] font-medium flex items-center gap-0.5">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Network & Ingress Throughput */}
        <div className="glass-card p-4 rounded-xl relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                Ingress Flow
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold font-mono text-[var(--foreground)]">14.2</span>
                <span className="text-[10px] text-[var(--muted)] font-mono">MB/s</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium mt-0.5 inline-block">
                8 Services • 3 Ingresses
              </span>
            </div>

            {/* Circular SVG Gauge */}
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-black/[0.08] dark:text-white/[0.08]"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-1000 ease-out"
                  strokeDasharray="45, 100"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Radio className="w-4 h-4 text-emerald-400 absolute" />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>Latency: {latencyMs}ms roundtrip</span>
            <span className="text-emerald-400 font-mono">Normal</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Visual Node Topology Strip */}
      <div className="p-4 rounded-xl glass-panel border border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
              Cluster Node Topology & Infrastructure
            </h2>
            <span className="text-[10px] font-mono text-[var(--muted)]">3 Nodes Active</span>
          </div>
          <span className="text-[11px] text-[var(--muted)]">Click node to inspect telemetry</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Node 1: Control Plane */}
          <div
            onClick={() => setSelectedNode("kind-control-plane")}
            className={cn(
              "p-3.5 rounded-xl border transition-all cursor-pointer relative",
              selectedNode === "kind-control-plane"
                ? "bg-[var(--accent)]/10 dark:bg-white/[0.08] border-[var(--accent)] shadow-lg"
                : "bg-slate-50/70 dark:bg-black/30 border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="font-mono font-semibold text-xs text-[var(--foreground)] truncate">
                  kind-control-plane
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/25">
                Control-Plane
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-[var(--muted)] font-mono">
              <div className="flex justify-between">
                <span>CPU Load:</span>
                <span className="text-[var(--foreground)]">45m (2%)</span>
              </div>
              <div className="w-full h-1 bg-black/[0.08] dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: "15%" }} />
              </div>

              <div className="flex justify-between pt-1">
                <span>Memory:</span>
                <span className="text-[var(--foreground)]">482Mi (12%)</span>
              </div>
              <div className="w-full h-1 bg-black/[0.08] dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: "22%" }} />
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
              <span>v1.34.1 • arm64</span>
              <span className="text-emerald-500 dark:text-emerald-400">14 Pods</span>
            </div>
          </div>

          {/* Node 2: Worker 1 */}
          <div
            onClick={() => setSelectedNode("kind-worker-1")}
            className={cn(
              "p-3.5 rounded-xl border transition-all cursor-pointer relative",
              selectedNode === "kind-worker-1"
                ? "bg-[var(--accent)]/10 dark:bg-white/[0.08] border-[var(--accent)] shadow-lg"
                : "bg-slate-50/70 dark:bg-black/30 border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="font-mono font-semibold text-xs text-[var(--foreground)] truncate">
                  kind-worker-1
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/25">
                Worker
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-[var(--muted)] font-mono">
              <div className="flex justify-between">
                <span>CPU Load:</span>
                <span className="text-[var(--foreground)]">210m (18%)</span>
              </div>
              <div className="w-full h-1 bg-black/[0.08] dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: "35%" }} />
              </div>

              <div className="flex justify-between pt-1">
                <span>Memory:</span>
                <span className="text-[var(--foreground)]">1.4Gi (44%)</span>
              </div>
              <div className="w-full h-1 bg-black/[0.08] dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: "44%" }} />
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
              <span>v1.34.1 • arm64</span>
              <span className="text-emerald-500 dark:text-emerald-400">16 Pods</span>
            </div>
          </div>

          {/* Node 3: Worker 2 */}
          <div
            onClick={() => setSelectedNode("kind-worker-2")}
            className={cn(
              "p-3.5 rounded-xl border transition-all cursor-pointer relative",
              selectedNode === "kind-worker-2"
                ? "bg-[var(--accent)]/10 dark:bg-white/[0.08] border-[var(--accent)] shadow-lg"
                : "bg-slate-50/70 dark:bg-black/30 border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="font-mono font-semibold text-xs text-[var(--foreground)] truncate">
                  kind-worker-2
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/25">
                Worker
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-[var(--muted)] font-mono">
              <div className="flex justify-between">
                <span>CPU Load:</span>
                <span className="text-[var(--foreground)]">120m (11%)</span>
              </div>
              <div className="w-full h-1 bg-black/[0.08] dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: "22%" }} />
              </div>

              <div className="flex justify-between pt-1">
                <span>Memory:</span>
                <span className="text-[var(--foreground)]">980Mi (31%)</span>
              </div>
              <div className="w-full h-1 bg-black/[0.08] dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: "31%" }} />
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
              <span>v1.34.1 • arm64</span>
              <span className="text-emerald-500 dark:text-emerald-400">12 Pods</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Split Grid: Visual Diagnostic Pipeline & Real-Time Warning Stream */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: 4-Stage Diagnostic Security Pipeline */}
        <div className="glass-panel p-4 rounded-xl border border-[var(--border)] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-xs font-bold text-[var(--foreground)] tracking-tight uppercase">
                  Automated 4-Stage Connection Diagnostics
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--muted)]">k8s.io/client-go</span>
            </div>

            {/* Stages Flow */}
            <div className="space-y-2.5">
              {/* Stage 1 */}
              <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-black/30 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {netStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      1. Network & TCP Handshake
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-mono truncate">
                      {netStage?.message || "Dialing host API server port..."}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-medium text-[var(--muted)] shrink-0">
                  {netStage?.latencyMs ? `${netStage.latencyMs}ms` : "-"}
                </span>
              </div>

              {/* Stage 2 */}
              <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-black/30 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {authStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      2. Authentication & Credential Provider
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-mono truncate">
                      {authStage?.message || "Verifying exec plugin or certificates..."}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  {authStage?.passed ? "Authorized" : "Pending"}
                </span>
              </div>

              {/* Stage 3 */}
              <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-black/30 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {tlsStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      3. TLS CA Verification & /version
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-mono truncate">
                      {tlsStage?.message || "Validating TLS certificate authority..."}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                  {tlsStage?.passed ? "Healthy" : "Failed"}
                </span>
              </div>

              {/* Stage 4 */}
              <div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-black/30 border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {rbacStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  ) : connectionStatus === "checking" ? (
                    <RotateCw className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-spin shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  )}
                  <div>
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

            {/* Remediation Advice */}
            {diagnosticResult?.remediation && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-200 text-xs">
                <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Remediation Recommendation
                </div>
                <p className="font-mono text-[11px] leading-relaxed opacity-95">
                  {diagnosticResult.remediation}
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted)] flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              Credentials Isolated in Host Memory
            </span>
            <span className="font-mono">JSON-RPC 2.0 stdio</span>
          </div>
        </div>

        {/* Right: Live Cluster Events & Warning Stream */}
        <div className="glass-panel p-4 rounded-xl border border-[var(--border)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-[var(--foreground)] tracking-tight uppercase">
                  Warning Events & Incidents
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/25">
                2 Active Warnings
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Event 1 */}
              <div
                onClick={() => openInspector({ kind: "Pod", name: "api-gateway-7f8d-x9q", namespace: "production", status: "CrashLoopBackOff" })}
                className="p-3 rounded-lg bg-slate-50/70 dark:bg-black/30 border border-black/[0.08] dark:border-white/[0.08] hover:border-amber-400/50 cursor-pointer transition-all hover:bg-black/[0.03] dark:hover:bg-white/[0.04] group"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-semibold text-amber-500 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300">
                      CrashLoopBackOff
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--muted)] font-mono">2m ago</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-1.5 font-mono">
                  Back-off restarting failed container in pod <strong className="text-[var(--foreground)]">api-gateway-7f8d-x9q</strong>
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
                  <span>ns: production</span>
                  <span className="text-[var(--accent)] font-sans font-medium flex items-center gap-0.5">
                    Live Diagnostics <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Event 2 */}
              <div
                onClick={() => openInspector({ kind: "Pod", name: "analytics-worker-2", namespace: "default", status: "Pending" })}
                className="p-3 rounded-lg bg-slate-50/70 dark:bg-black/30 border border-black/[0.08] dark:border-white/[0.08] hover:border-rose-400/50 cursor-pointer transition-all hover:bg-black/[0.03] dark:hover:bg-white/[0.04] group"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="font-semibold text-rose-500 dark:text-rose-400 group-hover:text-rose-600 dark:group-hover:text-rose-300">
                      FailedScheduling
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--muted)] font-mono">5m ago</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-1.5 font-mono">
                  0/3 nodes available: insufficient memory for pod <strong className="text-[var(--foreground)]">analytics-worker-2</strong>
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
                  <span>ns: default</span>
                  <span className="text-[var(--accent)] font-sans font-medium flex items-center gap-0.5">
                    Inspect Resource <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted)] flex items-center justify-between">
            <span>Aggregated across {availableNamespaces.length} namespaces</span>
            <button
              onClick={() => {
                openTab({ id: "pods", title: "Pods", closable: true });
              }}
              className="text-[var(--accent)] hover:underline cursor-pointer"
            >
              View Full Audit Log →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
