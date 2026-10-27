"use client";

import {
  AlertTriangle,
  ArrowRight,
  Box,
  Loader2,
  RotateCw,
  Server,
} from "lucide-react";
import type { FleetClusterOverview } from "@kubeview/contracts";
import { StatusBeacon, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  authLabel,
  degradedWorkloadLabels,
  fleetStatusMeta,
  providerLabel,
  relativeTime,
} from "../lib/fleetOverview";
import { ClusterStat, ResourceMeter } from "./FleetClusterMetrics";

export interface FleetClusterCardProps {
  cluster: FleetClusterOverview;
  isActive: boolean;
  isOpening: boolean;
  onOpen: () => void;
  onRetry: () => void;
}

export function FleetClusterCard({
  cluster,
  isActive,
  isOpening,
  onOpen,
  onRetry,
}: FleetClusterCardProps) {
  const status = fleetStatusMeta(cluster.status);
  const isOffline = cluster.status === "offline";
  const workloadLabels = degradedWorkloadLabels(cluster);
  const cpuPercent = cluster.hasMetrics
    ? (cluster.cpuUsagePercent ?? 0)
    : cluster.cpuPercent;
  const memoryPercent = cluster.hasMetrics
    ? (cluster.memoryUsagePercent ?? 0)
    : cluster.memoryPercent;
  const cpuDetail = `${cluster.totalCpuCores} cores · ${
    cluster.hasMetrics ? "live usage" : "allocated"
  }`;
  const memoryDetail = `${cluster.totalMemoryGiB} GiB · ${
    cluster.hasMetrics ? "live usage" : "allocated"
  }`;

  const nodeIssues: string[] = [];
  if (cluster.readyNodes < cluster.totalNodes) {
    nodeIssues.push(
      `${cluster.totalNodes - cluster.readyNodes} node${
        cluster.totalNodes - cluster.readyNodes === 1 ? "" : "s"
      } not ready`,
    );
  }
  if (cluster.failedPods > 0) {
    nodeIssues.push(
      `${cluster.failedPods} failed pod${cluster.failedPods === 1 ? "" : "s"}`,
    );
  }

  return (
    <article
      data-testid="fleet-cluster-card"
      data-context-name={cluster.contextName}
      data-status={cluster.status}
      className={cn(
        "flex min-w-0 flex-col rounded-xl border bg-[var(--surface)] p-3.5 shadow-xs transition-colors",
        isActive
          ? "border-[var(--accent)]/45 ring-1 ring-[var(--accent)]/10"
          : "border-[var(--border)] hover:border-black/15 dark:hover:border-white/15",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
              isOffline
                ? "border-rose-500/20 bg-rose-500/10 text-rose-500"
                : isActive
                  ? "border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--muted)]",
            )}
          >
            <Server className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <h2
                className="truncate text-xs font-semibold text-[var(--foreground)]"
                title={cluster.contextName}
              >
                {cluster.contextName}
              </h2>
              {isActive && (
                <span className="rounded border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wide text-[var(--accent)]">
                  Active
                </span>
              )}
            </div>
            <div
              className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted)]"
              title={cluster.cluster}
            >
              {cluster.cluster}
            </div>
          </div>
        </div>
        <StatusBeacon
          size="xs"
          variant={status.variant}
          label={status.label}
          data-testid="fleet-cluster-status"
          data-context-name={cluster.contextName}
        />
      </div>

      <Tooltip content={cluster.server || "No API server URL"}>
        <div className="mt-2.5 truncate rounded-md border border-[var(--border)]/70 bg-black/[0.02] px-2 py-1 font-mono text-[10px] text-[var(--muted)] dark:bg-white/[0.02]">
          {cluster.server || "No server URL"}
        </div>
      </Tooltip>

      {isOffline ? (
        <div className="mt-2.5 flex min-h-[92px] flex-col justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>Cluster is unreachable</span>
          </div>
          <p className="mt-1 line-clamp-2 break-words font-mono text-[10px] leading-relaxed text-[var(--muted)]">
            {cluster.error || "The overview request timed out."}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <RotateCw className="h-3 w-3" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            <ClusterStat
              icon={Server}
              label="Nodes"
              value={`${cluster.readyNodes}/${cluster.totalNodes}`}
              detail={
                cluster.readyNodes === cluster.totalNodes
                  ? "all ready"
                  : `${cluster.totalNodes - cluster.readyNodes} not ready`
              }
            />
            <ClusterStat
              icon={Box}
              label="Pods"
              value={`${cluster.runningPods}/${cluster.totalPods}`}
              detail={
                cluster.failedPods > 0
                  ? `${cluster.failedPods} failed`
                  : `${cluster.pendingPods} pending`
              }
            />
            <ClusterStat
              icon={AlertTriangle}
              label="Warnings"
              value={String(cluster.warningCount)}
              detail={cluster.warningCount > 0 ? "recent events" : "none"}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <ResourceMeter
              label="CPU"
              percent={cpuPercent}
              detail={cpuDetail}
            />
            <ResourceMeter
              label="Memory"
              percent={memoryPercent}
              detail={memoryDetail}
            />
          </div>

          <div className="mt-2.5 min-h-[30px] space-y-0.5 text-[10px]">
            <div className="truncate text-[var(--muted)]">
              {nodeIssues.length > 0
                ? nodeIssues.join(" · ")
                : "Nodes and pods healthy"}
            </div>
            <div
              data-testid="fleet-failing-workloads"
              className={cn(
                "truncate",
                workloadLabels.length > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-[var(--muted)]",
              )}
            >
              {workloadLabels.length > 0
                ? `Failing: ${workloadLabels.join(" · ")}`
                : "No failing workloads"}
            </div>
          </div>
        </>
      )}

      <div className="mt-auto flex items-end justify-between gap-2 border-t border-[var(--border)]/70 pt-2.5">
        <div className="min-w-0">
          <div className="truncate font-mono text-[10px] text-[var(--muted)]">
            {providerLabel(cluster.provider)} · {authLabel(cluster.authType)}
          </div>
          <div className="truncate text-[9px] text-[var(--muted)]/80">
            Updated {relativeTime(cluster.fetchedAt)}
          </div>
        </div>
        <button
          type="button"
          data-testid="fleet-open-cluster"
          data-context-name={cluster.contextName}
          onClick={onOpen}
          disabled={isOpening}
          aria-label={
            isActive
              ? `Open ${cluster.contextName} overview`
              : `Switch to ${cluster.contextName} and open its overview`
          }
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold shadow-xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-60",
            isActive
              ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
          )}
        >
          {isOpening ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          )}
          {isActive ? "Open Overview" : "Switch & Open"}
        </button>
      </div>
    </article>
  );
}
