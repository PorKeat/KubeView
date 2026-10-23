"use client";

import * as React from "react";
import { RotateCw, Trash2, X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

export interface ResourceBatchToolbarProps {
  selectedItemsCount: number;
  onBulkRestart: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export function ResourceBatchToolbar({
  selectedItemsCount,
  onBulkRestart,
  onBulkDelete,
  onClearSelection,
}: ResourceBatchToolbarProps) {
  if (selectedItemsCount === 0) return null;

  return (
    <div className="h-9 bg-[var(--surface-active)] border-b border-[var(--border)] px-4 flex items-center justify-between text-xs text-[var(--foreground)] animate-in fade-in duration-100">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[var(--accent)] font-mono">
          {selectedItemsCount}
        </span>
        <span>pod{selectedItemsCount > 1 ? "s" : ""} selected</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onBulkRestart}
          className="px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5 text-cyan-500" />
          <span>Restart Workloads ({selectedItemsCount})</span>
        </button>
        <button
          onClick={onBulkDelete}
          className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Selected ({selectedItemsCount})</span>
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
