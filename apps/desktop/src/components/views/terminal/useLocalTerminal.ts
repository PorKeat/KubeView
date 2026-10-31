"use client";

import * as React from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { getStreamCredentials, resetStreamCredentials } from "@/lib/ipc";
import type { TerminalConnectionStatus } from "@/components/modals/terminal/types";

export interface UseLocalTerminalOptions {
  enabled: boolean;
  contextName?: string;
  shell: string;
}

export function useLocalTerminal({
  enabled,
  contextName,
  shell,
}: UseLocalTerminalOptions) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const termRef = React.useRef<Terminal | null>(null);
  const fitAddonRef = React.useRef<FitAddon | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    React.useState<TerminalConnectionStatus>("connecting");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [reconnectKey, setReconnectKey] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return;

    let isCancelled = false;
    let ws: WebSocket | null = null;
    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const initTerminal = async () => {
      if (!containerRef.current || isCancelled) return;
      setConnectionStatus("connecting");
      setErrorMsg("");
      containerRef.current.innerHTML = "";

      term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        cursorWidth: 2,
        fontSize: 13,
        lineHeight: 1.25,
        fontFamily:
          '"FiraCode Nerd Font", "MesloLGLDZ Nerd Font", "MesloLGS NF", "Hack Nerd Font", "JetBrainsMono Nerd Font", "Geist Mono", "JetBrains Mono", "Fira Code", Menlo, Monaco, monospace',
        fontWeight: "400",
        fontWeightBold: "600",
        macOptionIsMeta: true,
        rightClickSelectsWord: true,
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

      term.attachCustomKeyEventHandler((event) => {
        if (event.key === "Escape") return false;

        const copyModifier = event.metaKey || (event.ctrlKey && event.shiftKey);
        if (
          copyModifier &&
          event.key.toLowerCase() === "c" &&
          term?.hasSelection()
        ) {
          const selection = term.getSelection();
          if (selection) {
            void navigator.clipboard.writeText(selection).catch(() => {});
          }
          return false;
        }

        if (copyModifier && event.key.toLowerCase() === "v") {
          void navigator.clipboard
            .readText()
            .then((text) => {
              if (text && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(text);
              }
            })
            .catch(() => {});
          return false;
        }

        return true;
      });

      window.setTimeout(() => {
        try {
          fitAddon?.fit();
        } catch {
          // The view may not have been laid out yet.
        }
      }, 50);

      term.writeln(
        "\x1b[38;2;148;163;184m[KubeView] Starting local shell" +
          (contextName ? ` for ${contextName}` : "") +
          "...\x1b[0m",
      );

      try {
        const { port, token } = await getStreamCredentials();
        if (isCancelled) return;

        const wsUrl = new URL(`ws://127.0.0.1:${port}/api/stream/terminal`);
        wsUrl.searchParams.set("token", token);
        if (contextName) wsUrl.searchParams.set("context", contextName);
        wsUrl.searchParams.set("shell", shell);

        ws = new WebSocket(wsUrl.toString());
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) return;
          setConnectionStatus("connected");
          if (term) {
            ws?.send(
              JSON.stringify({
                type: "resize",
                cols: term.cols || 80,
                rows: term.rows || 24,
              }),
            );
          }
          term?.focus();
        };

        ws.onmessage = (event) => {
          if (isCancelled || !term) return;
          if (event.data instanceof ArrayBuffer) {
            term.write(new Uint8Array(event.data));
          } else {
            term.write(event.data);
          }
        };

        ws.onerror = () => {
          resetStreamCredentials();
          if (!isCancelled) {
            setConnectionStatus("error");
            setErrorMsg("Unable to connect to the local shell stream.");
          }
        };

        ws.onclose = () => {
          if (!isCancelled) {
            setConnectionStatus("disconnected");
            term?.writeln(
              "\r\n\x1b[38;2;245;158;11m[KubeView] Local shell session ended.\x1b[0m\r\n",
            );
          }
        };

        term.onData((data) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });

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
            // Ignore transient layout errors.
          }
        });
        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }
      } catch (error) {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setConnectionStatus("error");
        setErrorMsg(message);
        term?.writeln(
          `\r\n\x1b[31m[KubeView] Unable to start the local terminal: ${message}\x1b[0m\r\n`,
        );
      }
    };

    void initTerminal();

    return () => {
      isCancelled = true;
      resizeObserver?.disconnect();
      ws?.close();
      wsRef.current = null;
      term?.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [enabled, contextName, shell, reconnectKey]);

  return {
    containerRef,
    connectionStatus,
    errorMsg,
    reconnect: () => setReconnectKey((value) => value + 1),
    clearScreen: () => termRef.current?.clear(),
    sendSigint: () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("\u0003");
      }
    },
    focusTerminal: () => termRef.current?.focus(),
  };
}
