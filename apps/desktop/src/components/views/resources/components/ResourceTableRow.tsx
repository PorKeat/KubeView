"use client";

import * as React from "react";
import { CheckSquare, Square, FileText, Terminal, RotateCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PodSummary } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";

export interface ResourceTableRowProps {
  item: PodSummary;
  isSelected: boolean;
  onToggleSelect: (key: string) => void;
  onRowClick: (item: PodSummary) => void;
  onLogsClick: (item: PodSummary) => void;
  onExecClick: (item: PodSummary) => void;
  onRestartClick: (item: PodSummary) => void;
  onDeleteClick: (item: PodSummary) => void;
}

export function ResourceTableRow({
  item,
  isSelected,
  onToggleSelect,
  onRowClick,
  onLogsClick,
  onExecClick,
  onRestartClick,
  onDeleteClick,
}: ResourceTableRowProps) {
  const itemKey = `${item.namespace}/${item.name}`;

  const renderStatus = (status: string) => {
    switch (status) {
      case "Running":
        return <StatusBeacon variant="healthy" label={status} size="xs" pulse={false} />;
      case "Pending":
      case "ContainerCreating":
        return <StatusBeacon variant="pending" label={status} size="xs" pulse={true} />;
      case "Completed":
      case "Succeeded":
        return <StatusBeacon variant="muted" label={status} size="xs" pulse={false} />;
      default:
        return <StatusBeacon variant="critical" label={status} size="xs" pulse={true} />;
    }
  };

  return (
    <tr
      onClick={() => onRowClick(item)}
      className={cn(
        "h-9 hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group",
        isSelected && "bg-[var(--accent)]/5 dark:bg-[var(--accent)]/10"
      )}
    >
      <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onToggleSelect(itemKey)}
          className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
        >
          {isSelected ? (
            <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
          ) : (
            <Square className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
          )}
        </button>
      </td>
      <td className="py-1 px-3 font-medium font-mono text-[var(--foreground)] truncate max-w-xs">
        {item.name}
      </td>
      <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.namespace}</td>
      <td className="py-1 px-3">{renderStatus(item.status)}</td>
      <td className="py-1 px-3 font-mono text-[var(--foreground)]">{item.ready}</td>
      <td className="py-1 px-3 font-mono text-[var(--muted)]">
        <span className={cn(item.restarts > 0 && "text-amber-500 font-semibold")}>
          {item.restarts}
        </span>
      </td>
      <td className="py-1 px-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[var(--foreground)] text-[11px] w-9">{item.cpu}</span>
          {item.cpuPercent > 0 && (
            <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden w-12">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${item.cpuPercent}%` }}
              />
            </div>
          )}
        </div>
      </td>
      <td className="py-1 px-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[var(--foreground)] text-[11px] w-12">{item.memory}</span>
          {item.memoryPercent > 0 && (
            <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden w-12">
              <div
                className={cn(
                  "h-full rounded-full",
                  item.memoryPercent > 70 ? "bg-rose-500" : "bg-cyan-500 dark:bg-cyan-400"
                )}
                style={{ width: `${item.memoryPercent}%` }}
              />
            </div>
          )}
        </div>
      </td>
      <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.age}</td>
      <td className="py-1 px-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 1. View Logs */}
          <button
            onClick={() => onLogsClick(item)}
            className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="View Logs"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* 2. Exec Shell */}
          <button
            onClick={() => onExecClick(item)}
            className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Exec Shell"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>

          {/* 3. Restart */}
          <button
            onClick={() => onRestartClick(item)}
            className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Restart Pod"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* 4. Delete Pod */}
          <button
            onClick={() => onDeleteClick(item)}
            className="p-1 rounded hover:bg-rose-500/15 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
            title="Delete Pod"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
