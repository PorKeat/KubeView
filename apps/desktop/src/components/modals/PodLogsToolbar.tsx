"use client";

import {
  Search,
  X,
  ArrowDownToLine,
  WrapText,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

export interface PodLogsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filteredCount: number;
  wrapLines: boolean;
  onToggleWrapLines: () => void;
  showLineNumbers: boolean;
  onToggleLineNumbers: () => void;
  onScrollToBottom: () => void;
}

export function PodLogsToolbar({
  search,
  onSearchChange,
  filteredCount,
  wrapLines,
  onToggleWrapLines,
  showLineNumbers,
  onToggleLineNumbers,
  onScrollToBottom,
}: PodLogsToolbarProps) {
  return (
    <div className="h-10 border-b border-[var(--border)] px-4 sm:px-5 flex items-center justify-between text-xs bg-black/[0.02] dark:bg-black/20 shrink-0 gap-3">
      {/* Left: Search filter input */}
      <div className="relative flex items-center flex-1 max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--muted)] pointer-events-none" />
        <input
          type="text"
          placeholder="Search logs (e.g. error, timeout, GET)..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-16 py-1 bg-black/[0.03] dark:bg-black/40 border border-[var(--border)] rounded-lg text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--border-strong)] transition-all"
        />
        {search && (
          <div className="absolute right-2 flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[var(--muted)]">
              {filteredCount}
            </span>
            <Tooltip content="Clear search">
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Right: Display options & jump controls */}
      <div className="flex items-center gap-2 text-[11px] font-mono">
        {/* Wrap Toggle */}
        <button
          type="button"
          onClick={onToggleWrapLines}
          className={cn(
            "px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer border",
            wrapLines
              ? "bg-[var(--surface-active)] text-[var(--foreground)] border-[var(--border)] font-medium shadow-2xs"
              : "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)] border-transparent",
          )}
          title="Toggle line wrapping"
        >
          <WrapText className="w-3 h-3" />
          <span>Wrap</span>
        </button>

        {/* Line Numbers Toggle */}
        <button
          type="button"
          onClick={onToggleLineNumbers}
          className={cn(
            "px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer border",
            showLineNumbers
              ? "bg-[var(--surface-active)] text-[var(--foreground)] border-[var(--border)] font-medium shadow-2xs"
              : "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)] border-transparent",
          )}
          title="Toggle line numbers"
        >
          <ListOrdered className="w-3 h-3" />
          <span>Line Numbers</span>
        </button>

        {/* Total Lines counter */}
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)] hidden sm:inline-block">
          Lines:{" "}
          <strong className="text-[var(--foreground)]">{filteredCount}</strong>
          {search && <span> (filtered)</span>}
        </span>

        {/* Jump to bottom */}
        <button
          type="button"
          onClick={onScrollToBottom}
          className="px-2 py-0.5 rounded-md text-[11px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.98]"
          title="Scroll to latest line"
        >
          <ArrowDownToLine className="w-3 h-3" />
          <span>Bottom</span>
        </button>
      </div>
    </div>
  );
}
