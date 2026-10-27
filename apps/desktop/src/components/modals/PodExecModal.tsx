"use client";

import * as React from "react";
import { Zap } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InteractiveTerminal } from "./InteractiveTerminal";
import { PodExecHeader, type PodExecMode } from "./PodExecHeader";
import {
  PodExecHistoryView,
  type CommandHistoryItem,
} from "./PodExecHistoryView";

const QUICK_COMMANDS = [
  { label: "Directory", cmd: "ls -la" },
  { label: "Environment", cmd: "env" },
  { label: "Processes", cmd: "ps aux || ps -ef" },
  { label: "Disk Usage", cmd: "df -h" },
  { label: "OS Info", cmd: "uname -a" },
  { label: "Network DNS", cmd: "cat /etc/resolv.conf" },
  {
    label: "Listening Ports",
    cmd: "netstat -tuln || ss -tulpn || cat /proc/net/tcp",
  },
  { label: "Memory Info", cmd: "free -m || cat /proc/meminfo" },
];

export function PodExecModal() {
  const {
    execModalPod,
    closeExecModal,
    execPod,
    pods,
    currentContext,
    openLogsModal,
  } = useClusterStore();
  const [selectedContainer, setSelectedContainer] = React.useState<string>("");
  const [cwd, setCwd] = React.useState<string>("");
  const [shell, setShell] = React.useState<string>("auto");
  const [execMode, setExecMode] = React.useState<PodExecMode>("interactive");
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
    (p) =>
      p.name === execModalPod?.name && p.namespace === execModalPod?.namespace,
  );

  const containerList = React.useMemo(
    () => currentPod?.containers.map((c) => c.name) || [],
    [currentPod?.containers],
  );

  React.useEffect(() => {
    if (execModalPod) {
      setSelectedContainer((current) => {
        if (current && containerList.includes(current)) {
          return current;
        }
        return execModalPod.container || containerList[0] || "";
      });
      if (execMode === "history") {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    } else {
      setHistory([]);
      setInputCommand("");
      setHistoryIndex(-1);
      setQuickCmdToInsert("");
      setSelectedContainer("");
    }
  }, [
    execModalPod?.name,
    execModalPod?.namespace,
    execModalPod?.container,
    containerList,
  ]);

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
      outputEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [history.length, execMode]);

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

    // Built-in instant clear screen (zero network round-trip, zero lag)
    if (cmd.toLowerCase() === "clear" || cmd.toLowerCase() === "cls") {
      setHistory([]);
      if (cmdToRun === undefined) {
        setInputCommand("");
      }
      return;
    }

    // Built-in exit / quit
    if (cmd.toLowerCase() === "exit" || cmd.toLowerCase() === "quit") {
      closeExecModal();
      return;
    }

    // Built-in cd directory tracking (allows cd to persist across commands)
    const cdMatch = cmd.match(/^cd(?:\s+(.*))?$/);
    if (cdMatch) {
      const rawTarget = cdMatch[1]?.trim() || "~";
      setIsExecuting(true);
      setHistoryIndex(-1);
      const startTime = performance.now();
      const currentCwd = cwd;

      try {
        const cdScript = currentCwd
          ? `cd "${currentCwd}" && cd ${rawTarget} && pwd`
          : `cd ${rawTarget} && pwd`;

        const shellBin = shell === "auto" ? "/bin/sh" : shell;
        const res = await execPod({
          namespace: execModalPod.namespace,
          podName: execModalPod.name,
          container: selectedContainer || undefined,
          command: [shellBin, "-c", cdScript],
        });

        const durationMs = Math.round(performance.now() - startTime);

        if (res?.exitCode === 0) {
          const newResolvedDir =
            res.stdout.trim().split("\n").pop()?.trim() || "";
          setCwd(newResolvedDir);
          setHistory((prev) => [
            ...prev,
            {
              command: cmd,
              cwd: newResolvedDir || "~",
              timestamp: new Date().toLocaleTimeString(),
              stdout: "",
              stderr: "",
              exitCode: 0,
              durationMs,
            },
          ]);
        } else {
          setHistory((prev) => [
            ...prev,
            {
              command: cmd,
              cwd: currentCwd || "~",
              timestamp: new Date().toLocaleTimeString(),
              stdout: "",
              stderr:
                res?.stderr || `cd: ${rawTarget}: No such file or directory`,
              exitCode: res?.exitCode ?? 1,
              durationMs,
            },
          ]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`cd error: ${msg}`);
      } finally {
        setIsExecuting(false);
        if (cmdToRun === undefined) setInputCommand("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    // Standard command execution inside current cwd
    const actualCmd = cwd ? `cd "${cwd}" && (${cmd})` : cmd;
    const shellBin = shell === "auto" ? "/bin/sh" : shell;

    setIsExecuting(true);
    setHistoryIndex(-1);
    const startTime = performance.now();

    try {
      const res = await execPod({
        namespace: execModalPod.namespace,
        podName: execModalPod.name,
        container: selectedContainer || undefined,
        command: [shellBin, "-c", actualCmd],
      });

      const durationMs = Math.round(performance.now() - startTime);

      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          cwd: cwd || "~",
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
          cwd: cwd || "~",
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
      .map(
        (h) =>
          `$ ${h.command}\n${h.stdout}${h.stderr ? `\nSTDERR:\n${h.stderr}` : ""}`,
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Terminal output copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputChange = (value: string) => {
    setInputCommand(value);
    if (historyIndex === -1) {
      setDraftCommand(value);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className={cn(
          "bg-[var(--surface)] border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in zoom-in-95",
          isMaximized
            ? "h-full w-full max-w-none rounded-none"
            : "h-[100dvh] w-full max-w-5xl rounded-none sm:h-[85vh] sm:rounded-2xl",
        )}
      >
        {/* Header */}
        <PodExecHeader
          podName={execModalPod.name}
          namespace={execModalPod.namespace}
          execMode={execMode}
          onExecModeChange={setExecMode}
          containerList={containerList}
          selectedContainer={selectedContainer}
          onSelectContainer={setSelectedContainer}
          copied={copied}
          onClearHistory={() => setHistory([])}
          onCopyHistory={handleCopyHistory}
          isMaximized={isMaximized}
          onToggleMaximized={() => setIsMaximized(!isMaximized)}
          onClose={closeExecModal}
        />

        {/* Quick Command Chips */}
        <div className="px-3 sm:px-4 py-2 border-b border-[var(--border)] bg-black/[0.02] dark:bg-black/20 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs">
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold mr-1 shrink-0 flex items-center gap-1 font-mono">
            <Zap className="w-3 h-3 text-[var(--accent)]" /> Quick Commands:
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
                    container:
                      selectedContainer || execModalPod.container || "",
                  });
                  closeExecModal();
                }
              }}
              containerList={containerList}
              onSelectContainer={setSelectedContainer}
            />
          </div>
        ) : (
          <PodExecHistoryView
            podName={execModalPod.name}
            namespace={execModalPod.namespace}
            defaultContainer={execModalPod.container}
            selectedContainer={selectedContainer}
            containerList={containerList}
            onSelectContainer={setSelectedContainer}
            history={history}
            isExecuting={isExecuting}
            cwd={cwd}
            outputEndRef={outputEndRef}
            inputRef={inputRef}
            inputCommand={inputCommand}
            onInputChange={handleInputChange}
            onInputKeyDown={handleKeyDown}
            onRunCommand={() => handleRunCommand()}
            onOpenLogs={() => {
              openLogsModal({
                name: execModalPod.name,
                namespace: execModalPod.namespace,
                container:
                  selectedContainer || execModalPod.container || undefined,
              });
              closeExecModal();
            }}
          />
        )}
      </div>
    </div>
  );
}
