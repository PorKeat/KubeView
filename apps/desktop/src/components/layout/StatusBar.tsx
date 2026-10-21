"use client";

import * as React from "react";
import {
  ShieldCheck,
  Shield,
  Bell,
  Terminal,
  Check,
  Copy,
  Cpu,
  AlertTriangle,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const {
    currentContext,
    currentNamespace,
    latencyMs,
    serverVersion,
    rbacMode,
    connectionStatus,
    clusterOverview,
    openKubeconfigModal,
    diagnoseContext,
  } = useClusterStore();

  const { openTab, setActiveTab } = useTabStore();
  const [copied, setCopied] = React.useState(false);
  const [isDiagnosing, setIsDiagnosing] = React.useState(false);

  const warningEvents = clusterOverview?.warningEvents ?? [];
  const warningCount = warningEvents.length;

  const copyVersion = () => {
    navigator.clipboard.writeText(`Kubernetes ${serverVersion} (${currentContext})`);
    setCopied(true);
    toast.success("Cluster details copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePing = async () => {
    if (isDiagnosing || !currentContext) return;
    setIsDiagnosing(true);
    try {
      await diagnoseContext(currentContext);
      toast.success("Telemetry refreshed");
    } catch {
      // Ignored - store handles error state
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleReviewIncidents = React.useCallback(() => {
    openTab({
      id: "overview",
      title: "Cluster Overview",
      closable: false,
    });
    setActiveTab("overview");
    setTimeout(() => {
      const el = document.getElementById("cluster-warning-events-card");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  }, [openTab, setActiveTab]);

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          label: "Connected",
          color: "text-emerald-600 dark:text-emerald-400",
          beacon: "bg-emerald-500",
          ping: true,
        };
      case "degraded":
        return {
          label: "Degraded",
          color: "text-amber-600 dark:text-amber-400",
          beacon: "bg-amber-500",
          ping: false,
        };
      case "checking":
        return {
          label: "Connecting...",
          color: "text-amber-600 dark:text-amber-400",
          beacon: "bg-amber-500",
          ping: true,
        };
      case "offline":
      default:
        return {
          label: "Offline",
          color: "text-rose-600 dark:text-rose-400",
          beacon: "bg-rose-500",
          ping: false,
        };
    }
  };

  const status = getStatusDisplay();

  // Format latency cleanly
  const latencyDisplay = React.useMemo(() => {
    if (latencyMs === 0 && connectionStatus === "checking") return "--";
    if (latencyMs >= 1000) {
      return `${(latencyMs / 1000).toFixed(1)}s`;
    }
    return `${latencyMs}ms`;
  }, [latencyMs, connectionStatus]);

  const latencyColor = React.useMemo(() => {
    if (latencyMs > 1500) return "text-amber-600 dark:text-amber-400";
    if (latencyMs > 3000) return "text-rose-600 dark:text-rose-400";
    return "text-[var(--muted)]";
  }, [latencyMs]);

  return (
    <footer className="h-7 w-full border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xs flex items-center justify-between px-3 sm:px-4 text-[11px] text-[var(--muted)] select-none shrink-0 overflow-x-auto scrollbar-none font-sans">
      {/* Left: Cluster Telemetry & Active Scope */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Connection Status & Latency Beacon */}
        <button
          type="button"
          onClick={handlePing}
          className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer group"
          title={`Status: ${status.label} (${latencyMs}ms latency) • Click to ping`}
        >
          <span className="relative flex h-2 w-2">
            {status.ping && (
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  status.beacon
                )}
              />
            )}
            <span className={cn("relative inline-flex rounded-full h-2 w-2", status.beacon)} />
          </span>
          <span className={cn("font-medium", status.color)}>{status.label}</span>
          <span className={cn("text-[10px] font-mono tabular-nums opacity-90", latencyColor)}>
            ({latencyDisplay})
          </span>
        </button>

        <span className="text-[var(--border)] select-none text-[10px] hidden xs:inline">•</span>

        {/* Active Context Chip */}
        <button
          type="button"
          onClick={() => openKubeconfigModal?.("browse")}
          className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[var(--foreground)] transition-colors cursor-pointer group"
          title={`Context: ${currentContext || "None"} • Click to switch cluster`}
        >
          <Terminal className="w-3 h-3 text-[var(--accent)] shrink-0 opacity-80 group-hover:opacity-100" />
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider hidden sm:inline">
            ctx:
          </span>
          <span className="font-mono font-medium text-[var(--foreground)] truncate max-w-[150px] sm:max-w-[210px] md:max-w-[280px]">
            {currentContext || "No context"}
          </span>
        </button>

        <span className="text-[var(--border)] select-none text-[10px] hidden sm:inline">•</span>

        {/* Namespace Badge */}
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[var(--muted)]"
          title={`Active Namespace Scope: ${currentNamespace}`}
        >
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider hidden sm:inline">
            ns:
          </span>
          <span className="font-mono font-medium text-[var(--foreground)] bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--border)] px-1.5 py-0.2 rounded text-[10px]">
            {currentNamespace}
          </span>
        </div>
      </div>

      {/* Right: Runtime Engine, RBAC Security, Version & Incident Telemetry */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Go Engine Sidecar Runtime Chip */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 select-none"
          title="Go client-go Sidecar runtime active (v1.23)"
        >
          <Cpu className="w-3 h-3 text-[var(--accent)] shrink-0" />
          <span>Go Engine 1.23</span>
        </div>

        {/* RBAC Security Guard Chip */}
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border select-none",
            rbacMode === "cluster-admin"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
          )}
          title={
            rbacMode === "cluster-admin"
              ? "RBAC: SelfSubjectAccessReview Pre-Flight Enforcement Active (ClusterAdmin)"
              : "RBAC: Namespace-scoped permissions active"
          }
        >
          {rbacMode === "cluster-admin" ? (
            <ShieldCheck className="w-3 h-3 shrink-0" />
          ) : (
            <Shield className="w-3 h-3 shrink-0" />
          )}
          <span className="capitalize">{rbacMode === "cluster-admin" ? "ClusterAdmin" : "Scoped"}</span>
        </div>

        {/* Kubernetes Server Version (Clickable to copy) */}
        <button
          type="button"
          onClick={copyVersion}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Click to copy Kubernetes version to clipboard"
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
          ) : (
            <Copy className="w-3 h-3 opacity-60 shrink-0" />
          )}
          <span className="tabular-nums">{serverVersion}</span>
        </button>

        {/* Cluster Incidents Telemetry / Notification Bell */}
        {warningCount > 0 ? (
          <button
            type="button"
            onClick={handleReviewIncidents}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-colors cursor-pointer"
            title={`${warningCount} Active Warning Events • Click to review in Overview`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
            <span className="tabular-nums">{warningCount} Active</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toast.info("All cluster workloads healthy — 0 active warnings")}
            className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="0 active warnings — Cluster healthy"
          >
            <Bell className="w-3 h-3 opacity-70" />
          </button>
        )}
      </div>
    </footer>
  );
}
