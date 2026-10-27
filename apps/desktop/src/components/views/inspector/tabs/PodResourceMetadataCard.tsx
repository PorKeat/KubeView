"use client";

import * as React from "react";
import {
  Layers,
  Clock,
  CheckCircle2,
  Cpu,
  Activity,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { PodSummary } from "@kubeview/contracts";

export function PodResourceMetadataCard({
  podData,
  nodePodCIDR,
}: {
  podData: PodSummary | undefined;
  nodePodCIDR?: string;
}) {
  // Controlled By parsing
  const controlledByStr = podData?.controlledBy;
  let controllerKind = "";
  let controllerName = "";
  if (controlledByStr) {
    const slash = controlledByStr.indexOf("/");
    if (slash !== -1) {
      controllerKind = controlledByStr.substring(0, slash);
      controllerName = controlledByStr.substring(slash + 1);
    } else {
      controllerName = controlledByStr;
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#F08A42]" /> Resource Metadata
        </span>
        <span className="text-[10px] font-mono text-[var(--muted)]">
          {podData?.creationTimestamp
            ? new Date(podData.creationTimestamp).toLocaleString()
            : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Node */}
        <div className="group/node">
          <span className="text-[var(--muted)] block text-[10px]">Node</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-mono text-[var(--foreground)] font-medium truncate">
              {podData?.nodeName || "Pending placement"}
            </span>
            {podData?.nodeName && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(podData.nodeName);
                  toast.success(`Node name copied: ${podData.nodeName}`);
                }}
                className="opacity-0 group-hover/node:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer"
                title="Copy Node Name"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Pod IP */}
        <div className="group/ip">
          <span className="text-[var(--muted)] block text-[10px]">Pod IP</span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-mono text-[var(--foreground)] font-medium">
              {podData?.ip || "-"}
            </span>
            {podData?.ip && podData.ip !== "-" && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(podData.ip);
                  toast.success(`Pod IP copied: ${podData.ip}`);
                }}
                className="opacity-0 group-hover/ip:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer"
                title="Copy Pod IP"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* IP Family */}
        <div>
          <span className="text-[var(--muted)] block text-[10px]">
            IP Family
          </span>
          <span className="font-mono text-[var(--foreground)] font-medium">
            {podData?.ip ? (podData.ip.includes(":") ? "IPv6" : "IPv4") : "-"}
          </span>
        </div>

        {/* Node Pod CIDR */}
        {nodePodCIDR && (
          <div>
            <span className="text-[var(--muted)] block text-[10px]">
              Node Pod CIDR
            </span>
            <span className="font-mono text-[var(--foreground)] font-medium">
              {nodePodCIDR}
            </span>
          </div>
        )}

        {/* Restarts */}
        <div>
          <span className="text-[var(--muted)] block text-[10px]">
            Restarts
          </span>
          <div className="mt-0.5">
            {(podData?.restarts ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3 h-3" />
                {podData?.restarts} restarts
              </span>
            ) : (
              <span className="font-mono text-[var(--foreground)] font-medium">
                0
              </span>
            )}
          </div>
        </div>

        {/* Created / Age */}
        <div>
          <span className="text-[var(--muted)] block text-[10px]">
            Created / Age
          </span>
          <div className="mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[var(--muted)]" />
            <span className="font-mono text-[var(--foreground)] font-medium">
              {podData?.age ? `${podData.age} ago` : "-"}
            </span>
          </div>
        </div>

        {/* QoS Class */}
        {podData?.qosClass && (
          <div>
            <span className="text-[var(--muted)] block text-[10px]">
              QoS Class
            </span>
            <div className="mt-0.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-black/5 dark:bg-white/5 text-[var(--foreground)] border border-[var(--border)]">
                {podData.qosClass}
              </span>
            </div>
          </div>
        )}

        {/* Controlled By Controller */}
        {controlledByStr && (
          <div className="col-span-2 pt-1 border-t border-[var(--border)]">
            <span className="text-[var(--muted)] block text-[10px] mb-1">
              Controlled By
            </span>
            <div className="flex items-center gap-2">
              {controllerKind && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F08A42]/15 text-[#F08A42] border border-[#F08A42]/25 font-mono">
                  {controllerKind}
                </span>
              )}
              <span
                className="font-mono text-xs font-medium text-[var(--foreground)] truncate flex-1"
                title={controlledByStr}
              >
                {controllerName}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(controlledByStr);
                  toast.success("Controller copied to clipboard");
                }}
                className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded transition-colors cursor-pointer"
                title="Copy Controller"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resource Telemetry Quick Strip */}
      {(podData?.cpu || podData?.memory || podData?.ready) && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]">
          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Ready
            </span>
            <span className="font-mono font-semibold text-xs text-[var(--foreground)] mt-0.5 block">
              {podData?.ready || "-"}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[var(--accent)]" /> CPU
            </span>
            <span className="font-mono font-semibold text-xs text-[var(--foreground)] mt-0.5 block">
              {podData?.cpu || "-"}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-500" /> Memory
            </span>
            <span className="font-mono font-semibold text-xs text-[var(--foreground)] mt-0.5 block">
              {podData?.memory || "-"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
