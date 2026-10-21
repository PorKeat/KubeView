"use client";

import * as React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Activity,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { ClusterOverviewResult } from "@kubeview/contracts";

export interface ClusterHealthPulseProps {
  clusterOverview: ClusterOverviewResult | null;
  connectionStatus: string;
  isNamespaceScoped: boolean;
  currentNamespace: string;
  onTriageFailingPods: () => void;
  onInspectWorkloads: () => void;
  onReviewIncidents: () => void;
}

export function ClusterHealthPulse({
  clusterOverview,
  connectionStatus,
  isNamespaceScoped,
  currentNamespace,
  onTriageFailingPods,
  onInspectWorkloads,
  onReviewIncidents,
}: ClusterHealthPulseProps) {
  const { score, statusLabel, statusColor, deductions } = React.useMemo(() => {
    if (!clusterOverview || connectionStatus === "offline") {
      return {
        score: 0,
        statusLabel: "Offline",
        statusColor: "muted",
        deductions: [],
      };
    }

    let rawScore = 100;
    const items: {
      id: string;
      reason: string;
      penalty: number;
      action?: () => void;
      actionLabel?: string;
      severity: "critical" | "warning" | "info";
    }[] = [];

    // 1. Unready nodes penalty (up to 35 pts)
    if (clusterOverview.totalNodes > 0) {
      const unreadyNodes = clusterOverview.totalNodes - clusterOverview.readyNodes;
      if (unreadyNodes > 0) {
        const penalty = Math.min(35, unreadyNodes * 18);
        rawScore -= penalty;
        items.push({
          id: "nodes",
          reason: `${unreadyNodes} of ${clusterOverview.totalNodes} node${unreadyNodes > 1 ? "s" : ""} not ready`,
          penalty,
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
        reason: `${failed} pod${failed > 1 ? "s" : ""} in failed or crashing state`,
        penalty,
        action: onTriageFailingPods,
        actionLabel: "Triage Pods",
        severity: "critical",
      });
    }
    if (pending > 2) {
      const penalty = Math.min(10, Math.floor(pending * 2));
      rawScore -= penalty;
      items.push({
        id: "pending-pods",
        reason: `${pending} pods waiting in pending state`,
        penalty,
        action: onTriageFailingPods,
        actionLabel: "View Pending",
        severity: "warning",
      });
    }

    // 3. Degraded workloads penalty (up to 25 pts)
    if (clusterOverview.workloads) {
      const degradedDeps = clusterOverview.workloads.deployments?.degraded || 0;
      const degradedSts = clusterOverview.workloads.statefulSets?.degraded || 0;
      const degradedDs = clusterOverview.workloads.daemonSets?.degraded || 0;
      const totalDegraded = degradedDeps + degradedSts + degradedDs;
      if (totalDegraded > 0) {
        const penalty = Math.min(25, totalDegraded * 10);
        rawScore -= penalty;
        items.push({
          id: "workloads",
          reason: `${totalDegraded} workload controller${totalDegraded > 1 ? "s" : ""} degraded or unready`,
          penalty,
          action: onInspectWorkloads,
          actionLabel: "Inspect Workloads",
          severity: "warning",
        });
      }
    }

    // 4. Warning events penalty (up to 15 pts)
    if (clusterOverview.warningEvents && clusterOverview.warningEvents.length > 0) {
      const count = clusterOverview.warningEvents.length;
      const penalty = Math.min(15, count * 2);
      rawScore -= penalty;
      items.push({
        id: "events",
        reason: `${count} active warning event${count > 1 ? "s" : ""} recorded`,
        penalty,
        action: onReviewIncidents,
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
    onTriageFailingPods,
    onInspectWorkloads,
    onReviewIncidents,
  ]);

  if (!clusterOverview) return null;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 md:p-5 transition-all duration-200 overflow-hidden shadow-xs select-none",
        statusColor === "emerald" &&
          "bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent border-emerald-500/25 dark:border-emerald-500/20",
        statusColor === "amber" &&
          "bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/30 dark:border-amber-500/25",
        statusColor === "rose" &&
          "bg-gradient-to-r from-rose-500/10 via-red-500/5 to-transparent border-rose-500/35 dark:border-rose-500/30",
        statusColor === "muted" &&
          "bg-slate-500/5 border-[var(--border)]"
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Health Pulse Gauge */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center shrink-0">
            {/* Ambient Pulse Ring */}
            <span
              className={cn(
                "absolute -inset-1 rounded-2xl opacity-40 blur-xs transition-colors",
                statusColor === "emerald" && "bg-emerald-500/30",
                statusColor === "amber" && "bg-amber-500/30 animate-pulse",
                statusColor === "rose" && "bg-rose-500/40 animate-pulse",
                statusColor === "muted" && "bg-slate-500/20"
              )}
            />
            <div
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-xl border font-mono font-bold text-lg shadow-inner",
                statusColor === "emerald" &&
                  "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
                statusColor === "amber" &&
                  "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400",
                statusColor === "rose" &&
                  "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400",
                statusColor === "muted" &&
                  "bg-slate-500/15 border-slate-500/30 text-slate-500"
              )}
            >
              <span>{score}%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--muted)]">
                Cluster Health Pulse
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase",
                  statusColor === "emerald" &&
                    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
                  statusColor === "amber" &&
                    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
                  statusColor === "rose" &&
                    "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
                  statusColor === "muted" &&
                    "bg-slate-500/15 text-slate-500 border border-slate-500/30"
                )}
              >
                {statusColor === "emerald" ? (
                  <ShieldCheck className="w-3 h-3" />
                ) : statusColor === "amber" ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <AlertOctagon className="w-3 h-3" />
                )}
                {statusLabel}
              </span>
            </div>

            <p className="text-xs text-[var(--muted)] mt-0.5">
              {score >= 90
                ? "All infrastructure nodes, controllers, and scheduled pods are operating within optimal parameters."
                : score >= 70
                  ? "Telemetry indicates moderate resource constraints or unready workloads requiring attention."
                  : "Critical cluster anomalies detected. Follow triage recommendations below."}
            </p>
          </div>
        </div>

        {/* Right: Dynamic Triage Recommendations */}
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {deductions.length === 0 ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Zero critical anomalies • 100% capacity ready</span>
            </div>
          ) : (
            deductions.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                  item.severity === "critical"
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400"
                    : item.severity === "warning"
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400"
                      : "bg-slate-500/10 border-slate-500/20 text-[var(--foreground)]"
                )}
              >
                <span className="truncate max-w-[220px]">{item.reason}</span>
                {item.action && item.actionLabel && (
                  <button
                    onClick={item.action}
                    className="inline-flex items-center gap-1 font-semibold text-[11px] underline underline-offset-2 hover:opacity-80 cursor-pointer ml-1"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
