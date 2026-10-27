"use client";

import { sortableHeaderProps } from "@/lib/sortableHeader";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  MinusSquare,
  Square,
} from "lucide-react";
import { Tooltip } from "@/components/ui";

export type JobSortField = "name" | "namespace" | "status" | "age";

export interface JobTableHeaderProps {
  sortField: JobSortField;
  sortAsc: boolean;
  onSort: (field: JobSortField) => void;
  selectedItemsCount: number;
  isPageAllSelected: boolean;
  isPageSomeSelected: boolean;
  onToggleSelectAll: () => void;
}

export function JobTableHeader({
  sortField,
  sortAsc,
  onSort,
  selectedItemsCount,
  isPageAllSelected,
  isPageSomeSelected,
  onToggleSelectAll,
}: JobTableHeaderProps) {
  const renderSortIndicator = (field: JobSortField) => {
    if (sortField === field) {
      return sortAsc ? (
        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
      ) : (
        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
      );
    }
    return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  };

  return (
    <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] select-none">
      <tr className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8">
        <th className="w-8 px-2 text-center">
          <Tooltip
            content={
              isPageAllSelected ? "Deselect all on page" : "Select all on page"
            }
          >
            <button
              onClick={onToggleSelectAll}
              className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
              aria-label={
                isPageAllSelected
                  ? "Deselect all on page"
                  : "Select all on page"
              }
            >
              {isPageAllSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : isPageSomeSelected || selectedItemsCount > 0 ? (
                <MinusSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
          </Tooltip>
        </th>

        <th
          {...sortableHeaderProps({
            field: "name",
            activeField: sortField,
            ascending: sortAsc,
            onSort,
          })}
          className="w-52 sm:w-60 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Name</span>
            {renderSortIndicator("name")}
          </div>
        </th>
        <th
          {...sortableHeaderProps({
            field: "namespace",
            activeField: sortField,
            ascending: sortAsc,
            onSort,
          })}
          className="w-24 sm:w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Namespace</span>
            {renderSortIndicator("namespace")}
          </div>
        </th>
        <th
          {...sortableHeaderProps({
            field: "status",
            activeField: sortField,
            ascending: sortAsc,
            onSort,
          })}
          className="w-24 sm:w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Status</span>
            {renderSortIndicator("status")}
          </div>
        </th>
        <th className="w-24 py-1 px-3">Completions</th>
        <th className="w-20 py-1 px-3">Duration</th>
        <th className="w-40 py-1 px-3">Owner</th>
        <th
          {...sortableHeaderProps({
            field: "age",
            activeField: sortField,
            ascending: sortAsc,
            onSort,
          })}
          className="w-14 sm:w-16 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Age</span>
            {renderSortIndicator("age")}
          </div>
        </th>
        <th className="w-9 py-1 px-2 text-right" aria-label="Actions"></th>
      </tr>
    </thead>
  );
}
