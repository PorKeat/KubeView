"use client";

import type * as React from "react";
import { motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";

export interface ResourceListFooterProps {
  sortedItemsLength: number;
  pageSize: number;
  safeCurrentPage: number;
  totalPages: number;
  currentNamespace: string;
  podNodeFilter: string | null;
  basePodsLength: number;
  podsLength: number;
  setPageSize: (size: number) => void;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export function ResourceListFooter({
  sortedItemsLength,
  pageSize,
  safeCurrentPage,
  totalPages,
  currentNamespace,
  podNodeFilter,
  basePodsLength,
  podsLength,
  setPageSize,
  setCurrentPage,
}: ResourceListFooterProps) {
  return (
    <div className="min-h-10 border-t border-[var(--border)] px-2 sm:px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-[var(--muted)] bg-[var(--surface)]/90 backdrop-blur-xs shrink-0 gap-2 sm:gap-4">
      <div className="flex min-w-0 max-w-full items-center gap-2 truncate">
        <span>
          Showing{" "}
          <span className="text-[var(--foreground)] font-mono font-medium">
            {sortedItemsLength === 0
              ? "0"
              : pageSize > 0
                ? `${(safeCurrentPage - 1) * pageSize + 1}–${Math.min(
                    safeCurrentPage * pageSize,
                    sortedItemsLength,
                  )}`
                : `1–${sortedItemsLength}`}
          </span>{" "}
          of{" "}
          <span className="text-[var(--foreground)] font-mono font-medium">
            {sortedItemsLength}
          </span>{" "}
          items
        </span>
        <span className="text-[var(--muted)]/40">·</span>
        <div className="inline-flex items-center gap-1">
          <span className="text-[var(--muted)]">namespace:</span>
          <span className="font-mono font-medium text-[var(--foreground)] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[10px]">
            {currentNamespace}
          </span>
        </div>
        {podNodeFilter && (
          <>
            <span className="text-[var(--muted)]/40">·</span>
            <div className="inline-flex items-center gap-1">
              <span className="text-[var(--muted)]">node:</span>
              <span className="font-mono font-medium text-[var(--foreground)] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[10px]">
                {podNodeFilter}
              </span>
            </div>
          </>
        )}
        {sortedItemsLength !==
          (podNodeFilter ? basePodsLength : podsLength) && (
          <span className="text-[10px] text-[var(--muted)] opacity-70">
            (filtered from {podNodeFilter ? basePodsLength : podsLength} total)
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0 sm:gap-4">
        {/* Page size selector with sliding spring indicator */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">
            Rows:
          </span>
          <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/[0.04] p-0.5 relative">
            {[50, 100, 250, 0].map((size) => {
              const isSelected = pageSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={isSelected}
                  data-testid={`page-size-${size}`}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "relative px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer select-none",
                    isSelected
                      ? "text-[var(--foreground)] font-semibold"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="pageSizeIndicator"
                      className="absolute inset-0 rounded-md bg-[var(--surface-active)] dark:bg-white/10 shadow-xs border border-[var(--border)]/60"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 32,
                        mass: 0.8,
                      }}
                    />
                  )}
                  <span className="relative z-10">
                    {size === 0 ? "All" : size}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Page navigation with tactile animated buttons */}
        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[var(--muted)]">
              Page{" "}
              <motion.strong
                key={safeCurrentPage}
                initial={{ opacity: 0.4, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[var(--foreground)] font-semibold inline-block min-w-[12px] text-center"
              >
                {safeCurrentPage}
              </motion.strong>{" "}
              of{" "}
              <strong className="text-[var(--foreground)] font-semibold">
                {totalPages}
              </strong>
            </span>

            <div className="flex items-center gap-1">
              <Tooltip content="First page" disabled={safeCurrentPage <= 1}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </motion.button>
              </Tooltip>

              <Tooltip content="Previous page" disabled={safeCurrentPage <= 1}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </motion.button>
              </Tooltip>

              <Tooltip
                content="Next page"
                disabled={safeCurrentPage >= totalPages}
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
              </Tooltip>

              <Tooltip
                content="Last page"
                disabled={safeCurrentPage >= totalPages}
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </motion.button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
