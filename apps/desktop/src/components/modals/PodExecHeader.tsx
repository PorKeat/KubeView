"use client";

import {
  X,
  Terminal,
  Copy,
  Trash2,
  Check,
  Layers,
  Maximize2,
  Minimize2,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Tooltip } from "@/components/ui/Tooltip";

export type PodExecMode = "interactive" | "history";

export interface PodExecHeaderProps {
  podName: string;
  namespace: string;
  execMode: PodExecMode;
  onExecModeChange: (mode: PodExecMode) => void;
  containerList: string[];
  selectedContainer: string;
  onSelectContainer: (container: string) => void;
  copied: boolean;
  onClearHistory: () => void;
  onCopyHistory: () => void;
  isMaximized: boolean;
  onToggleMaximized: () => void;
  onClose: () => void;
}

export function PodExecHeader({
  podName,
  namespace,
  execMode,
  onExecModeChange,
  containerList,
  selectedContainer,
  onSelectContainer,
  copied,
  onClearHistory,
  onCopyHistory,
  isMaximized,
  onToggleMaximized,
  onClose,
}: PodExecHeaderProps) {
  return (
    <div className="min-h-14 border-b border-[var(--border)] px-3 sm:px-4 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between shrink-0 bg-slate-50/80 dark:bg-black/30 gap-2">
      <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20 shadow-xs shrink-0">
          <Terminal className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-[var(--foreground)] truncate font-mono">
            {podName}
          </span>
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/[0.05] dark:bg-white/[0.08] text-[var(--muted)] border border-[var(--border)]">
            ns: {namespace}
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            {execMode === "interactive" ? "WebSocket PTY" : "SPDY Exec"}
          </span>
        </div>
      </div>

      <div className="flex max-w-full items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.06] p-0.5 rounded-lg border border-[var(--border)] text-[11px] font-medium mr-1">
          <button
            onClick={() => onExecModeChange("interactive")}
            aria-label="Interactive Shell"
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-mono",
              execMode === "interactive"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-2xs font-semibold"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Interactive Shell</span>
          </button>
          <button
            onClick={() => onExecModeChange("history")}
            aria-label="Command Runner"
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-mono",
              execMode === "history"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-2xs font-semibold"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Command Runner</span>
          </button>
        </div>

        {/* Container Selector */}
        {containerList.length > 1 && (
          <CustomSelect
            value={selectedContainer}
            onChange={onSelectContainer}
            options={containerList.map((c) => ({ value: c, label: c }))}
            icon={<Layers className="w-3.5 h-3.5 text-[#F08A42]" />}
            placeholder="Container"
          />
        )}

        {/* Clear Screen (Command runner mode) */}
        {execMode === "history" && (
          <>
            <Tooltip content="Clear Terminal Output">
              <button
                onClick={onClearHistory}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Clear Terminal Output"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip
              content={
                copied ? "Copied to clipboard" : "Copy All Terminal Output"
              }
            >
              <button
                onClick={onCopyHistory}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Copy All Terminal Output"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </Tooltip>
          </>
        )}

        {/* Maximize / Restore */}
        <Tooltip content={isMaximized ? "Restore window" : "Maximize window"}>
          <button
            onClick={onToggleMaximized}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            aria-label={isMaximized ? "Restore window" : "Maximize window"}
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </Tooltip>

        {/* Close */}
        <Tooltip content="Close session" shortcut="Esc">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-[var(--muted)] transition-colors cursor-pointer ml-1"
            aria-label="Close interactive exec session"
          >
            <X className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
