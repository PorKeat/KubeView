"use client";

import * as React from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { OverviewViewSwitch } from "./OverviewViewSwitch";

export interface ClusterOverviewHeaderProps {
  currentContext: string;
  connectionStatus: "connected" | "degraded" | "checking" | "offline";
  serverVersion: string;
  latencyMs: number;
  isNamespaceScoped: boolean;
  currentNamespace: string;
  totalPodsCount: number;
  onOpenDiagnostics: () => void;
  onBrowsePods?: () => void;
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[var(--border)]">
      {/* Left: Breadcrumb Identity & Live Socket Telemetry */}
      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
        <div className="flex min-w-0 items-center gap-1.5">
          <h1 className="truncate text-sm font-semibold text-[var(--foreground)] tracking-tight">
            {currentContext || "default"}
          </h1>
        </div>

        {/* Status Badge with Diagnostic Link */}
        <button
          type="button"
          onClick={onOpenDiagnostics}
          title="Inspect Connection & Security Diagnostics (TCP socket, TLS handshake, RBAC auth)"
          className={cn(
            "px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border inline-flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:ring-1 focus-visible:ring-[var(--accent)] outline-hidden select-none",
            connectionStatus === "connected"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
              : connectionStatus === "checking"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 hover:bg-rose-500/20",
          )}
        >
          <span>
            {connectionStatus === "connected"
              ? "Active"
              : connectionStatus === "checking"
                ? "Probing..."
                : "Degraded"}
          </span>
          {latencyMs > 0 && (
            <span
              className={cn(
                "text-[10px] tabular-nums font-mono",
                latencyMs > 1500
                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                  : "opacity-80",
              )}
            >
              (
              {latencyMs >= 1000
                ? `${(latencyMs / 1000).toFixed(1)}s`
                : `${latencyMs}ms`}
              )
            </span>
          )}
        </button>

        {/* Version info */}
        <span className="text-[11px] text-[var(--muted)] font-mono hidden md:inline">
          k8s{" "}
          <strong className="text-[var(--foreground)] font-medium tabular-nums">
            {serverVersion}
          </strong>
        </span>
      </div>

      {/* Right: Operational Controls Toolbar */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <OverviewViewSwitch active="single" />

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh cluster telemetry and diagnostics"
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-foreground)] text-xs font-semibold shadow-xs shadow-black/10 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] outline-hidden active:scale-[0.98]"
        >
          <RotateCw
            className="w-3 h-3 text-[var(--accent-foreground)]"
            aria-hidden="true"
          />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
