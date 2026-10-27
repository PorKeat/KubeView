"use client";

import { motion } from "motion/react";
import { AlertTriangle, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";
import type { NetworkingFilterOption } from "../types";

export interface NetworkingToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  searchPlaceholder: string;
  nounPlural: string;
  filterOptions: NetworkingFilterOption[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  testIdPrefix: string;
  sortedItemsCount: number;
  onRefresh: () => void;
  isLoading: boolean;
}

export function NetworkingToolbar({
  search,
  setSearch,
  searchPlaceholder,
  nounPlural,
  filterOptions,
  activeFilter,
  setActiveFilter,
  testIdPrefix,
  sortedItemsCount,
  onRefresh,
  isLoading,
}: NetworkingToolbarProps) {
  return (
    <div className="min-h-11 border-b border-[var(--border)] px-2 sm:px-3 py-1.5 flex flex-wrap lg:flex-nowrap items-center justify-between shrink-0 glass-panel gap-2 sm:gap-3">
      <div className="relative flex-1 min-w-0 w-full max-w-sm order-1 sm:order-none sm:w-auto">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-black/30 border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)] transition-all font-mono"
          aria-label={`Filter ${nounPlural}`}
          data-testid={`${testIdPrefix}-search`}
        />
        {search && (
          <Tooltip content="Clear search">
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="relative flex max-w-full min-w-0 shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap rounded-lg border border-[var(--border)] bg-slate-100/80 p-0.5 text-xs select-none order-2 sm:order-none dark:bg-black/30">
        {filterOptions.map((pill) => {
          const active = activeFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => setActiveFilter(pill.id)}
              data-testid={`${testIdPrefix}-filter-${pill.id}`}
              className={cn(
                "relative z-10 px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                active
                  ? "text-[var(--foreground)] dark:text-white font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              {active && (
                <motion.div
                  layoutId={`${testIdPrefix}-status-filter-pill`}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-md bg-white dark:bg-white/[0.12] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none"
                />
              )}
              {pill.warn && pill.count > 0 && (
                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
              )}
              <span>{pill.label}</span>
              <span
                className={cn(
                  "text-[10px] font-mono tabular-nums",
                  pill.warn && pill.count > 0
                    ? "text-rose-500 font-semibold"
                    : "text-[var(--muted)]",
                )}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex max-w-full flex-wrap items-center gap-2 text-xs text-[var(--muted)] shrink-0 order-3 sm:order-none">
        <span className="font-mono text-[11px]">{sortedItemsCount} items</span>
        <div className="h-3 w-[1px] bg-[var(--border)]" />
        <Tooltip content={`Refresh ${nounPlural}`}>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            aria-label={`Refresh ${nounPlural}`}
            data-testid={`${testIdPrefix}-refresh`}
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5",
                isLoading && "animate-spin text-[var(--accent)]",
              )}
            />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
