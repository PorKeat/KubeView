"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FleetFilter, FleetFilterOption } from "../lib/fleetOverview";

export interface FleetToolbarProps {
  search: string;
  filter: FleetFilter;
  filterOptions: FleetFilterOption[];
  shownCount: number;
  hasSnapshot: boolean;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: FleetFilter) => void;
}

export function FleetToolbar({
  search,
  filter,
  filterOptions,
  shownCount,
  hasSnapshot,
  isLoading,
  onSearchChange,
  onFilterChange,
}: FleetToolbarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-xs lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Filter clusters by name, server, provider..."
          aria-label="Filter clusters"
          data-testid="fleet-search"
          className="w-full rounded-lg border border-[var(--border)] bg-slate-50 py-1.5 pl-8 pr-7 font-mono text-xs text-[var(--foreground)] outline-hidden transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear cluster search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div
        role="group"
        aria-label="Filter clusters by health"
        className="flex max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-slate-100/80 p-0.5 text-xs dark:bg-black/30"
      >
        {filterOptions.map((option) => {
          const active = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              data-testid={`fleet-filter-${option.id}`}
              onClick={() => onFilterChange(option.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                active
                  ? "bg-[var(--surface)] text-[var(--foreground)] font-semibold shadow-xs border border-[var(--border)]/70"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <span>{option.label}</span>
              <span className="font-mono text-[9px] tabular-nums text-[var(--muted)]">
                {option.count}
              </span>
            </button>
          );
        })}
      </div>

      <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
        {!hasSnapshot && isLoading
          ? "Loading clusters..."
          : `${shownCount} shown`}
      </span>
    </div>
  );
}
