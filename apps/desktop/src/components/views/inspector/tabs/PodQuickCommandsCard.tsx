"use client";

import * as React from "react";
import { Copy, Terminal, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { SelectedResource } from "@/stores/clusterStore";

export function PodQuickCommandsCard({
  currentResource,
}: {
  currentResource: SelectedResource;
}) {
  return (
    <>
      {/* Quick CLI Commands */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2 shadow-2xs">
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-[#F08A42]" />
          <span>Quick CLI Commands</span>
        </span>
        <div className="space-y-1.5 font-mono text-[11px]">
          {[
            {
              label: "Logs",
              cmd: `kubectl logs -n ${currentResource.namespace} ${currentResource.name} -f`,
            },
            {
              label: "Exec",
              cmd: `kubectl exec -it -n ${currentResource.namespace} ${currentResource.name} -- sh`,
            },
            {
              label: "Describe",
              cmd: `kubectl describe pod -n ${currentResource.namespace} ${currentResource.name}`,
            },
          ].map((c) => (
            <div
              key={c.label}
              className="p-2 px-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-[var(--border)] flex items-center justify-between group"
            >
              <div className="truncate mr-2">
                <span className="text-[#F08A42] font-semibold text-[10px] mr-2 uppercase tracking-wide">
                  {c.label}:
                </span>
                <span className="text-[var(--foreground)]">{c.cmd}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(c.cmd);
                  toast.success(`Copied: ${c.cmd}`);
                }}
                className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
                title={`Copy ${c.label} command`}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Status Incident Warning */}
      {currentResource.status !== "Running" &&
        currentResource.status !== "Completed" && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Status: {currentResource.status}</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Pod state is currently not in steady running phase. Open the logs
              or events tab for root-cause diagnosis.
            </p>
          </div>
        )}
    </>
  );
}
