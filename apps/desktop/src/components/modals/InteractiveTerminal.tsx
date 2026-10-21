"use client";

import * as React from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { getStreamPort } from "@/lib/ipc";
import { RefreshCw, Terminal as TerminalIcon, AlertCircle, CheckCircle2, Copy, ShieldAlert, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
}

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

  // Handle quick command insertion
  React.useEffect(() => {
    if (quickCommand && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(quickCommand + "\n");
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

      // Clear any prior content in container
      containerRef.current.innerHTML = "";

      // Initialize xterm instance with clean enterprise developer aesthetics
      term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        cursorWidth: 2,
        fontSize: 13,
        lineHeight: 1.25,
        fontFamily: "'Geist Mono', 'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
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

      // Small delay for DOM layout before fit
      setTimeout(() => {
        try {
          fitAddon?.fit();
        } catch {
          // ignore layout fits
        }
      }, 50);

      term.writeln("\x1b[38;2;148;163;184m[KubeView Engine] Connecting WebSocket PTY bridge to " + podName + "...\x1b[0m");

      try {
        const port = await getStreamPort();
        if (isCancelled) return;

        const wsUrl = new URL(`ws://127.0.0.1:${port}/api/stream/exec`);
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
          console.warn("[InteractiveTerminal] WebSocket error:", err);
          if (!isCancelled) {
            setConnectionStatus("error");
            setErrorMsg("WebSocket connection failed or container rejected exec stream.");
          }
        };

        ws.onclose = () => {
          if (!isCancelled) {
            setConnectionStatus("disconnected");
            term?.writeln("\r\n\x1b[38;2;245;158;11m[KubeView] Interactive session terminated.\x1b[0m\r\n");
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
                })
              );
            }
          } catch {
            // ignore resize errors
          }
        });

        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }
      } catch (err: any) {
        console.error("[InteractiveTerminal] Failed to initialize:", err);
        if (!isCancelled) {
          setConnectionStatus("error");
          setErrorMsg(err.message || "Failed to launch streaming terminal");
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

          {/* Shell Selector */}
          <select
            value={shell}
            onChange={(e) => onShellChange?.(e.target.value)}
            className="text-[10px] font-mono bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] rounded px-1.5 py-0.5 outline-none cursor-pointer"
          >
            <option value="auto" className="bg-[#0f172a] text-white">Auto (sh, bash, ash)</option>
            <option value="/bin/sh" className="bg-[#0f172a] text-white">/bin/sh</option>
            <option value="/bin/bash" className="bg-[#0f172a] text-white">/bin/bash</option>
            <option value="/bin/ash" className="bg-[#0f172a] text-white">/bin/ash</option>
            <option value="sh" className="bg-[#0f172a] text-white">sh</option>
            <option value="bash" className="bg-[#0f172a] text-white">bash</option>
            <option value="/bin/zsh" className="bg-[#0f172a] text-white">/bin/zsh</option>
          </select>

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
          <button
            onClick={() => {
              setIsDistroless(false);
              setReconnectKey((k) => k + 1);
            }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Reconnect shell session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Distroless / Scratch Container Action Banner */}
      {isDistroless && (
        <div className="mx-3 my-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5 min-w-0">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-500">Distroless Image Detected</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-mono font-medium">No Shell</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                <span className="font-mono text-slate-200">{containerName || podName}</span> does not include <code className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06]">/bin/sh</code> or <code className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06]">/bin/bash</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const cmd = `kubectl debug -it -n ${namespace} ${podName} --image=busybox --target=${containerName || "main"}`;
                navigator.clipboard.writeText(cmd);
                toast.success("Debug command copied to clipboard");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] dark:hover:bg-white/[0.15] border border-[var(--border)] text-xs font-mono text-[var(--foreground)] transition-colors cursor-pointer flex items-center gap-1.5"
              title="Copy kubectl debug command to launch ephemeral container"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy kubectl debug</span>
            </button>

            {onOpenLogs && (
              <button
                onClick={onOpenLogs}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Logs</span>
              </button>
            )}

            {onSwitchToRunner && (
              <button
                onClick={onSwitchToRunner}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Command Runner</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Terminal Viewport */}
      <div
        ref={containerRef}
        onClick={() => termRef.current?.focus()}
        className="flex-1 w-full h-full p-2 overflow-hidden cursor-text"
        style={{ height: isDistroless ? "calc(100% - 100px)" : "calc(100% - 36px)" }}
      />

      {/* Error Banner if connection failed */}
      {connectionStatus === "error" && (
        <div className="absolute inset-x-4 bottom-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 backdrop-blur-md flex items-center justify-between text-xs text-rose-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg || "Unable to establish interactive WebSocket shell session."}</span>
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
