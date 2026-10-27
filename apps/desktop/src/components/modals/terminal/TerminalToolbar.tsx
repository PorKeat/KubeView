"use client";

import { AlertCircle, RefreshCw, Terminal as TerminalIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { ShellSelector } from "./ShellSelector";
import type { TerminalConnectionStatus } from "./types";

export function TerminalToolbar({
  containerName,
  podName,
  shell,
  onShellChange,
  connectionStatus,
  onSigint,
  onClearScreen,
  onReconnect,
  onFocusTerminal,
}: {
  containerName: string;
  podName: string;
  shell: string;
  onShellChange?: (shell: string) => void;
  connectionStatus: TerminalConnectionStatus;
  onSigint: () => void;
  onClearScreen: () => void;
  onReconnect: () => void;
  onFocusTerminal: () => void;
}) {
  return (
    <div className="h-9 px-3 border-b border-white/[0.08] bg-[#0c0f17] flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-2">
        <TerminalIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="text-[11px] font-mono font-medium text-slate-300">
          {containerName || "main"}@{podName}
        </span>
        <span className="text-white/20">/</span>

        <ShellSelector
          shell={shell}
          onShellChange={onShellChange}
          onFocusTerminal={onFocusTerminal}
        />

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
          onClick={onSigint}
          className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 border border-white/[0.08] transition-colors cursor-pointer"
          title="Send SIGINT interrupt signal (Ctrl+C)"
        >
          Ctrl+C
        </button>
        <button
          onClick={onClearScreen}
          className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] transition-colors cursor-pointer"
          title="Clear terminal screen"
        >
          Clear
        </button>
        <Tooltip content="Reconnect shell session">
          <button
            onClick={onReconnect}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Reconnect shell session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
