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
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  Radio,
  History,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { InteractiveTerminal } from "./InteractiveTerminal";

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
  { label: "Processes", cmd: "ps aux || ps -ef" },
  { label: "Disk Usage", cmd: "df -h" },
  { label: "OS Info", cmd: "uname -a" },
  { label: "Network DNS", cmd: "cat /etc/resolv.conf" },
  { label: "Listening Ports", cmd: "netstat -tuln || ss -tulpn || cat /proc/net/tcp" },
  { label: "Memory Info", cmd: "free -m || cat /proc/meminfo" },
];

export function PodExecModal() {
  const { execModalPod, closeExecModal, execPod, pods, currentContext, openLogsModal } = useClusterStore();
  const [selectedContainer, setSelectedContainer] = React.useState<string>("");
  const [shell, setShell] = React.useState<string>("auto");
  const [execMode, setExecMode] = React.useState<"interactive" | "history">("interactive");
  const [quickCmdToInsert, setQuickCmdToInsert] = React.useState<string>("");
  const [inputCommand, setInputCommand] = React.useState<string>("");
  const [history, setHistory] = React.useState<CommandHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);
  const [draftCommand, setDraftCommand] = React.useState<string>("");
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);
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
      if (execMode === "history") {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    } else {
      setHistory([]);
      setInputCommand("");
      setHistoryIndex(-1);
      setQuickCmdToInsert("");
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
    if (execMode === "history") {
      outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, isExecuting, execMode]);

  if (!execModalPod) return null;

  const handleRunCommand = async (cmdToRun?: string) => {
    const cmd = (cmdToRun ?? inputCommand).trim();
    if (!cmd || isExecuting) return;

    if (execMode === "interactive") {
      // Send directly to the interactive shell session
      setQuickCmdToInsert(cmd);
      // Reset trigger after short tick
      setTimeout(() => setQuickCmdToInsert(""), 100);
      return;
    }

    setIsExecuting(true);
    setHistoryIndex(-1);
    const startTime = performance.now();

    try {
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

  // Keyboard navigation for command history (Up / Down)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleRunCommand();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;

      if (historyIndex === -1) {
        setDraftCommand(inputCommand);
        const nextIdx = history.length - 1;
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx].command);
      } else if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx].command);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;

      if (historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx].command);
      } else {
        setHistoryIndex(-1);
        setInputCommand(draftCommand);
      }
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
      <div
        className={cn(
          "bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in zoom-in-95",
          isMaximized ? "w-full h-full max-w-none rounded-none" : "w-full max-w-5xl h-[85vh]"
        )}
      >
        {/* Header */}
        <div className="h-14 border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-black/30 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20 shadow-xs shrink-0">
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
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {execMode === "interactive" ? "WebSocket PTY" : "SPDY Exec"}
                </span>
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-0.5 font-mono">
                {execMode === "interactive"
                  ? "Full-duplex interactive terminal shell (supports vim, htop, arrow keys, resize)"
                  : "Command runner with historical exit codes and structured stdout/stderr"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.06] p-0.5 rounded-lg border border-[var(--border)] text-[11px] font-medium mr-1">
              <button
                onClick={() => setExecMode("interactive")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-mono",
                  execMode === "interactive"
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-2xs font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Interactive Shell</span>
              </button>
              <button
                onClick={() => setExecMode("history")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-mono",
                  execMode === "history"
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-2xs font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <History className="w-3.5 h-3.5" />
                <span>Command Runner</span>
              </button>
            </div>

            {/* Container Selector */}
            {containerList.length > 1 && (
              <CustomSelect
                value={selectedContainer}
                onChange={setSelectedContainer}
                options={containerList.map((c) => ({ value: c, label: c }))}
                icon={<Layers className="w-3.5 h-3.5 text-[#F08A42]" />}
                placeholder="Container"
              />
            )}

            {/* Clear Screen (Command runner mode) */}
            {execMode === "history" && (
              <>
                <button
                  onClick={() => setHistory([])}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  title="Clear Terminal Output"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={handleCopyHistory}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  title="Copy All Terminal History"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </>
            )}

            {/* Maximize / Restore */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold mr-1 shrink-0 flex items-center gap-1 font-mono">
            <Sparkles className="w-3 h-3 text-[var(--accent)]" /> Quick Commands:
          </span>
          {QUICK_COMMANDS.map((qc) => (
            <button
              key={qc.cmd}
              onClick={() => handleRunCommand(qc.cmd)}
              disabled={isExecuting}
              className="px-2.5 py-1 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[11px] font-mono text-[var(--foreground)] hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title={qc.cmd}
            >
              {qc.label}
            </button>
          ))}
        </div>

        {/* Body: Interactive Terminal vs Command Runner */}
        {execMode === "interactive" ? (
          <div className="flex-1 p-3 bg-black/40 flex flex-col min-h-0 overflow-hidden">
            <InteractiveTerminal
              podName={execModalPod.name}
              namespace={execModalPod.namespace}
              containerName={selectedContainer || execModalPod.container || ""}
              contextName={currentContext}
              shell={shell}
              onShellChange={setShell}
              quickCommand={quickCmdToInsert}
              onSwitchToRunner={() => setExecMode("history")}
              onOpenLogs={() => {
                if (execModalPod) {
                  openLogsModal({
                    name: execModalPod.name,
                    namespace: execModalPod.namespace,
                    container: selectedContainer || execModalPod.container || "",
                  });
                  closeExecModal();
                }
              }}
            />
          </div>
        ) : (
          <>
            {/* Terminal Canvas */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 font-mono text-[12px] text-slate-200 select-text space-y-4">
              {history.length === 0 ? (
                <div className="text-slate-500 text-xs space-y-1.5 border border-slate-900 rounded-xl p-4 bg-slate-900/30">
                  <p className="text-emerald-400 font-semibold">
                    Command Runner ready for {execModalPod.name} [{selectedContainer || "primary"}]
                  </p>
                  <p className="text-slate-400">
                    Type commands below or click quick diagnostic chips above. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">↑</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">↓</kbd> to cycle through command history.
                  </p>
                </div>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/80 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-semibold font-mono">root@{execModalPod.name.slice(0, 16)}:~#</span>
                        <span className="text-white font-semibold">{item.command}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded text-[10px] font-bold font-mono",
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
                      <div className="space-y-2">
                        <pre className="text-rose-400 whitespace-pre-wrap break-all leading-relaxed pl-2 font-mono text-[12px] bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/30">
                          {item.stderr}
                        </pre>

                        {(item.stderr.includes("Distroless") ||
                          item.stderr.includes("no such file or directory") ||
                          item.stderr.includes("OCI runtime exec failed")) && (
                          <div className="flex flex-wrap items-center gap-2 pl-2 pt-1 text-xs">
                            {containerList
                              .filter((c) => c !== (selectedContainer || execModalPod.container))
                              .map((otherC) => (
                                <button
                                  key={otherC}
                                  onClick={() => setSelectedContainer(otherC)}
                                  className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors font-mono text-[11px] cursor-pointer flex items-center gap-1.5"
                                >
                                  <Layers className="w-3 h-3" />
                                  <span>Switch to: {otherC}</span>
                                </button>
                              ))}

                            <button
                              onClick={() => {
                                const cmd = `kubectl debug -it -n ${execModalPod.namespace} ${execModalPod.name} --image=busybox --target=${selectedContainer || execModalPod.container || "main"}`;
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
                              onClick={() => {
                                openLogsModal({
                                  name: execModalPod.name,
                                  namespace: execModalPod.namespace,
                                  container: selectedContainer || execModalPod.container || undefined,
                                });
                                closeExecModal();
                              }}
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
                root@{selectedContainer || "app"}:~#
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type command (e.g. ls -la, ps aux, cat config.json)... Press ↑/↓ for history"
                value={inputCommand}
                onChange={(e) => {
                  setInputCommand(e.target.value);
                  if (historyIndex === -1) {
                    setDraftCommand(e.target.value);
                  }
                }}
                onKeyDown={handleKeyDown}
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
          </>
        )}
      </div>
    </div>
  );
}
