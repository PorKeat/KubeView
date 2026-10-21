"use client";

import * as React from "react";
import { Box, Copy, Network, Folder, FileText, Terminal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ContainerEnvSection } from "../components/ContainerEnvSection";
import type { PodSummary } from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";

export interface InspectorContainersTabProps {
  currentResource: SelectedResource;
  podData: PodSummary | undefined;
  onOpenLogsModal: (pod: { name: string; namespace: string; container: string }) => void;
  onOpenExecModal: (pod: { name: string; namespace: string; container: string }) => void;
}

export function InspectorContainersTab({
  currentResource,
  podData,
  onOpenLogsModal,
  onOpenExecModal,
}: InspectorContainersTabProps) {
  const containers = podData?.containers || [];

  if (containers.length === 0) {
    return <div className="p-8 text-center text-[var(--muted)]">No container details available</div>;
  }

  return (
    <div className="space-y-3 text-xs">
      {containers.map((c) => (
        <div
          key={c.name}
          className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-[#F08A42]" />
              <span className="font-semibold text-[var(--foreground)] font-mono text-xs">{c.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono border",
                  c.ready
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                )}
              >
                {c.ready ? "Ready" : "Not Ready"}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                {c.state}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[var(--muted)] space-y-2 font-mono bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-xl border border-[var(--border)]">
            <div className="flex items-center justify-between group/img">
              <span className="text-[var(--muted)]">Image:</span>
              <div className="flex items-center gap-1.5 max-w-[70%]">
                <span className="text-[var(--foreground)] truncate font-mono text-[10px]" title={c.image}>
                  {c.image}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(c.image);
                    toast.success("Image copied to clipboard");
                  }}
                  className="opacity-0 group-hover/img:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer"
                  title="Copy Image"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {c.stateReason && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">State Reason:</span>
                <span className="text-amber-500 font-medium">{c.stateReason}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Restarts:</span>
              <span className={cn(c.restartCount > 0 ? "text-amber-500 font-bold" : "text-[var(--foreground)]")}>
                {c.restartCount}
              </span>
            </div>
          </div>

          {/* Ports */}
          {c.ports && c.ports.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--muted)] font-mono block">Exposed Ports:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {c.ports.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  >
                    <Network className="w-3 h-3 text-blue-500" />
                    {p.name ? `${p.name}: ` : ""}
                    {p.containerPort}/{p.protocol || "TCP"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resources Requests & Limits */}
          {c.resources && (c.resources.requests || c.resources.limits) && (
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono p-2.5 rounded-xl border border-[var(--border)] bg-black/[0.01] dark:bg-white/[0.01]">
              <div>
                <span className="text-[var(--muted)] block text-[9px]">Requests:</span>
                <span className="text-[var(--foreground)] font-semibold">
                  CPU: {c.resources.requests?.cpu || "-"}, Mem: {c.resources.requests?.memory || "-"}
                </span>
              </div>
              <div>
                <span className="text-[var(--muted)] block text-[9px]">Limits:</span>
                <span className="text-[var(--foreground)] font-semibold">
                  CPU: {c.resources.limits?.cpu || "-"}, Mem: {c.resources.limits?.memory || "-"}
                </span>
              </div>
            </div>
          )}

          {/* Volume Mounts */}
          {c.volumeMounts && c.volumeMounts.length > 0 && (
            <div className="border border-[var(--border)] rounded-xl p-2.5 bg-black/[0.01] dark:bg-white/[0.01] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--foreground)]">
                <Folder className="w-3 h-3 text-[var(--muted)]" />
                <span>Volume Mounts ({c.volumeMounts.length})</span>
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto font-mono text-[10px]">
                {c.volumeMounts.map((vm, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[var(--muted)] hover:text-[var(--foreground)] gap-2">
                    <span className="truncate max-w-[160px]" title={vm.name}>{vm.name}</span>
                    <span className="text-[var(--foreground)] truncate max-w-[180px] select-all text-right font-medium" title={vm.mountPath}>
                      {vm.mountPath}
                      {vm.readOnly && <span className="ml-1 text-[9px] text-amber-500 font-normal">(ro)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Environment Variables */}
          {c.env && c.env.length > 0 && <ContainerEnvSection env={c.env} />}

          {/* Direct container actions */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border)]">
            <button
              onClick={() =>
                onOpenLogsModal({
                  name: currentResource.name,
                  namespace: currentResource.namespace,
                  container: c.name,
                })
              }
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#F08A42]" />
              <span>Container Logs</span>
            </button>
            <button
              onClick={() =>
                onOpenExecModal({
                  name: currentResource.name,
                  namespace: currentResource.namespace,
                  container: c.name,
                })
              }
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-[#F08A42]" />
              <span>Exec Shell</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
