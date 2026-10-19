"use client";

import * as React from "react";
import {
  X,
  Terminal,
  Play,
  RotateCw,
  Copy,
  Trash2,
  Check,
  Layers,
  Sparkles,
  CornerDownLeft,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommandHistoryItem {
  command: string;
  timestamp: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

const QUICK_COMMANDS = [
  { label: "Directory", cmd: "ls -la" },
  { label: "Environment", cmd: "env" },
  { label: "Process List", cmd: "ps aux" },
  { label: "Disk Usage", cmd: "df -h" },
  { label: "OS Info", cmd: "uname -a" },
  { label: "Network", cmd: "cat /etc/resolv.conf" },
];

export function PodExecModal() {
  const { execModalPod, closeExecModal, execPod, pods } = useClusterStore();
  const [selectedContainer, setSelectedContainer] = React.useState<string>("");
  const [inputCommand, setInputCommand] = React.useState<string>("");
  const [history, setHistory] = React.useState<CommandHistoryItem[]>([]);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const outputEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Find pod to extract container list
  const currentPod = pods.find(
    (p) => p.name === execModalPod?.name && p.namespace === execModalPod?.namespace
  );

  const containerList = currentPod?.containers.map((c) => c.name) || [];

  React.useEffect(() => {
    if (execModalPod) {
      setSelectedContainer(execModalPod.container || containerList[0] || "");
      // Focus command input
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setHistory([]);
      setInputCommand("");
    }
  }, [execModalPod]);

  // Escape key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && execModalPod) {
        closeExecModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [execModalPod, closeExecModal]);

  React.useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isExecuting]);

  if (!execModalPod) return null;

  const handleRunCommand = async (cmdToRun?: string) => {
    const cmd = (cmdToRun ?? inputCommand).trim();
    if (!cmd || isExecuting) return;

    setIsExecuting(true);
    const startTime = performance.now();

    try {
      // Split command into sh -c format for arbitrary pipeline support
      const res = await execPod({
        namespace: execModalPod.namespace,
        podName: execModalPod.name,
        container: selectedContainer || undefined,
        command: ["/bin/sh", "-c", cmd],
      });

      const durationMs = Math.round(performance.now() - startTime);

      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          timestamp: new Date().toLocaleTimeString(),
          stdout: res?.stdout || "",
          stderr: res?.stderr || "",
          exitCode: res?.exitCode ?? 0,
          durationMs,
        },
      ]);

      if (cmdToRun === undefined) {
        setInputCommand("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Exec error: ${msg}`);
      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          timestamp: new Date().toLocaleTimeString(),
          stdout: "",
          stderr: `Execution failed: ${msg}`,
          exitCode: 1,
          durationMs: Math.round(performance.now() - startTime),
        },
      ]);
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleCopyHistory = () => {
    const text = history
      .map((h) => `$ ${h.command}\n${h.stdout}${h.stderr ? `\nSTDERR:\n${h.stderr}` : ""}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Terminal output copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-4xl h-[80vh] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-black/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20 shadow-xs">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--foreground)] truncate font-mono">
                  {execModalPod.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/[0.05] dark:bg-white/[0.08] text-[var(--muted)] border border-[var(--border)]">
                  ns: {execModalPod.namespace}
                </span>
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">
                Interactive remote pod execution via client-go SPDY stream
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Container Selector */}
            {containerList.length > 1 && (
              <div className="flex items-center gap-1 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs">
                <Layers className="w-3.5 h-3.5 text-[var(--muted)]" />
                <select
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
                  className="bg-transparent text-xs font-mono text-[var(--foreground)] focus:outline-hidden cursor-pointer"
                >
                  {containerList.map((c) => (
                    <option key={c} value={c} className="bg-[var(--surface)] text-[var(--foreground)]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear Screen */}
            <button
              onClick={() => setHistory([])}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="Clear Terminal"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Copy */}
            <button
              onClick={handleCopyHistory}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="Copy Terminal History"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={closeExecModal}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-[var(--muted)] transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Command Chips */}
        <div className="px-4 py-2 border-b border-[var(--border)] bg-black/[0.02] dark:bg-black/20 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs">
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold mr-1 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[var(--accent)]" /> Quick:
          </span>
          {QUICK_COMMANDS.map((qc) => (
            <button
              key={qc.cmd}
              onClick={() => handleRunCommand(qc.cmd)}
              disabled={isExecuting}
              className="px-2.5 py-1 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[11px] font-mono text-[var(--foreground)] hover:border-[var(--accent)] transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              {qc.label} <span className="text-[var(--muted)]">({qc.cmd})</span>
            </button>
          ))}
        </div>

        {/* Terminal Canvas */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 font-mono text-[12px] text-slate-200 select-text space-y-4">
          {history.length === 0 ? (
            <div className="text-slate-500 text-xs">
              <p className="text-emerald-400 font-semibold mb-1">
                Connected to container {selectedContainer || "primary"} on {execModalPod.name}
              </p>
              <p>Type a command below or click a quick action chip to execute inside the pod.</p>
            </div>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/80 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--accent)] font-bold">$</span>
                    <span className="text-white font-semibold">{item.command}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded text-[10px] font-bold",
                        item.exitCode === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
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
                    {item.stdout}
                  </pre>
                )}

                {item.stderr && (
                  <pre className="text-rose-400 whitespace-pre-wrap break-all leading-relaxed pl-2 font-mono text-[12px]">
                    {item.stderr}
                  </pre>
                )}
              </div>
            ))
          )}

          {isExecuting && (
            <div className="flex items-center gap-2 text-[var(--accent)] text-xs animate-pulse">
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>Executing command in pod...</span>
            </div>
          )}

          <div ref={outputEndRef} />
        </div>

        {/* Input Bar */}
        <div className="h-12 border-t border-[var(--border)] px-4 flex items-center gap-2 bg-[var(--surface)] shrink-0">
          <span className="text-[var(--accent)] font-mono font-bold text-sm">$</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter shell command (e.g. ls -la, cat /etc/hosts, top -b -n 1)..."
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRunCommand();
              }
            }}
            disabled={isExecuting}
            className="flex-1 bg-transparent text-xs font-mono text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-hidden"
          />

          <button
            onClick={() => handleRunCommand()}
            disabled={isExecuting || !inputCommand.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium disabled:opacity-50 cursor-pointer shadow-xs transition-all"
          >
            <span>Run</span>
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
