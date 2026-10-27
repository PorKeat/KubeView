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

export type DaemonSetSortField =
  "name" | "namespace" | "status" | "ready" | "age";

export interface DaemonSetTableHeaderProps {
  sortField: DaemonSetSortField;
  sortAsc: boolean;
  onSort: (field: DaemonSetSortField) => void;
  selectedItemsCount: number;
  isPageAllSelected: boolean;
  isPageSomeSelected: boolean;
  onToggleSelectAll: () => void;
}

export function DaemonSetTableHeader({
  sortField,
  sortAsc,
  onSort,
  selectedItemsCount,
  isPageAllSelected,
  isPageSomeSelected,
  onToggleSelectAll,
}: DaemonSetTableHeaderProps) {
  const renderSortIndicator = (field: DaemonSetSortField) => {
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
      <tr className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8 whitespace-nowrap">
        <th className="w-[3%] px-2 text-center">
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
          className="w-[17%] py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
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
          className="w-[11%] py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
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
          className="w-[9%] py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Status</span>
            {renderSortIndicator("status")}
          </div>
        </th>
        <th className="w-[8%] py-1 px-2">Desired</th>
        <th className="w-[8%] py-1 px-2">Current</th>
        <th
          {...sortableHeaderProps({
            field: "ready",
            activeField: sortField,
            ascending: sortAsc,
            onSort,
          })}
          className="w-[7%] py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Ready</span>
            {renderSortIndicator("ready")}
          </div>
        </th>
        <th className="w-[9%] py-1 px-2">Up-to-date</th>
        <th className="w-[9%] py-1 px-2">Available</th>
        <th className="w-[10%] py-1 px-2">Node Selector</th>
        <th
          {...sortableHeaderProps({
            field: "age",
            activeField: sortField,
            ascending: sortAsc,
            onSort,
          })}
          className="w-[5%] py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Age</span>
            {renderSortIndicator("age")}
          </div>
        </th>
        <th className="w-[4%] py-1 px-2 text-right" aria-label="Actions"></th>
      </tr>
    </thead>
  );
}
