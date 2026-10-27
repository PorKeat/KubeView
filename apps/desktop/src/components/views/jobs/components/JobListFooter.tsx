"use client";

import type * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";

export interface JobListFooterProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  safeCurrentPage: number;
  totalPages: number;
  onPageChange: React.Dispatch<React.SetStateAction<number>>;
  sortedItemsCount: number;
  totalJobs: number;
  currentNamespace: string;
}

export function JobListFooter({
  pageSize,
  onPageSizeChange,
  safeCurrentPage,
  totalPages,
  onPageChange,
  sortedItemsCount,
  totalJobs,
  currentNamespace,
}: JobListFooterProps) {
  return (
    <div className="min-h-10 border-t border-[var(--border)] px-2 sm:px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-[var(--muted)] bg-[var(--surface)]/90 backdrop-blur-xs shrink-0 gap-2 sm:gap-4">
      <div className="flex min-w-0 max-w-full items-center gap-2 truncate">
        <span>
          Showing{" "}
          <span className="text-[var(--foreground)] font-mono font-medium">
            {sortedItemsCount === 0
              ? "0"
              : pageSize > 0
                ? `${(safeCurrentPage - 1) * pageSize + 1}–${Math.min(safeCurrentPage * pageSize, sortedItemsCount)}`
                : `1–${sortedItemsCount}`}
          </span>{" "}
          of{" "}
          <span className="text-[var(--foreground)] font-mono font-medium">
            {sortedItemsCount}
          </span>{" "}
          items
        </span>
        <span className="text-[var(--muted)]/40">·</span>
        <span className="font-mono">{currentNamespace}</span>
        {currentNamespace !== "all" && (
          <>
            <span className="text-[var(--muted)]/40">·</span>
            <span className="text-[10px]">{totalJobs} total jobs</span>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0 sm:gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">
            Rows:
          </span>
          <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/[0.04] p-0.5">
            {[50, 100, 250, 0].map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={pageSize === size}
                data-testid={`page-size-${size}`}
                onClick={() => onPageSizeChange(size)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer",
                  pageSize === size
                    ? "bg-[var(--surface-active)] dark:bg-white/10 text-[var(--foreground)] font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {size === 0 ? "All" : size}
              </button>
            ))}
          </div>
        </div>
        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <span className="font-mono">
              {safeCurrentPage}/{totalPages}
            </span>
            <Tooltip content="Previous page" disabled={safeCurrentPage <= 1}>
              <button
                disabled={safeCurrentPage <= 1}
                onClick={() => onPageChange((p) => Math.max(1, p - 1))}
                className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip
              content="Next page"
              disabled={safeCurrentPage >= totalPages}
            >
              <button
                disabled={safeCurrentPage >= totalPages}
                onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
                className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
