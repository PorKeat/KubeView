"use client";

import "@xterm/xterm/css/xterm.css";
import * as React from "react";
import { RotateCw, Terminal as TerminalIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useClusterStore } from "@/stores/clusterStore";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useLocalTerminal } from "./useLocalTerminal";

const LOCAL_SHELL_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "zsh", label: "zsh" },
  { value: "bash", label: "bash" },
  { value: "sh", label: "sh" },
];

const STATUS_TEXT: Record<string, string> = {
  connected: "Connected",
  connecting: "Connecting...",
  disconnected: "Disconnected",
  error: "Connection error",
};

const STATUS_TONE: Record<string, string> = {
  connected: "text-emerald-500 dark:text-emerald-400",
  connecting: "text-amber-500 dark:text-amber-400",
  disconnected: "text-[var(--muted)]",
  error: "text-rose-500 dark:text-rose-400",
};

export function TerminalView() {
  const localTerminalShell = useSettingsStore(
    (state) => state.localTerminalShell,
  );
  const updatePreferences = useSettingsStore(
    (state) => state.updatePreferences,
  );
  const currentContext = useClusterStore((state) => state.currentContext);

  const {
    containerRef,
    connectionStatus,
    errorMsg,
    reconnect,
    clearScreen,
    sendSigint,
    focusTerminal,
  } = useLocalTerminal({
    enabled: true,
    contextName: currentContext || undefined,
    shell: localTerminalShell,
  });

  return (
    <div
      data-testid="local-terminal-view"
      className="flex h-full flex-col overflow-hidden"
    >
      <header className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-2 py-1.5 glass-panel sm:px-3 lg:flex-nowrap">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TerminalIcon
            className="h-4 w-4 shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <h1
            className="shrink-0 text-xs font-semibold text-[var(--foreground)]"
            title="Runs on this computer with your user privileges."
          >
            Terminal
          </h1>
          <span
            className="max-w-[220px] truncate font-mono text-[10px] text-[var(--muted)]"
            title={
              currentContext
                ? `KUBEVIEW_CONTEXT=${currentContext}. Your shell's own KUBECONFIG may take precedence.`
                : "No context selected. The shell uses your local environment."
            }
          >
            {currentContext || "No context"}
          </span>
          <span className="hidden h-3 w-px bg-[var(--border)] sm:block" />
          <CustomSelect
            value={localTerminalShell}
            onChange={(value) =>
              updatePreferences({ localTerminalShell: value })
            }
            options={LOCAL_SHELL_OPTIONS}
            triggerTestId="terminal-shell"
            ariaLabel="Local terminal shell"
            dropdownWidth="w-36"
          />
          <span
            className={cn(
              "flex items-center gap-1.5 font-mono text-[10px]",
              STATUS_TONE[connectionStatus],
            )}
            title={errorMsg || STATUS_TEXT[connectionStatus]}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {STATUS_TEXT[connectionStatus]}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={sendSigint}
            title="Send Ctrl+C"
            aria-label="Send Ctrl+C"
            className="cursor-pointer rounded-md px-2 py-1 font-mono text-[10px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            Ctrl+C
          </button>
          <button
            type="button"
            onClick={clearScreen}
            title="Clear terminal"
            aria-label="Clear terminal"
            className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={reconnect}
            title="Restart local shell"
            aria-label="Restart local shell"
            className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            <RotateCw
              className={cn(
                "h-3.5 w-3.5",
                connectionStatus === "connecting" && "animate-spin",
              )}
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="shrink-0 border-b border-rose-500/20 bg-rose-500/5 px-3 py-1.5 font-mono text-[10px] text-rose-600 dark:text-rose-400">
          {errorMsg}
        </div>
      )}

      <div
        className="min-h-0 flex-1 bg-[#080a0f] p-1.5 sm:p-2"
        onClick={focusTerminal}
      >
        <div
          ref={containerRef}
          data-testid="local-terminal"
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
