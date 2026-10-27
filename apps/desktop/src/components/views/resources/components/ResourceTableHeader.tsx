"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckSquare,
  MinusSquare,
  Square,
} from "lucide-react";
import { sortableHeaderProps } from "@/lib/sortableHeader";
import { Tooltip } from "@/components/ui";
import type { PodListSortField } from "../hooks/usePodListModel";

export interface ResourceTableHeaderProps {
  sortField: PodListSortField;
  sortAsc: boolean;
  handleSort: (field: PodListSortField) => void;
  isPageAllSelected: boolean;
  isPageSomeSelected: boolean;
  selectedItemsCount: number;
  toggleSelectAll: () => void;
}

export function ResourceTableHeader({
  sortField,
  sortAsc,
  handleSort,
  isPageAllSelected,
  isPageSomeSelected,
  selectedItemsCount,
  toggleSelectAll,
}: ResourceTableHeaderProps) {
  return (
    <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] select-none">
      <tr className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8">
        <th className="w-[3%] px-2 text-center">
          <Tooltip
            content={
              isPageAllSelected ? "Deselect all on page" : "Select all on page"
            }
          >
            <button
              onClick={toggleSelectAll}
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
            onSort: handleSort,
          })}
          className="w-[20%] py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Name</span>
            {sortField === "name" ? (
              sortAsc ? (
                <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
              ) : (
                <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </div>
        </th>
        <th
          {...sortableHeaderProps({
            field: "namespace",
            activeField: sortField,
            ascending: sortAsc,
            onSort: handleSort,
          })}
          className="w-[11%] py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Namespace</span>
            {sortField === "namespace" ? (
              sortAsc ? (
                <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
              ) : (
                <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </div>
        </th>
        <th
          {...sortableHeaderProps({
            field: "status",
            activeField: sortField,
            ascending: sortAsc,
            onSort: handleSort,
          })}
          className="w-[9%] py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Status</span>
            {sortField === "status" ? (
              sortAsc ? (
                <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
              ) : (
                <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </div>
        </th>
        <th className="w-[6%] py-1 px-3">Ready</th>
        <th
          {...sortableHeaderProps({
            field: "restarts",
            activeField: sortField,
            ascending: sortAsc,
            onSort: handleSort,
          })}
          className="w-[8%] py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Restarts</span>
            {sortField === "restarts" ? (
              sortAsc ? (
                <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
              ) : (
                <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </div>
        </th>
        <th
          {...sortableHeaderProps({
            field: "node",
            activeField: sortField,
            ascending: sortAsc,
            onSort: handleSort,
          })}
          className="w-[11%] py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Node</span>
            {sortField === "node" ? (
              sortAsc ? (
                <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
              ) : (
                <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </div>
        </th>
        <th className="w-[9%] py-1 px-3">IP</th>
        <th className="w-[6%] py-1 px-3">CPU</th>
        <th className="w-[7%] py-1 px-3">Memory</th>
        <th
          {...sortableHeaderProps({
            field: "age",
            activeField: sortField,
            ascending: sortAsc,
            onSort: handleSort,
          })}
          className="w-[5%] py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span>Age</span>
            {sortField === "age" ? (
              sortAsc ? (
                <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
              ) : (
                <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </div>
        </th>
        <th className="w-[5%] py-1 px-2 text-right" aria-label="Actions"></th>
      </tr>
    </thead>
  );
}
