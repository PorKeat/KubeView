"use client";

import * as React from "react";
import { RotateCw, Copy, Layers, CornerDownLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatAnsiOutput } from "./PodExecAnsiOutput";

export interface CommandHistoryItem {
  command: string;
  cwd?: string;
  timestamp: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface PodExecHistoryViewProps {
  podName: string;
  namespace: string;
  defaultContainer?: string;
  selectedContainer: string;
  containerList: string[];
  onSelectContainer: (container: string) => void;
  history: CommandHistoryItem[];
  isExecuting: boolean;
  cwd: string;
  outputEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputCommand: string;
  onInputChange: (value: string) => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onRunCommand: () => void;
  onOpenLogs: () => void;
}

export function PodExecHistoryView({
  podName,
  namespace,
  defaultContainer,
  selectedContainer,
  containerList,
  onSelectContainer,
  history,
  isExecuting,
  cwd,
  outputEndRef,
  inputRef,
  inputCommand,
  onInputChange,
  onInputKeyDown,
  onRunCommand,
  onOpenLogs,
}: PodExecHistoryViewProps) {
  return (
    <>
      {/* Terminal Canvas */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4 font-mono text-[12px] text-slate-200 select-text space-y-4">
        {history.length === 0 ? (
          <div className="text-slate-500 text-xs space-y-1.5 border border-slate-900 rounded-xl p-4 bg-slate-900/30">
            <p className="text-emerald-400 font-semibold">
              Command Runner ready for {podName} [
              {selectedContainer || "primary"}]
            </p>
            <p className="text-slate-400">
              Type commands below or click quick diagnostic chips above. Press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                ↑
              </kbd>{" "}
              and{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                ↓
              </kbd>{" "}
              to cycle through command history.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/80 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold font-mono">
                    root@
                    {(selectedContainer || podName).slice(0, 16)}:
                    {item.cwd || "~"}#
                  </span>
                  <span className="text-white font-semibold">
                    {item.command}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded text-[10px] font-bold font-mono",
                      item.exitCode === 0
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400",
                    )}
                  >
                    exit {item.exitCode}
                  </span>
                  <span>{item.durationMs}ms</span>
                  <span>{item.timestamp}</span>
                </div>
              </div>

              {item.stdout && (
                <pre className="text-slate-300 whitespace-pre-wrap break-all leading-relaxed pl-2 font-mono text-[12px]">
                  {formatAnsiOutput(item.stdout)}
                </pre>
              )}

              {item.stderr && (
                <div className="space-y-2">
                  <pre className="text-rose-400 whitespace-pre-wrap break-all leading-relaxed pl-2 font-mono text-[12px] bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/30">
                    {formatAnsiOutput(item.stderr)}
                  </pre>

                  {(item.stderr.includes("Distroless") ||
                    item.stderr.includes("no such file or directory") ||
                    item.stderr.includes("OCI runtime exec failed")) && (
                    <div className="flex flex-wrap items-center gap-2 pl-2 pt-1 text-xs">
                      {containerList
                        .filter(
                          (c) => c !== (selectedContainer || defaultContainer),
                        )
                        .map((otherC) => (
                          <button
                            key={otherC}
                            onClick={() => onSelectContainer(otherC)}
                            className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors font-mono text-[11px] cursor-pointer flex items-center gap-1.5"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Switch to: {otherC}</span>
                          </button>
                        ))}

                      <button
                        onClick={() => {
                          const cmd = `kubectl debug -it -n ${namespace} ${podName} --image=busybox --target=${selectedContainer || defaultContainer || "main"}`;
                          navigator.clipboard.writeText(cmd);
                          toast.success("Debug command copied to clipboard");
                        }}
                        className="px-2.5 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 border border-white/[0.1] transition-colors font-mono text-[11px] cursor-pointer flex items-center gap-1.5"
                        title="Copy ephemeral debug command"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy kubectl debug</span>
                      </button>

                      <button
                        onClick={onOpenLogs}
                        className="px-2.5 py-1 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors font-mono text-[11px] cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="w-3 h-3" />
                        <span>View Logs</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {isExecuting && (
          <div className="flex items-center gap-2 text-[var(--accent)] text-xs animate-pulse font-mono">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            <span>Executing in pod container...</span>
          </div>
        )}

        <div ref={outputEndRef} />
      </div>

      {/* Input Bar */}
      <div className="h-12 border-t border-[var(--border)] px-4 flex items-center gap-2.5 bg-[var(--surface)] shrink-0">
        <span className="text-emerald-500 font-mono font-bold text-xs shrink-0 select-none">
          root@
          {(selectedContainer || defaultContainer || "app").slice(0, 16)}:
          {cwd || "~"}#
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Type command (e.g. ls -la, ps aux, cat config.json)... Press ↑/↓ for history"
          value={inputCommand}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onInputKeyDown}
          disabled={isExecuting}
          className="flex-1 bg-transparent text-xs font-mono text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-hidden"
        />

        <button
          onClick={onRunCommand}
          disabled={isExecuting || !inputCommand.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium disabled:opacity-50 cursor-pointer shadow-xs transition-all"
        >
          <span>Run</span>
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </div>
    </>
  );
}
