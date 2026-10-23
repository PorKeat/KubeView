"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

export interface BulkWorkloadToolbarAction {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  tone?: "default" | "danger";
}

export interface BulkWorkloadToolbarProps {
  selectedCount: number;
  noun: string;
  pluralNoun: string;
  actions: BulkWorkloadToolbarAction[];
  onClear: () => void;
}

export function BulkWorkloadToolbar({
  selectedCount,
  noun,
  pluralNoun,
  actions,
  onClear,
}: BulkWorkloadToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      data-testid="bulk-workload-toolbar"
      className="min-h-9 bg-[var(--surface-active)] border-b border-[var(--border)] px-2 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--foreground)] animate-in fade-in duration-100 shrink-0"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="font-semibold text-[var(--accent)] font-mono">
          {selectedCount}
        </span>
        <span className="truncate">
          {selectedCount === 1 ? noun : pluralNoun} selected
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              data-testid={`bulk-action-${action.id}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                action.tone === "danger"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 dark:text-rose-400"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          );
        })}
        <Tooltip content="Clear selection">
          <button
            type="button"
            onClick={onClear}
            data-testid="bulk-clear-selection"
            className="rounded-lg p-1 text-[var(--muted)] transition-colors hover:bg-black/5 hover:text-[var(--foreground)] cursor-pointer dark:hover:bg-white/5"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
