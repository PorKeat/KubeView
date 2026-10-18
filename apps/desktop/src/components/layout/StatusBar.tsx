"use client";

import * as React from "react";
import { ShieldCheck, Wifi, Bell, Terminal, Check, Copy, Cpu } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";

export function StatusBar() {
  const {
    currentContext,
    currentNamespace,
    latencyMs,
    serverVersion,
    rbacMode,
    connectionStatus,
  } = useClusterStore();
  const [copied, setCopied] = React.useState(false);

  const copyVersion = () => {
    navigator.clipboard.writeText(`Kubernetes ${serverVersion} (${currentContext})`);
    setCopied(true);
    toast.success("Cluster details copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case "connected":
        return {
          label: "Connected",
          color: "text-emerald-400",
          beacon: "bg-emerald-400",
          ping: true,
        };
      case "degraded":
        return {
          label: "Degraded",
          color: "text-amber-400",
          beacon: "bg-amber-400",
          ping: false,
        };
      case "checking":
        return {
          label: "Diagnosing...",
          color: "text-amber-400",
          beacon: "bg-amber-400",
          ping: true,
        };
      case "offline":
      default:
        return {
          label: "Offline",
          color: "text-rose-400",
          beacon: "bg-rose-500",
          ping: false,
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <footer className="h-6 w-full border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-3 text-[11px] text-[var(--muted)] select-none shrink-0 font-mono">
      {/* Left: Connection Status */}
      <div className="flex items-center gap-2.5">
        <div className={`flex items-center gap-1.5 ${status.color}`}>
          <span className="relative flex h-1.5 w-1.5">
            {status.ping && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.beacon} opacity-75`} />
            )}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${status.beacon}`} />
          </span>
          <span className="font-semibold text-[var(--foreground)]">{status.label}</span>
          <span className="text-[10px] text-[var(--muted)]">({latencyMs}ms)</span>
        </div>

        <div className="h-3 w-[1px] bg-[var(--border)]" />

        <div className="flex items-center gap-1">
          <span className="text-[var(--muted)]">ctx:</span>
          <span className="text-[var(--foreground)] font-semibold">{currentContext}</span>
        </div>

        <div className="h-3 w-[1px] bg-[var(--border)]" />

        <div className="flex items-center gap-1">
          <span className="text-[var(--muted)]">ns:</span>
          <span className="text-[var(--foreground)]">{currentNamespace}</span>
        </div>
      </div>

      {/* Right: Security, Engine & Version Info */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1 text-[var(--muted)]" title="Go client-go Sidecar running">
          <Cpu className="w-3 h-3 text-[var(--accent)]" />
          <span className="text-[10px]">Go Engine 1.23</span>
        </div>

        <div className="h-3 w-[1px] bg-[var(--border)]" />

        <div
          className="flex items-center gap-1 text-emerald-400 cursor-help"
          title="RBAC Guard: SelfSubjectAccessReview Pre-Flight Enforcement Active"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="capitalize">{rbacMode === "cluster-admin" ? "ClusterAdmin" : "Scoped"}</span>
        </div>

        <div className="h-3 w-[1px] bg-[var(--border)]" />

        <button
          onClick={copyVersion}
          className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="Click to copy Kubernetes version"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
          <span>{serverVersion}</span>
        </button>

        <div className="h-3 w-[1px] bg-[var(--border)]" />

        <button
          onClick={() => toast.info("No active cluster warnings")}
          className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors"
          title="System Notifications"
        >
          <Bell className="w-3 h-3" />
        </button>
      </div>
    </footer>
  );
}
