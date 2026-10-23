"use client";

import * as React from "react";
import {
  Bell,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  RefreshCw,
  Stethoscope,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import { Tooltip } from "@/components/ui/Tooltip";

interface ClusterAlertItem {
  id: string;
  title: string;
  reason: string;
  badge: string;
  action: () => void;
  actionLabel: string;
  severity: "critical" | "warning";
}

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

  // Close on outside click and Escape key
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

  // Compile active cluster alerts
  const alerts = React.useMemo<ClusterAlertItem[]>(() => {
    if (!clusterOverview || connectionStatus === "offline") {
      return [];
    }

    const items: ClusterAlertItem[] = [];

    // 1. Unready nodes (Critical)
    if (clusterOverview.totalNodes > 0) {
      const unreadyNodes =
        clusterOverview.totalNodes - clusterOverview.readyNodes;
      if (unreadyNodes > 0) {
        items.push({
          id: "nodes",
          title: "Node Outage",
          reason: `${unreadyNodes} of ${clusterOverview.totalNodes} node${unreadyNodes > 1 ? "s" : ""} not ready`,
          badge: `${unreadyNodes} Unready`,
          action: handleReviewIncidents,
          actionLabel: "View Nodes",
          severity: "critical",
        });
      }
    }

    // 2. Failing Pods (Critical)
    const failed = clusterOverview.failedPods || 0;
    if (failed > 0) {
      items.push({
        id: "failed-pods",
        title: "Failing Pods",
        reason: `${failed} pod${failed > 1 ? "s" : ""} in failing or crash loop state`,
        badge: `${failed} Failing`,
        action: handleTriageFailingPods,
        actionLabel: "Triage Pods",
        severity: "critical",
      });
    }

    // 3. Degraded Workloads (Warning)
    if (clusterOverview.workloads) {
      const degradedDeps = clusterOverview.workloads.deployments?.degraded || 0;
      const degradedSts = clusterOverview.workloads.statefulSets?.degraded || 0;
      const degradedDs = clusterOverview.workloads.daemonSets?.degraded || 0;
      const totalDegraded = degradedDeps + degradedSts + degradedDs;
      if (totalDegraded > 0) {
        items.push({
          id: "workloads",
          title: "Degraded Workloads",
          reason: `${totalDegraded} workload controller${totalDegraded > 1 ? "s" : ""} degraded or unready`,
          badge: `${totalDegraded} Degraded`,
          action: handleInspectWorkloads,
          actionLabel: "Inspect Workloads",
          severity: "warning",
        });
      }
    }

    // 4. Pending Workloads (Warning)
    const pending = clusterOverview.pendingPods || 0;
    if (pending > 2) {
      items.push({
        id: "pending-pods",
        title: "Pending Workloads",
        reason: `${pending} pods waiting in pending scheduling state`,
        badge: `${pending} Pending`,
        action: handleTriageFailingPods,
        actionLabel: "View Pending",
        severity: "warning",
      });
    }

    // 5. Warning Events (Warning)
    if (
      clusterOverview.warningEvents &&
      clusterOverview.warningEvents.length > 0
    ) {
      const count = clusterOverview.warningEvents.length;
      items.push({
        id: "events",
        title: "Warning Events",
        reason: `${count} active warning event${count > 1 ? "s" : ""} recorded in cluster`,
        badge: `${count} Events`,
        action: handleReviewIncidents,
        actionLabel: "Review Events",
        severity: "warning",
      });
    }

    return items;
  }, [
    clusterOverview,
    connectionStatus,
    handleTriageFailingPods,
    handleInspectWorkloads,
    handleReviewIncidents,
  ]);

  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasWarning = alerts.some((a) => a.severity === "warning");

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Tactile Bell Button */}
      <Tooltip
        content={
          alerts.length > 0
            ? `${alerts.length} active cluster alerts`
            : "Cluster Notifications (All systems normal)"
        }
        side="bottom"
        disabled={isOpen}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={`Cluster Notifications (${alerts.length} active alerts)`}
          className={cn(
            "relative h-9 w-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] select-none",
            isOpen
              ? "bg-black/[0.08] dark:bg-white/[0.1] text-[var(--foreground)]"
              : "hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)]",
          )}
        >
          <motion.div
            animate={
              isOpen ? { rotate: [0, -12, 10, -6, 2, 0] } : { rotate: 0 }
            }
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
          </motion.div>

          {/* Solid Count Badge (Zero pulsing dot) */}
          <AnimatePresence>
            {alerts.length > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-0.5 items-center justify-center pointer-events-none"
              >
                <span
                  className={cn(
                    "relative inline-flex items-center justify-center rounded-full text-[10px] font-bold font-mono text-white leading-none px-1 h-3.5 min-w-3.5 shadow-xs",
                    hasCritical
                      ? "bg-rose-500 shadow-rose-500/30"
                      : "bg-amber-500 shadow-amber-500/30",
                  )}
                >
                  {alerts.length}
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </Tooltip>

      {/* Floating Popover Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 30,
              mass: 0.8,
            }}
            style={{ transformOrigin: "top right" }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-11 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl shadow-black/30 dark:shadow-black/70 backdrop-blur-xl overflow-hidden select-none"
          >
            {/* Header (No dot, clean status pill) */}
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="text-xs font-semibold text-[var(--foreground)] tracking-tight">
                Cluster Notifications
              </span>

              {/* Status Pill & Close */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border",
                    hasCritical
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                      : hasWarning || alerts.length > 0
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
                  )}
                >
                  {hasCritical
                    ? `${alerts.filter((a) => a.severity === "critical").length} Critical`
                    : alerts.length > 0
                      ? `${alerts.length} ${alerts.length === 1 ? "Alert" : "Alerts"}`
                      : "All Normal"}
                </span>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Alert Items List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1.5">
              {alerts.length === 0 ? (
                <div className="py-6 px-4 text-center space-y-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-[var(--foreground)]">
                    All Systems Healthy
                  </div>
                  <p className="text-[11px] text-[var(--muted)] max-w-xs mx-auto leading-relaxed">
                    No unready workloads, failing pods, or warning events
                    detected in the cluster.
                  </p>
                </div>
              ) : (
                alerts.map((item, idx) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.03 + idx * 0.03,
                      duration: 0.2,
                      ease: "easeOut",
                    }}
                    className="w-full text-left p-2.5 rounded-lg border border-[var(--border)]/60 hover:border-black/20 dark:hover:border-white/20 bg-black/[0.015] dark:bg-white/[0.02] hover:bg-black/[0.035] dark:hover:bg-white/[0.045] transition-all cursor-pointer group flex items-start gap-3 outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                  >
                    {/* Severity Icon Badge */}
                    <div
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 border",
                        item.severity === "critical"
                          ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20"
                          : "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20",
                      )}
                    >
                      {item.severity === "critical" ? (
                        <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                          {item.title}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-mono font-medium px-1.5 py-0.2 rounded border shrink-0",
                            item.severity === "critical"
                              ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20",
                          )}
                        >
                          {item.badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug line-clamp-2">
                        {item.reason}
                      </p>

                      <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] group-hover:underline">
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer Bar */}
            <div className="px-3 py-2 border-t border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs">
              <span
                className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[180px]"
                title={currentContext || "No context"}
              >
                {currentContext || "kubernetes"}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleRunDiagnostics}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Run cluster diagnostics"
                >
                  <Stethoscope className="w-3 h-3" />
                  <span>Diagnostics</span>
                </button>
                <Tooltip content="Refresh telemetry">
                  <button
                    type="button"
                    onClick={handleRefreshTelemetry}
                    className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    aria-label="Refresh telemetry"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
