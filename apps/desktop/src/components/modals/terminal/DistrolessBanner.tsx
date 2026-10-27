"use client";

import {
  Copy,
  FileText,
  Layers,
  ShieldAlert,
  Terminal as TerminalIcon,
} from "lucide-react";
import { toast } from "sonner";

export function DistrolessBanner({
  podName,
  namespace,
  containerName,
  containerList,
  onSwitchToRunner,
  onOpenLogs,
  onSelectContainer,
}: {
  podName: string;
  namespace: string;
  containerName: string;
  containerList?: string[];
  onSwitchToRunner?: () => void;
  onOpenLogs?: () => void;
  onSelectContainer?: (container: string) => void;
}) {
  return (
    <div className="mx-3 my-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col gap-2.5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-500">
                Distroless Image Detected
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-mono font-medium">
                No Shell (/bin/sh)
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              Container{" "}
              <span className="font-mono text-slate-200 font-medium">
                {containerName || podName}
              </span>{" "}
              is a minimal security image without a shell binary (
              <code className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06]">
                /bin/sh
              </code>
              ,{" "}
              <code className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06]">
                /bin/bash
              </code>
              ,{" "}
              <code className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06]">
                /bin/ash
              </code>
              ).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onSwitchToRunner && (
            <button
              onClick={onSwitchToRunner}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Command Runner</span>
            </button>
          )}

          {onOpenLogs && (
            <button
              onClick={onOpenLogs}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Logs</span>
            </button>
          )}

          <button
            onClick={() => {
              const cmd = `kubectl debug -it -n ${namespace} ${podName} --image=busybox --target=${containerName || "main"}`;
              navigator.clipboard.writeText(cmd);
              toast.success("Debug command copied to clipboard");
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            title="Copy kubectl debug command to launch ephemeral container with full shell tools"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy kubectl debug</span>
          </button>
        </div>
      </div>

      {/* Alternative Container Quick Switch */}
      {containerList &&
        containerList.filter((c) => c !== (containerName || "main")).length >
          0 && (
          <div className="pt-2 border-t border-amber-500/15 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-amber-300 font-mono flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" /> Other containers
              with shell available in this pod:
            </span>
            {containerList
              .filter((c) => c !== (containerName || "main"))
              .map((otherC) => (
                <button
                  key={otherC}
                  onClick={() => onSelectContainer?.(otherC)}
                  className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/35 text-amber-200 text-xs font-mono font-medium cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>Switch to: {otherC}</span>
                </button>
              ))}
          </div>
        )}
    </div>
  );
}
