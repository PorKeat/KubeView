"use client";

import type * as React from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sortableHeaderProps } from "@/lib/sortableHeader";
import { StatusBeacon, Tooltip } from "@/components/ui";
import { toast } from "sonner";
import type { NetworkingColumn, NetworkingStatusDescriptor } from "../types";

export interface NetworkingTableProps<T> {
  icon: React.ElementType;
  nounSingular: string;
  columns: NetworkingColumn<T>[];
  paginatedItems: T[];
  getKey: (item: T) => string;
  getName: (item: T) => string;
  getNamespace: (item: T) => string;
  getStatus: (item: T) => NetworkingStatusDescriptor;
  getAge: (item: T) => string;
  sortField: string;
  sortAsc: boolean;
  handleSort: (field: string) => void;
  copiedKey: string | null;
  setCopiedKey: React.Dispatch<React.SetStateAction<string | null>>;
  copyDescribe: (item: T) => void;
  onRowClick: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onDiagnose?: (item: T) => void;
  testIdPrefix: string;
}

export function NetworkingTable<T>({
  icon: Icon,
  nounSingular,
  columns,
  paginatedItems,
  getKey,
  getName,
  getNamespace,
  getStatus,
  getAge,
  sortField,
  sortAsc,
  handleSort,
  copiedKey,
  setCopiedKey,
  copyDescribe,
  onRowClick,
  onEdit,
  onDelete,
  onDiagnose,
  testIdPrefix,
}: NetworkingTableProps<T>) {
  const renderSortIndicator = (field: string) =>
    sortField === field ? (
      sortAsc ? (
        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
      ) : (
        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
      )
    ) : (
      <ArrowUpDown className="w-3 h-3 opacity-30" />
    );

  return (
    <div
      className="flex-1 overflow-auto min-h-0"
      data-testid="networking-table-scroll"
      data-tour={`${testIdPrefix}-table`}
    >
      <table className="w-full text-left text-xs border-collapse table-fixed">
        <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] select-none">
          <tr className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8 whitespace-nowrap">
            <th
              {...sortableHeaderProps({
                field: "name",
                activeField: sortField,
                ascending: sortAsc,
                onSort: handleSort,
              })}
              className="w-[18%] py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors"
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
                onSort: handleSort,
              })}
              className="w-[8%] py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors"
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
                onSort: handleSort,
              })}
              className="w-[12%] py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors"
            >
              <div className="flex items-center gap-1">
                <span>Status</span>
                {renderSortIndicator("status")}
              </div>
            </th>
            {columns.map((column) =>
              column.sortValue ? (
                <th
                  key={column.key}
                  {...sortableHeaderProps({
                    field: column.key,
                    activeField: sortField,
                    ascending: sortAsc,
                    onSort: handleSort,
                  })}
                  className={cn(
                    "py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors",
                    column.widthClass,
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.label}</span>
                    {renderSortIndicator(column.key)}
                  </div>
                </th>
              ) : (
                <th
                  key={column.key}
                  className={cn("py-1 px-2", column.widthClass)}
                >
                  {column.label}
                </th>
              ),
            )}
            <th
              {...sortableHeaderProps({
                field: "age",
                activeField: sortField,
                ascending: sortAsc,
                onSort: handleSort,
              })}
              className="w-[5%] py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors"
            >
              <div className="flex items-center gap-1">
                <span>Age</span>
                {renderSortIndicator("age")}
              </div>
            </th>
            <th
              className={cn(
                "sticky right-0 z-30 border-l border-[var(--border)] bg-[var(--surface)] py-1 px-2 text-right",
                onEdit || onDelete || onDiagnose
                  ? "w-28"
                  : "w-[4%] min-w-[36px]",
              )}
              aria-label="Actions"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {paginatedItems.map((item) => {
            const key = getKey(item);
            const name = getName(item);
            const status = getStatus(item);
            const copied = copiedKey === key;
            return (
              <tr
                key={key}
                onClick={() => onRowClick(item)}
                className="hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group h-9 text-xs"
                data-testid={`${testIdPrefix}-row`}
              >
                <td className="py-1 px-2 font-medium font-mono text-[var(--foreground)] truncate">
                  <div className="relative flex items-center gap-1.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
                    <span className="truncate" title={name}>
                      {name}
                    </span>
                    <Tooltip
                      content={
                        copied
                          ? "Copied!"
                          : `Copy ${nounSingular.toLowerCase()} name`
                      }
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigator.clipboard.writeText(name);
                          setCopiedKey(key);
                          toast.success(`Copied: ${name}`);
                          setTimeout(() => setCopiedKey(null), 1500);
                        }}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        aria-label={`Copy ${nounSingular.toLowerCase()} name`}
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                </td>
                <td className="py-1 px-2 font-mono text-[var(--muted)] truncate">
                  {getNamespace(item) || "Cluster Scope"}
                </td>
                <td className="py-1 px-2 whitespace-nowrap">
                  <StatusBeacon
                    variant={status.variant}
                    label={status.label}
                    size="xs"
                    pulse={status.pulse}
                  />
                </td>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="py-1 px-2 text-[var(--foreground)] truncate"
                  >
                    {column.render(item)}
                  </td>
                ))}
                <td className="py-1 px-2 font-mono text-[var(--muted)] truncate">
                  {getAge(item)}
                </td>
                <td
                  className="sticky right-0 z-10 border-l border-[var(--border)] bg-[var(--surface)] py-1 px-2 text-right group-hover:bg-[var(--surface-hover)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-0.5">
                    <Tooltip content="Copy kubectl describe command">
                      <button
                        type="button"
                        onClick={() => copyDescribe(item)}
                        className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/10 dark:hover:bg-white/10 opacity-60 group-hover:opacity-100 transition-colors cursor-pointer"
                        aria-label={`Copy kubectl describe for ${name}`}
                      >
                        {copiedKey === key ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </Tooltip>
                    {onDiagnose && (
                      <Tooltip content="Diagnose connectivity">
                        <button
                          type="button"
                          onClick={() => onDiagnose(item)}
                          className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 opacity-60 group-hover:opacity-100 transition-colors cursor-pointer"
                          aria-label={`Diagnose ${name}`}
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}
                    {onEdit && (
                      <Tooltip content="Edit resource">
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          data-testid={`${testIdPrefix}-edit`}
                          className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/10 dark:hover:bg-white/10 opacity-60 group-hover:opacity-100 transition-colors cursor-pointer"
                          aria-label={`Edit ${name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}
                    {onDelete && (
                      <Tooltip content="Delete resource">
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          className="p-1 rounded-md text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 opacity-60 group-hover:opacity-100 transition-colors cursor-pointer"
                          aria-label={`Delete ${name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
