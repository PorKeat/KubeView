"use client";

import * as React from "react";
import { ShieldCheck, Wifi, Bell, Terminal } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";

export function StatusBar() {
  const { currentContext, currentNamespace, latencyMs, serverVersion } = useClusterStore();

  return (
    <footer className="h-6 w-full border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-3 text-[11px] text-[var(--muted)] select-none shrink-0">
      {/* Left: Connection Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[var(--status-healthy)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-healthy)]" />
          <span className="font-medium text-[var(--foreground)]">Connected</span>
          <span className="text-[10px] text-[var(--muted)]">({latencyMs}ms)</span>
        </div>

        <div className="h-3 w-[1px] bg-[var(--border)]" />

        <div className="flex items-center gap-1">
          <span className="text-[var(--muted)]">Cluster:</span>
          <span className="text-[var(--foreground)] font-mono">{currentContext}</span>
        </div>

        <div className="h-3 w-[1px] bg-[var(--border)]" />

        <div className="flex items-center gap-1">
          <span className="text-[var(--muted)]">Namespace:</span>
          <span className="text-[var(--foreground)] font-mono">{currentNamespace}</span>
        </div>
      </div>

      {/* Right: Security & Version Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-[var(--status-healthy)]" title="Host-enforced RBAC protection enabled">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RBAC Guard</span>
        </div>

        <div className="h-3 w-[1px] bg-[var(--border)]" />

        <span className="font-mono">{serverVersion}</span>

        <div className="h-3 w-[1px] bg-[var(--border)]" />

        <button
          onClick={() => toast.info("No active notifications")}
          className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors"
        >
          <Bell className="w-3 h-3" />
        </button>
      </div>
    </footer>
  );
}
