"use client";

import * as React from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { getStreamCredentials, resetStreamCredentials } from "@/lib/ipc";
import type { TerminalConnectionStatus } from "./types";

export interface UseTerminalSessionOptions {
  podName: string;
  namespace: string;
  containerName: string;
  contextName?: string;
  shell: string;
  quickCommand?: string;
}

export function useTerminalSession({
  podName,
  namespace,
  containerName,
  contextName,
  shell,
  quickCommand,
}: UseTerminalSessionOptions) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const termRef = React.useRef<Terminal | null>(null);
  const fitAddonRef = React.useRef<FitAddon | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    React.useState<TerminalConnectionStatus>("connecting");
  const [errorMsg, setErrorMsg] = React.useState<string>("");
  const [isDistroless, setIsDistroless] = React.useState(false);
  const [reconnectKey, setReconnectKey] = React.useState(0);

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

  const reconnect = React.useCallback(() => {
    setReconnectKey((key) => key + 1);
  }, []);

  const focusTerminal = React.useCallback(() => {
    termRef.current?.focus();
  }, []);

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

  return {
    containerRef,
    connectionStatus,
    errorMsg,
    isDistroless,
    setIsDistroless,
    reconnect,
    focusTerminal,
    sendSigint,
    clearScreen,
  };
}
