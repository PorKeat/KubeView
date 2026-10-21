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
                : "bg-rose-500"
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
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  connectionStatus === "connected"
                    ? "bg-emerald-500"
                    : connectionStatus === "checking"
                    ? "bg-amber-400"
                    : "bg-rose-500"
                )}
              />
              {connectionStatus === "connected" ? "Active" : connectionStatus === "checking" ? "Probing" : "Offline"}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--muted)] font-mono mt-1 flex-wrap">
            <span>
              Kubernetes <strong className="text-[var(--foreground)] font-medium tabular-nums">{serverVersion}</strong>
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
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {latencyMs}ms
              </strong>
            </button>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenDiagnostics}
          aria-label="Open Connection & Security Diagnostics"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
        >
          <ShieldCheck className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
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
            <span className="tabular-nums font-mono text-[var(--muted)]">({totalPodsCount})</span>
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
