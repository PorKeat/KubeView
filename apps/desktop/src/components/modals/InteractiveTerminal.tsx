"use client";

import * as React from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { getStreamCredentials, resetStreamCredentials } from "@/lib/ipc";
import {
  RefreshCw,
  Terminal as TerminalIcon,
  AlertCircle,
  CheckCircle2,
  Copy,
  ShieldAlert,
  FileText,
  ChevronDown,
  Check,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

interface InteractiveTerminalProps {
  podName: string;
  namespace: string;
  containerName: string;
  contextName?: string;
  shell?: string;
  onShellChange?: (shell: string) => void;
  quickCommand?: string;
  onSwitchToRunner?: () => void;
  onOpenLogs?: () => void;
  containerList?: string[];
  onSelectContainer?: (container: string) => void;
}

interface ShellOption {
  value: string;
  label: string;
  triggerLabel: string;
  badge: string;
  badgeClass: string;
  description: string;
}

const SHELL_OPTIONS: ShellOption[] = [
  {
    value: "auto",
    label: "Auto-detect",
    triggerLabel: "Auto (sh, bash, ash)",
    badge: "Recommended",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    description: "Automatic fallback: sh ➔ bash ➔ ash with binary probe",
  },
  {
    value: "/bin/sh",
    label: "/bin/sh",
    triggerLabel: "/bin/sh",
    badge: "Default",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    description: "Standard POSIX system shell present in most containers",
  },
  {
    value: "/bin/bash",
    label: "/bin/bash",
    triggerLabel: "/bin/bash",
    badge: "Bash",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    description: "GNU Bourne-Again Shell with rich syntax & built-ins",
  },
  {
    value: "/bin/ash",
    label: "/bin/ash",
    triggerLabel: "/bin/ash",
    badge: "Alpine",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    description: "Lightweight Almquist Shell standard for Alpine Linux",
  },
  {
    value: "sh",
    label: "sh",
    triggerLabel: "sh",
    badge: "PATH",
    badgeClass: "bg-white/[0.06] text-slate-400 border-white/[0.08]",
    description: "Lookup 'sh' binary from container system $PATH",
  },
  {
    value: "bash",
    label: "bash",
    triggerLabel: "bash",
    badge: "PATH",
    badgeClass: "bg-white/[0.06] text-slate-400 border-white/[0.08]",
    description: "Lookup 'bash' binary from container system $PATH",
  },
  {
    value: "/bin/zsh",
    label: "/bin/zsh",
    triggerLabel: "/bin/zsh",
    badge: "Zsh",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    description: "Z Shell commonly used in specialized developer images",
  },
];

export function InteractiveTerminal({
  podName,
  namespace,
  containerName,
  contextName,
  shell = "auto",
  onShellChange,
  quickCommand,
  onSwitchToRunner,
  onOpenLogs,
  containerList,
  onSelectContainer,
}: InteractiveTerminalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const termRef = React.useRef<Terminal | null>(null);
  const fitAddonRef = React.useRef<FitAddon | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const [errorMsg, setErrorMsg] = React.useState<string>("");
  const [isDistroless, setIsDistroless] = React.useState(false);
  const [reconnectKey, setReconnectKey] = React.useState(0);
  const [isShellOpen, setIsShellOpen] = React.useState(false);
  const shellMenuRef = React.useRef<HTMLDivElement>(null);
  const [focusedShellIndex, setFocusedShellIndex] = React.useState<number>(-1);

  // Close dropdown on outside click or Escape
  React.useEffect(() => {
    if (!isShellOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        shellMenuRef.current &&
        !shellMenuRef.current.contains(e.target as Node)
      ) {
        setIsShellOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        setIsShellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isShellOpen]);

  const activeShellOption = SHELL_OPTIONS.find((o) => o.value === shell) || {
    value: shell,
    label: shell,
    triggerLabel: shell,
    badge: "Custom",
    badgeClass: "bg-white/[0.06] text-slate-400 border-white/[0.08]",
    description: "Custom shell binary path",
  };

  const pendingQuickCmdRef = React.useRef<string | null>(null);

  // Handle quick command insertion
  React.useEffect(() => {
    if (!quickCommand) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(quickCommand + "\n");
    } else {
      pendingQuickCmdRef.current = quickCommand;
    }
  }, [quickCommand]);

  React.useEffect(() => {
    let isCancelled = false;
    let ws: WebSocket | null = null;
    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const initTerminal = async () => {
      if (!containerRef.current || isCancelled) return;
      setConnectionStatus("connecting");
      setErrorMsg("");
      setIsDistroless(false);

      // Clear any prior content in container
      containerRef.current.innerHTML = "";

      // Initialize xterm instance with clean enterprise developer aesthetics
      term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        cursorWidth: 2,
        fontSize: 13,
        lineHeight: 1.25,
        fontFamily:
          "'Geist Mono', 'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
        theme: {
          background: "#080a0f",
          foreground: "#f1f5f9",
          cursor: "#f08a42",
          cursorAccent: "#080a0f",
          selectionBackground: "rgba(240, 138, 66, 0.35)",
          black: "#1e293b",
          red: "#ef4444",
          green: "#10b981",
          yellow: "#f59e0b",
          blue: "#38bdf8",
          magenta: "#c084fc",
          cyan: "#22d3ee",
          white: "#f8fafc",
          brightBlack: "#475569",
          brightRed: "#f87171",
          brightGreen: "#34d399",
          brightYellow: "#fbbf24",
          brightBlue: "#60a5fa",
          brightMagenta: "#e879f9",
          brightCyan: "#67e8f9",
          brightWhite: "#ffffff",
        },
        convertEol: true,
        scrollback: 10000,
        allowProposedApi: true,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      termRef.current = term;
      fitAddonRef.current = fitAddon;

      term.attachCustomKeyEventHandler((e) => {
        if (e.key === "Escape") {
          return false; // Allow Escape to propagate to modal close handlers
        }
        return true;
      });

      // Small delay for DOM layout before fit
      setTimeout(() => {
        try {
          fitAddon?.fit();
        } catch {
          // ignore layout fits
        }
      }, 50);

      term.writeln(
        "\x1b[38;2;148;163;184m[KubeView Engine] Connecting WebSocket PTY bridge to " +
          podName +
          "...\x1b[0m",
      );

      try {
        const { port, token } = await getStreamCredentials();
        if (isCancelled) return;

        const wsUrl = new URL(`ws://127.0.0.1:${port}/api/stream/exec`);
        wsUrl.searchParams.set("token", token);
        if (contextName) wsUrl.searchParams.set("context", contextName);
        wsUrl.searchParams.set("namespace", namespace);
        wsUrl.searchParams.set("pod", podName);
        if (containerName) wsUrl.searchParams.set("container", containerName);
        wsUrl.searchParams.set("shell", shell);

        ws = new WebSocket(wsUrl.toString());
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) return;
          setConnectionStatus("connected");

          // Send initial terminal window size to Go SPDY executor
          if (term) {
            const cols = term.cols || 80;
            const rows = term.rows || 24;
            ws?.send(JSON.stringify({ type: "resize", cols, rows }));
          }

          if (pendingQuickCmdRef.current) {
            ws?.send(pendingQuickCmdRef.current + "\n");
            pendingQuickCmdRef.current = null;
          }

          term?.focus();
        };

        ws.onmessage = (event) => {
          if (isCancelled || !term) return;

          let rawText = "";
          if (typeof event.data === "string") {
            rawText = event.data;
          } else if (event.data instanceof ArrayBuffer) {
            try {
              rawText = new TextDecoder().decode(event.data);
            } catch {
              // binary fallback
            }
          }

          // Check for structured or text-based distroless signal
          if (
            rawText.includes("distroless_detected") ||
            rawText.includes("No interactive shell found in container") ||
            rawText.includes("stat /bin/sh: no such file or directory") ||
            rawText.includes("stat /bin/bash: no such file or directory")
          ) {
            setIsDistroless(true);
          }

          // Suppress raw JSON control events from displaying on the terminal canvas
          if (rawText.includes("distroless_detected")) {
            return;
          }

          if (event.data instanceof ArrayBuffer) {
            term.write(new Uint8Array(event.data));
          } else {
            term.write(event.data);
          }
        };

        ws.onerror = (err) => {
          resetStreamCredentials();
          console.warn("[InteractiveTerminal] WebSocket error:", err);
          if (!isCancelled) {
            setConnectionStatus("error");
            setErrorMsg(
              "WebSocket connection failed or container rejected exec stream.",
            );
          }
        };

        ws.onclose = () => {
          resetStreamCredentials();
          if (!isCancelled) {
            setConnectionStatus("disconnected");
            term?.writeln(
              "\r\n\x1b[38;2;245;158;11m[KubeView] Interactive session terminated.\x1b[0m\r\n",
            );
          }
        };

        // Forward keystrokes to container PTY
        term.onData((data) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });

        // Forward window/terminal resize events to container PTY
        resizeObserver = new ResizeObserver(() => {
          if (!fitAddon || !term) return;
          try {
            fitAddon.fit();
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "resize",
                  cols: term.cols,
                  rows: term.rows,
                }),
              );
            }
          } catch {
            // ignore resize errors
          }
        });

        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }
      } catch (err: unknown) {
        console.error("[InteractiveTerminal] Failed to initialize:", err);
        if (!isCancelled) {
          setConnectionStatus("error");
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "Failed to launch streaming terminal",
          );
        }
      }
    };

    initTerminal();

    return () => {
      isCancelled = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
      if (term) {
        term.dispose();
      }
      wsRef.current = null;
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [podName, namespace, containerName, contextName, shell, reconnectKey]);

  const sendSigint = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("\x03"); // Ctrl+C
      termRef.current?.focus();
    }
  };

  const clearScreen = () => {
    termRef.current?.clear();
    termRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#080a0f] rounded-xl border border-white/[0.08] overflow-hidden shadow-inner relative">
      {/* Terminal Toolbar Strip */}
      <div className="h-9 px-3 border-b border-white/[0.08] bg-[#0c0f17] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-[11px] font-mono font-medium text-slate-300">
            {containerName || "main"}@{podName}
          </span>
          <span className="text-white/20">/</span>

          {/* Custom Dark-Glass Shell Selector */}
          <div className="relative" ref={shellMenuRef}>
            {/* Native select kept visually hidden for accessibility & automation backwards-compatibility */}
            <select
              value={shell}
              onChange={(e) => onShellChange?.(e.target.value)}
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            >
              {SHELL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.triggerLabel}
                </option>
              ))}
            </select>

            {/* Custom Aesthetic Trigger Button */}
            <button
              type="button"
              data-testid="shell-selector-trigger"
              aria-expanded={isShellOpen}
              aria-haspopup="listbox"
              aria-label="Select container shell environment"
              onClick={() => {
                setIsShellOpen((prev) => !prev);
                const currentIdx = SHELL_OPTIONS.findIndex(
                  (o) => o.value === shell,
                );
                setFocusedShellIndex(currentIdx >= 0 ? currentIdx : 0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  if (!isShellOpen) {
                    setIsShellOpen(true);
                    const currentIdx = SHELL_OPTIONS.findIndex(
                      (o) => o.value === shell,
                    );
                    setFocusedShellIndex(currentIdx >= 0 ? currentIdx : 0);
                  }
                }
              }}
              className={cn(
                "h-6 px-2 text-[11px] font-mono rounded-md border flex items-center gap-1.5 transition-all cursor-pointer select-none outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--accent)]",
                isShellOpen
                  ? "bg-white/[0.1] border-white/20 text-white shadow-xs"
                  : "bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.1] border-white/[0.08] text-slate-300 hover:text-white",
              )}
            >
              <TerminalIcon className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="font-medium">
                {activeShellOption.triggerLabel}
              </span>
              <ChevronDown
                className={cn(
                  "w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0",
                  isShellOpen && "rotate-180 text-white",
                )}
              />
            </button>

            {/* Glassy Popover Dropdown (Compact IDE Style) */}
            <AnimatePresence>
              {isShellOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -2 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -2 }}
                  transition={{ duration: 0.12 }}
                  style={{ transformOrigin: "top left" }}
                  className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg bg-[#0c0f17]/95 border border-white/[0.12] shadow-xl shadow-black/80 backdrop-blur-md p-1 overflow-hidden font-mono select-none"
                  role="listbox"
                  aria-label="Shell Environments"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setFocusedShellIndex(
                        (prev) => (prev + 1) % SHELL_OPTIONS.length,
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setFocusedShellIndex(
                        (prev) =>
                          (prev - 1 + SHELL_OPTIONS.length) %
                          SHELL_OPTIONS.length,
                      );
                    } else if (e.key === "Enter" && focusedShellIndex >= 0) {
                      e.preventDefault();
                      const target = SHELL_OPTIONS[focusedShellIndex];
                      if (target) {
                        onShellChange?.(target.value);
                        setIsShellOpen(false);
                        setTimeout(() => termRef.current?.focus(), 50);
                      }
                    }
                  }}
                >
                  {/* Header Strip */}
                  <div className="flex items-center justify-between px-2 py-1 mb-0.5 border-b border-white/[0.06] text-[9px]">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TerminalIcon className="w-2.5 h-2.5 text-[var(--accent)]" />{" "}
                      Shell
                    </span>
                    <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-white/[0.06] text-slate-400">
                      {SHELL_OPTIONS.length}
                    </span>
                  </div>

                  {/* Shell Options List - Compact Single-Line rows */}
                  <div className="space-y-0.5">
                    {SHELL_OPTIONS.map((opt, idx) => {
                      const isSelected = opt.value === shell;
                      const isFocused = idx === focusedShellIndex;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          data-testid={`shell-option-${opt.value}`}
                          onMouseEnter={() => setFocusedShellIndex(idx)}
                          onClick={() => {
                            onShellChange?.(opt.value);
                            setIsShellOpen(false);
                            setTimeout(() => termRef.current?.focus(), 50);
                          }}
                          className={cn(
                            "w-full text-left flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md transition-colors text-xs cursor-pointer select-none group border outline-hidden",
                            isSelected
                              ? "bg-white/[0.1] border-white/15 text-white"
                              : isFocused
                                ? "bg-white/[0.05] border-white/10 text-slate-200"
                                : "border-transparent hover:bg-white/[0.04] text-slate-300 hover:text-white",
                          )}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <TerminalIcon
                              className={cn(
                                "w-3 h-3 shrink-0",
                                isSelected
                                  ? "text-[var(--accent)]"
                                  : "text-slate-500 group-hover:text-slate-400",
                              )}
                            />
                            <span
                              className={cn(
                                "text-[11px] font-mono truncate",
                                isSelected
                                  ? "text-white font-medium"
                                  : "text-slate-300",
                              )}
                            >
                              {opt.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={cn(
                                "px-1 py-0.2 rounded text-[9px] font-mono border",
                                opt.badgeClass,
                              )}
                            >
                              {opt.badge}
                            </span>
                            {isSelected ? (
                              <Check className="w-3 h-3 text-[var(--accent)] shrink-0" />
                            ) : (
                              <span className="w-3 h-3" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-1.5 ml-2">
            {connectionStatus === "connected" && (
              <span className="inline-flex items-center text-[10px] font-mono text-emerald-400">
                Live PTY (WebSocket)
              </span>
            )}
            {connectionStatus === "connecting" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                Connecting...
              </span>
            )}
            {connectionStatus === "disconnected" && (
              <span className="inline-flex items-center text-[10px] font-mono text-slate-400">
                Disconnected
              </span>
            )}
            {connectionStatus === "error" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-400">
                <AlertCircle className="w-3 h-3" />
                Stream error
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={sendSigint}
            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 border border-white/[0.08] transition-colors cursor-pointer"
            title="Send SIGINT interrupt signal (Ctrl+C)"
          >
            Ctrl+C
          </button>
          <button
            onClick={clearScreen}
            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] transition-colors cursor-pointer"
            title="Clear terminal screen"
          >
            Clear
          </button>
          <Tooltip content="Reconnect shell session">
            <button
              onClick={() => {
                setIsDistroless(false);
                setReconnectKey((k) => k + 1);
              }}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Reconnect shell session"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Distroless / Scratch Container Action Banner */}
      {isDistroless && (
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
            containerList.filter((c) => c !== (containerName || "main"))
              .length > 0 && (
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
      )}

      {/* Terminal Viewport */}
      <div
        ref={containerRef}
        onClick={() => termRef.current?.focus()}
        className="flex-1 w-full h-full p-2 overflow-hidden cursor-text"
        style={{
          height: isDistroless ? "calc(100% - 100px)" : "calc(100% - 36px)",
        }}
      />

      {/* Error Banner if connection failed */}
      {connectionStatus === "error" && (
        <div className="absolute inset-x-4 bottom-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 backdrop-blur-md flex items-center justify-between text-xs text-rose-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              {errorMsg ||
                "Unable to establish interactive WebSocket shell session."}
            </span>
          </div>
          <button
            onClick={() => setReconnectKey((k) => k + 1)}
            className="px-2.5 py-1 rounded bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors text-xs cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
