"use client";

import * as React from "react";
import { Box, RotateCw, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

export interface ClusterOverviewHeaderProps {
  currentContext: string;
  connectionStatus: "connected" | "degraded" | "checking" | "offline";
  serverVersion: string;
  latencyMs: number;
  isNamespaceScoped: boolean;
  currentNamespace: string;
  totalPodsCount: number;
  autoRefreshInterval?: number;
  onSetAutoRefreshInterval?: (interval: number) => void;
  onOpenDiagnostics: () => void;
  onBrowsePods: () => void;
  onRefresh: () => void;
}

export function ClusterOverviewHeader({
  currentContext,
  connectionStatus,
  serverVersion,
  latencyMs,
  isNamespaceScoped,
  currentNamespace,
  totalPodsCount,
  autoRefreshInterval = 0,
  onSetAutoRefreshInterval,
  onOpenDiagnostics,
  onBrowsePods,
  onRefresh,
}: ClusterOverviewHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
            <Logo variant="mark" size="md" />
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--background)]",
              connectionStatus === "connected"
                ? "bg-emerald-500"
                : connectionStatus === "checking"
                  ? "bg-amber-400"
                  : "bg-rose-500",
            )}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-[var(--foreground)] tracking-tight">
              Cluster Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]">
              {currentContext || "default"}
            </span>
            <button
              type="button"
              onClick={onOpenDiagnostics}
              title="Click to inspect Connection & Security Diagnostics (TCP, Auth, TLS, RBAC)"
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 cursor-pointer hover:ring-2 hover:ring-[var(--accent)]/30 transition-all",
                connectionStatus === "connected"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : connectionStatus === "checking"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  connectionStatus === "connected"
                    ? "bg-emerald-500"
                    : connectionStatus === "checking"
                      ? "bg-amber-400"
                      : "bg-rose-500",
                )}
              />
              {connectionStatus === "connected"
                ? "Active"
                : connectionStatus === "checking"
                  ? "Probing"
                  : "Offline"}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--muted)] font-mono mt-1 flex-wrap">
            <span>
              Kubernetes{" "}
              <strong className="text-[var(--foreground)] font-medium tabular-nums">
                {serverVersion}
              </strong>
            </span>
            <span className="text-[var(--border)]">&bull;</span>
            <button
              type="button"
              onClick={onOpenDiagnostics}
              title="Click to view Diagnostic Socket & Handshake Latencies"
              className="hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ping</span>
              <strong
                className={cn(
                  "font-medium tabular-nums",
                  latencyMs < 300
                    ? "text-emerald-600 dark:text-emerald-400"
                    : latencyMs < 800
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400",
                )}
              >
                {latencyMs}ms
              </strong>
            </button>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {/* Live Watch Stream Indicator */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium"
          title="Real-time Kubernetes Watcher active (Zero polling load)"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>Live Stream</span>
        </div>

        {/* Auto Refresh Dropdown */}
        {onSetAutoRefreshInterval && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs">
            <span className="text-[var(--muted)] text-[11px] flex items-center gap-1">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  autoRefreshInterval > 0
                    ? "bg-emerald-500"
                    : "bg-[var(--muted)]/50",
                )}
              />
              <span>Auto:</span>
            </span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => onSetAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-[var(--foreground)] font-mono text-[11px] outline-hidden cursor-pointer"
              title="Set automatic poll/refresh interval"
            >
              <option
                value={0}
                className="bg-[var(--surface)] text-[var(--foreground)]"
              >
                Off
              </option>
              <option
                value={3000}
                className="bg-[var(--surface)] text-[var(--foreground)]"
              >
                3s
              </option>
              <option
                value={5000}
                className="bg-[var(--surface)] text-[var(--foreground)]"
              >
                5s
              </option>
              <option
                value={10000}
                className="bg-[var(--surface)] text-[var(--foreground)]"
              >
                10s
              </option>
              <option
                value={30000}
                className="bg-[var(--surface)] text-[var(--foreground)]"
              >
                30s
              </option>
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenDiagnostics}
          aria-label="Open Connection & Security Diagnostics"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
        >
          <ShieldCheck
            className="w-4 h-4 text-[var(--accent)]"
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Diagnostics</span>
        </button>

        <button
          onClick={onBrowsePods}
          aria-label={
            isNamespaceScoped
              ? `Browse pods in namespace ${currentNamespace}`
              : `Browse all ${totalPodsCount} pods across namespaces`
          }
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
        >
          <Box className="w-4 h-4 text-[var(--muted)]" aria-hidden="true" />
          <span>
            {isNamespaceScoped ? `Pods (${currentNamespace})` : "Browse Pods"}{" "}
            <span className="tabular-nums font-mono text-[var(--muted)]">
              ({totalPodsCount})
            </span>
          </span>
        </button>

        <button
          onClick={onRefresh}
          aria-label="Refresh cluster telemetry and diagnostics"
          style={{ color: "rgb(9, 9, 11)" }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#f08a42] hover:bg-[#ff9d5c] text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
        >
          <RotateCw className="w-3.5 h-3.5 text-zinc-950" aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
