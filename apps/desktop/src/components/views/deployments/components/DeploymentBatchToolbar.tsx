"use client";

import * as React from "react";
import { Box, Copy, X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

export interface DeploymentBatchToolbarProps {
  selectedItemsCount: number;
  onViewPods: () => void;
  onCopyRestartCommands: () => void;
  onClearSelection: () => void;
}

export function DeploymentBatchToolbar({
  selectedItemsCount,
  onViewPods,
  onCopyRestartCommands,
  onClearSelection,
}: DeploymentBatchToolbarProps) {
  if (selectedItemsCount === 0) return null;

  return (
    <div className="h-9 bg-[var(--surface-active)] border-b border-[var(--border)] px-4 flex items-center justify-between text-xs text-[var(--foreground)] animate-in fade-in duration-100">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[var(--accent)] font-mono">
          {selectedItemsCount}
        </span>
        <span>deployment{selectedItemsCount > 1 ? "s" : ""} selected</span>
      </div>

      <div className="flex items-center gap-1.5">
        {selectedItemsCount === 1 && (
          <button
            onClick={onViewPods}
            className="px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Box className="w-3.5 h-3.5 text-emerald-500" />
            <span>View Pods</span>
          </button>
        )}
        <button
          onClick={onCopyRestartCommands}
          className="px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-cyan-500" />
          <span>Copy Restart Commands</span>
        </button>
        <Tooltip content="Clear selection">
          <button
            onClick={onClearSelection}
            className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
