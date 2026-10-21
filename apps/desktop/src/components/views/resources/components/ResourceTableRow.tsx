"use client";

import * as React from "react";
import {
  CheckSquare,
  Square,
  FileText,
  Terminal,
  RotateCw,
  Trash2,
  Copy,
  Check,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PodSummary } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";

export interface ResourceTableRowProps {
  item: PodSummary;
  isSelected: boolean;
  density?: "comfortable" | "compact";
  onToggleSelect: (key: string) => void;
  onRowClick: (item: PodSummary) => void;
  onLogsClick: (item: PodSummary) => void;
  onExecClick: (item: PodSummary) => void;
  onRestartClick: (item: PodSummary) => void;
  onDeleteClick: (item: PodSummary) => void;
  onFilterNode?: (nodeName: string) => void;
}

export function ResourceTableRow({
  item,
  isSelected,
  density = "comfortable",
  onToggleSelect,
  onRowClick,
  onLogsClick,
  onExecClick,
  onRestartClick,
  onDeleteClick,
  onFilterNode,
}: ResourceTableRowProps) {
  const itemKey = `${item.namespace}/${item.name}`;
  const [copiedName, setCopiedName] = React.useState(false);
  const [copiedIp, setCopiedIp] = React.useState(false);

  const handleCopyName = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.name);
    setCopiedName(true);
    toast.success(`Copied pod name: ${item.name}`);
    setTimeout(() => setCopiedName(false), 1500);
  };

  const handleCopyIp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.ip) return;
    navigator.clipboard.writeText(item.ip);
    setCopiedIp(true);
    toast.success(`Copied IP: ${item.ip}`);
    setTimeout(() => setCopiedIp(false), 1500);
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "Running":
        return (
          <StatusBeacon
            variant="healthy"
            label={status}
            size="xs"
            pulse={false}
          />
        );
      case "Pending":
      case "ContainerCreating":
        return (
          <StatusBeacon
            variant="pending"
            label={status}
            size="xs"
            pulse={true}
          />
        );
      case "Completed":
      case "Succeeded":
        return (
          <StatusBeacon
            variant="muted"
            label={status}
            size="xs"
            pulse={false}
          />
        );
      default:
        return (
          <StatusBeacon
            variant="critical"
            label={status}
            size="xs"
            pulse={true}
          />
        );
    }
  };

  const isCompact = density === "compact";

  return (
    <tr
      onClick={() => onRowClick(item)}
      className={cn(
        "hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group",
        isCompact ? "h-7 text-[11px]" : "h-9 text-xs",
        isSelected && "bg-[var(--accent)]/5 dark:bg-[var(--accent)]/10",
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

      {/* Name with Quick Copy */}
      <td className="py-1 px-3 font-medium font-mono text-[var(--foreground)] truncate max-w-[260px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate" title={item.name}>
            {item.name}
          </span>
          <button
            type="button"
            onClick={handleCopyName}
            className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
            title="Copy pod name"
          >
            {copiedName ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      </td>

      {/* Namespace */}
      <td className="py-1 px-3 font-mono text-[var(--muted)] truncate max-w-[130px]">
        {item.namespace}
      </td>

      {/* Status */}
      <td className="py-1 px-3">{renderStatus(item.status)}</td>

      {/* Ready */}
      <td className="py-1 px-3 font-mono text-[var(--foreground)]">
        {item.ready}
      </td>

      {/* Restarts */}
      <td className="py-1 px-3 font-mono text-[var(--muted)]">
        <span
          className={cn(item.restarts > 0 && "text-amber-500 font-semibold")}
        >
          {item.restarts}
        </span>
      </td>

      {/* Node (Clickable Filter Pill) */}
      <td className="py-1 px-3" onClick={(e) => e.stopPropagation()}>
        {item.nodeName ? (
          <button
            type="button"
            onClick={() => onFilterNode && onFilterNode(item.nodeName!)}
            title={`Filter pods on node '${item.nodeName}'`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 hover:bg-[var(--accent)]/15 hover:text-[var(--accent)] border border-[var(--border)] transition-colors cursor-pointer truncate max-w-[140px]"
          >
            <Server className="w-2.5 h-2.5 shrink-0 opacity-60" />
            <span className="truncate">{item.nodeName}</span>
          </button>
        ) : (
          <span className="text-[10px] text-[var(--muted)] font-mono italic">
            unassigned
          </span>
        )}
      </td>

      {/* IP with Click-to-Copy */}
      <td
        className="py-1 px-3 font-mono text-[var(--muted)] text-[11px]"
        onClick={(e) => e.stopPropagation()}
      >
        {item.ip ? (
          <button
            type="button"
            onClick={handleCopyIp}
            className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer group/ip"
            title="Click to copy IP"
          >
            <span>{item.ip}</span>
            {copiedIp ? (
              <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
            ) : (
              <Copy className="w-2.5 h-2.5 opacity-0 group-hover/ip:opacity-100 transition-opacity shrink-0" />
            )}
          </button>
        ) : (
          <span className="opacity-40">-</span>
        )}
      </td>

      {/* CPU */}
      <td className="py-1 px-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[var(--foreground)] text-[11px] w-9">
            {item.cpu}
          </span>
          {!isCompact && item.cpuPercent > 0 && (
            <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden w-10">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${item.cpuPercent}%` }}
              />
            </div>
          )}
        </div>
      </td>

      {/* Memory */}
      <td className="py-1 px-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[var(--foreground)] text-[11px] w-12">
            {item.memory}
          </span>
          {!isCompact && item.memoryPercent > 0 && (
            <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden w-10">
              <div
                className={cn(
                  "h-full rounded-full",
                  item.memoryPercent > 70
                    ? "bg-rose-500"
                    : "bg-cyan-500 dark:bg-cyan-400",
                )}
                style={{ width: `${item.memoryPercent}%` }}
              />
            </div>
          )}
        </div>
      </td>

      {/* Age */}
      <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.age}</td>

      {/* Action Buttons */}
      <td className="py-1 px-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
          {/* 1. View Logs */}
          <button
            onClick={() => onLogsClick(item)}
            className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="View Logs"
            aria-label={`View logs for ${item.name}`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* 2. Exec Shell */}
          <button
            onClick={() => onExecClick(item)}
            className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Exec Shell"
            aria-label={`Exec shell in ${item.name}`}
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>

          {/* 3. Restart */}
          <button
            onClick={() => onRestartClick(item)}
            className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Restart Pod"
            aria-label={`Restart ${item.name}`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* 4. Delete Pod */}
          <button
            onClick={() => onDeleteClick(item)}
            className="p-1 rounded hover:bg-rose-500/15 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
            title="Delete Pod"
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
