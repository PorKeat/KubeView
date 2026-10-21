"use client";

import * as React from "react";
import { Box, Database, Layers, Server, AlertTriangle } from "lucide-react";
import { SpotlightCard } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { WorkloadsSummary } from "@kubeview/contracts";

export interface WorkloadControllersCardProps {
  workloads: WorkloadsSummary | undefined;
  isNamespaceScoped: boolean;
  currentNamespace: string;
  isFullWidth?: boolean;
  onInspectWorkload: (namespace: string) => void;
}

export function WorkloadControllersCard({
  workloads,
  isNamespaceScoped,
  currentNamespace,
  isFullWidth = false,
  onInspectWorkload,
}: WorkloadControllersCardProps) {
  const dep = workloads?.deployments ?? { total: 0, ready: 0, degraded: 0 };
  const sts = workloads?.statefulSets ?? { total: 0, ready: 0, degraded: 0, unreadyList: [] };
  const ds = workloads?.daemonSets ?? { total: 0, ready: 0, degraded: 0 };

  const depPct = dep.total > 0 ? Math.round((dep.ready / dep.total) * 100) : 100;
  const stsPct = sts.total > 0 ? Math.round((sts.ready / sts.total) * 100) : 100;
  const dsPct = ds.total > 0 ? Math.round((ds.ready / ds.total) * 100) : 100;
  const totalWorkloads = dep.total + sts.total + ds.total;

  return (
    <SpotlightCard className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]/70">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
              Workload Controllers
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] font-medium tabular-nums">
              {totalWorkloads} {isNamespaceScoped ? `in ${currentNamespace}` : "Total"}
            </span>
          </div>
        </div>

        {/* Controller Health: 3 Columns when Full-Width, Stacked when Half-Width */}
        <div
          className={cn(
            isFullWidth
              ? "grid grid-cols-1 md:grid-cols-3 gap-3"
              : "divide-y divide-[var(--border)]/60"
          )}
        >
          {/* Row 1: Deployments */}
          <div
            className={cn(
              "flex flex-col justify-between space-y-2",
              isFullWidth
                ? "p-3.5 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-active)]/20"
                : "py-2.5"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Box className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold text-[var(--foreground)]">Deployments</span>
              </div>

              <span
                className={cn(
                  "text-[11px] font-mono font-medium px-2 py-0.5 rounded border tabular-nums shrink-0",
                  dep.degraded === 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                )}
              >
                {dep.ready} / {dep.total} Ready
              </span>
            </div>

            <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  dep.degraded === 0 ? "bg-emerald-500 dark:bg-emerald-400" : "bg-rose-500"
                )}
                style={{ width: `${depPct}%` }}
              />
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[var(--muted)]">
              <span>{dep.degraded === 0 ? "Healthy fleet" : `${dep.degraded} Degraded`}</span>
              <button
                type="button"
                onClick={() => onInspectWorkload(isNamespaceScoped ? currentNamespace : "all")}
                className="text-[var(--accent)] hover:underline text-xs font-mono font-medium cursor-pointer"
              >
                Inspect &rarr;
              </button>
            </div>
          </div>

          {/* Row 2: StatefulSets */}
          <div
            className={cn(
              "flex flex-col justify-between space-y-2",
              isFullWidth
                ? "p-3.5 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-active)]/20"
                : "py-2.5"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Database className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold text-[var(--foreground)]">StatefulSets</span>
              </div>

              <span
                className={cn(
                  "text-[11px] font-mono font-medium px-2 py-0.5 rounded border tabular-nums shrink-0",
                  sts.degraded === 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold"
                )}
              >
                {sts.ready} / {sts.total} Ready
              </span>
            </div>

            <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  sts.degraded === 0 ? "bg-emerald-500 dark:bg-emerald-400" : "bg-amber-500"
                )}
                style={{ width: `${stsPct}%` }}
              />
            </div>

            {/* Unready Workload Quick-Filter Pills or Healthy Status */}
            {sts.unreadyList && sts.unreadyList.length > 0 ? (
              <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[var(--muted)] font-mono">Degraded:</span>
                {sts.unreadyList.map((item) => {
                  const ns = item.split("/")[0] || "default";
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onInspectWorkload(ns)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 cursor-pointer transition-colors"
                      title={`Click to filter and inspect pods in namespace '${ns}'`}
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[var(--muted)]">
                <span>Healthy quorum</span>
                <button
                  type="button"
                  onClick={() => onInspectWorkload(isNamespaceScoped ? currentNamespace : "all")}
                  className="text-[var(--accent)] hover:underline text-xs font-mono font-medium cursor-pointer"
                >
                  Inspect &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Row 3: DaemonSets */}
          <div
            className={cn(
              "flex flex-col justify-between space-y-2",
              isFullWidth
                ? "p-3.5 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-active)]/20"
                : "py-2.5"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Server className="w-4 h-4 text-sky-500 shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold text-[var(--foreground)]">DaemonSets</span>
              </div>

              <span
                className={cn(
                  "text-[11px] font-mono font-medium px-2 py-0.5 rounded border tabular-nums shrink-0",
                  ds.degraded === 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                )}
              >
                {ds.ready} / {ds.total} Ready
              </span>
            </div>

            <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  ds.degraded === 0 ? "bg-emerald-500 dark:bg-emerald-400" : "bg-rose-500"
                )}
                style={{ width: `${dsPct}%` }}
              />
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[var(--muted)]">
              <span>{ds.degraded === 0 ? "All node agents scheduled" : `${ds.degraded} Degraded`}</span>
              <button
                type="button"
                onClick={() => onInspectWorkload(isNamespaceScoped ? currentNamespace : "kube-system")}
                className="text-[var(--accent)] hover:underline text-xs font-mono font-medium cursor-pointer"
              >
                Inspect &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
