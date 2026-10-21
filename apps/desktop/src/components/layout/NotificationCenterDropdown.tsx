"use client";

import * as React from "react";
import {
  Bell,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Activity,
  CheckCircle2,
  RefreshCw,
  Stethoscope,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";

export function NotificationCenterDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const {
    clusterOverview,
    connectionStatus,
    currentContext,
    currentNamespace,
    loadPods,
    loadClusterOverview,
    diagnoseContext,
  } = useClusterStore();

  const { openTab, setActiveTab } = useTabStore();

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleTriageFailingPods = React.useCallback(() => {
    openTab({
      id: "pods",
      title: currentNamespace !== "all" ? `Pods (${currentNamespace})` : "Pods",
      closable: true,
    });
    setActiveTab("pods");
    loadPods(currentNamespace !== "all" ? currentNamespace : "all");
    toast.info("Navigated to Pods browser to triage workloads");
    setIsOpen(false);
  }, [openTab, setActiveTab, loadPods, currentNamespace]);

  const handleInspectWorkloads = React.useCallback(() => {
    openTab({
      id: "pods",
      title: currentNamespace !== "all" ? `Pods (${currentNamespace})` : "Pods",
      closable: true,
    });
    setActiveTab("pods");
    loadPods(currentNamespace !== "all" ? currentNamespace : "all");
    setIsOpen(false);
  }, [openTab, setActiveTab, loadPods, currentNamespace]);

  const handleReviewIncidents = React.useCallback(() => {
    openTab({
      id: "overview",
      title: "Cluster Overview",
      closable: false,
    });
    setActiveTab("overview");
    setIsOpen(false);
    setTimeout(() => {
      const el = document.getElementById("cluster-warning-events-card");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);
  }, [openTab, setActiveTab]);

  const handleRunDiagnostics = async () => {
    toast.info("Running cluster diagnostics...");
    setIsOpen(false);
    await diagnoseContext();
  };

  const handleRefreshTelemetry = async () => {
    toast.info("Refreshing cluster telemetry...");
    await Promise.all([
      loadClusterOverview(currentContext, currentNamespace),
      loadPods(currentNamespace !== "all" ? currentNamespace : "all"),
    ]);
    toast.success("Telemetry updated");
  };

  // Compute cluster health score & active notifications
  const { score, statusLabel, statusColor, deductions } = React.useMemo(() => {
    if (!clusterOverview || connectionStatus === "offline") {
      return {
        score: 0,
        statusLabel: "Offline",
        statusColor: "muted" as const,
        deductions: [],
      };
    }

    let rawScore = 100;
    const items: {
      id: string;
      title: string;
      reason: string;
      penalty: number;
      action?: () => void;
      actionLabel?: string;
      severity: "critical" | "warning" | "info";
    }[] = [];

    // 1. Unready nodes penalty (up to 35 pts)
    if (clusterOverview.totalNodes > 0) {
      const unreadyNodes =
        clusterOverview.totalNodes - clusterOverview.readyNodes;
      if (unreadyNodes > 0) {
        const penalty = Math.min(35, unreadyNodes * 18);
        rawScore -= penalty;
        items.push({
          id: "nodes",
          title: "Node Outage",
          reason: `${unreadyNodes} of ${clusterOverview.totalNodes} node${unreadyNodes > 1 ? "s" : ""} not ready`,
          penalty,
          action: handleReviewIncidents,
          actionLabel: "View Nodes",
          severity: "critical",
        });
      }
    }

    // 2. Failing & Pending pods penalty (up to 30 pts)
    const failed = clusterOverview.failedPods || 0;
    const pending = clusterOverview.pendingPods || 0;
    if (failed > 0) {
      const penalty = Math.min(25, failed * 8);
      rawScore -= penalty;
      items.push({
        id: "failed-pods",
        title: "Failing Pods",
        reason: `${failed} pod${failed > 1 ? "s" : ""} in failing or crash loop state`,
        penalty,
        action: handleTriageFailingPods,
        actionLabel: "Triage Pods",
        severity: "critical",
      });
    }
    if (pending > 2) {
      const penalty = Math.min(10, Math.floor(pending * 2));
      rawScore -= penalty;
      items.push({
        id: "pending-pods",
        title: "Pending Workloads",
        reason: `${pending} pods waiting in pending state`,
        penalty,
        action: handleTriageFailingPods,
        actionLabel: "View Pending",
        severity: "warning",
      });
    }

    // 3. Degraded workloads penalty (up to 25 pts)
    if (clusterOverview.workloads) {
      const degradedDeps =
        clusterOverview.workloads.deployments?.degraded || 0;
      const degradedSts =
        clusterOverview.workloads.statefulSets?.degraded || 0;
      const degradedDs = clusterOverview.workloads.daemonSets?.degraded || 0;
      const totalDegraded = degradedDeps + degradedSts + degradedDs;
      if (totalDegraded > 0) {
        const penalty = Math.min(25, totalDegraded * 10);
        rawScore -= penalty;
        items.push({
          id: "workloads",
          title: "Degraded Workloads",
          reason: `${totalDegraded} workload controller${totalDegraded > 1 ? "s" : ""} degraded or unready`,
          penalty,
          action: handleInspectWorkloads,
          actionLabel: "Inspect Workloads",
          severity: "warning",
        });
      }
    }

    // 4. Warning events penalty (up to 15 pts)
    if (
      clusterOverview.warningEvents &&
      clusterOverview.warningEvents.length > 0
    ) {
      const count = clusterOverview.warningEvents.length;
      const penalty = Math.min(15, count * 2);
      rawScore -= penalty;
      items.push({
        id: "events",
        title: "Warning Events",
        reason: `${count} active warning event${count > 1 ? "s" : ""} recorded`,
        penalty,
        action: handleReviewIncidents,
        actionLabel: "Review Events",
        severity: "info",
      });
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    let label = "Optimal";
    let color: "emerald" | "amber" | "rose" | "muted" = "emerald";

    if (finalScore >= 90) {
      label = "Optimal Health";
      color = "emerald";
    } else if (finalScore >= 70) {
      label = "Degraded Performance";
      color = "amber";
    } else {
      label = "Critical Incidents";
      color = "rose";
    }

    return {
      score: finalScore,
      statusLabel: label,
      statusColor: color,
      deductions: items,
    };
  }, [
    clusterOverview,
    connectionStatus,
    handleTriageFailingPods,
    handleInspectWorkloads,
    handleReviewIncidents,
  ]);

  const hasCritical = deductions.some((d) => d.severity === "critical");
  const hasWarning = deductions.some((d) => d.severity === "warning");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Cluster Notifications & Health Pulse (${deductions.length} active alerts)`}
        title={
          deductions.length > 0
            ? `${deductions.length} active cluster alerts (${score}% health pulse)`
            : "Cluster Notifications & Health (100% optimal)"
        }
        className={cn(
          "relative h-9 w-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          isOpen
            ? "bg-black/[0.08] dark:bg-white/[0.1] text-[var(--foreground)]"
            : "hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)]",
        )}
      >
        <Bell className="w-4 h-4" aria-hidden="true" />

        {/* Notification Count Badge */}
        {deductions.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-0.5 items-center justify-center">
            {hasCritical && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex items-center justify-center rounded-full text-[10px] font-bold font-mono text-white leading-none px-1 h-3.5 min-w-3.5 shadow-xs",
                hasCritical
                  ? "bg-rose-500 shadow-rose-500/40"
                  : hasWarning
                  ? "bg-amber-500 shadow-amber-500/40"
                  : "bg-blue-500 shadow-blue-500/40",
              )}
            >
              {deductions.length}
            </span>
          </span>
        )}
      </button>

      {/* Floating Popover Panel */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-11 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl shadow-black/20 dark:shadow-black/60 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  statusColor === "rose"
                    ? "bg-rose-500 animate-pulse"
                    : statusColor === "amber"
                    ? "bg-amber-500"
                    : "bg-emerald-500",
                )}
              />
              <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                Cluster Notifications
              </span>
            </div>

            {/* Health Score Pill */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase border",
                  statusColor === "rose"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    : statusColor === "amber"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                )}
              >
                {score}% {statusLabel}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Alerts Content List */}
          <div className="max-h-80 overflow-y-auto p-3 space-y-2">
            {deductions.length === 0 ? (
              <div className="py-6 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-[var(--foreground)]">
                  All Systems Healthy
                </div>
                <p className="text-[11px] text-[var(--muted)] max-w-xs mx-auto">
                  Cluster pulse is 100%. No unready workloads, failing pods, or
                  warning events detected.
                </p>
              </div>
            ) : (
              deductions.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]/70 hover:border-[var(--accent)]/40 transition-colors space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.severity === "critical" ? (
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : item.severity === "warning" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-rose-500 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 shrink-0">
                      -{item.penalty} pts
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--muted)] leading-relaxed pl-5">
                    {item.reason}
                  </p>

                  {item.action && item.actionLabel && (
                    <div className="pl-5 pt-0.5">
                      <button
                        type="button"
                        onClick={item.action}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 border-t border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs">
            <span className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[170px]">
              {currentContext}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRunDiagnostics}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Run Diagnostics"
              >
                <Stethoscope className="w-3 h-3" />
                <span>Diagnostics</span>
              </button>
              <button
                type="button"
                onClick={handleRefreshTelemetry}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Refresh Telemetry"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
