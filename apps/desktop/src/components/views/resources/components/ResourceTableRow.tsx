"use client";

import * as React from "react";
import {
  CheckSquare,
  Square,
  Copy,
  Check,
  Server,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PodSummary } from "@kubeview/contracts";
import { Tooltip } from "@/components/ui";
import { PodStatusBeacon } from "./ResourceRowStatus";
import { ResourceRowActions } from "./ResourceRowActions";
import { ResourceRowDetails } from "./ResourceRowDetails";

export interface ResourceTableRowProps {
  item: PodSummary;
  isSelected: boolean;
  density?: "comfortable" | "compact";
  isFailingView?: boolean;
  isPendingView?: boolean;
  onToggleSelect: (key: string) => void;
  onRowClick: (item: PodSummary) => void;
  onLogsClick: (item: PodSummary, containerName?: string) => void;
  onExecClick: (item: PodSummary, containerName?: string) => void;
  onRestartClick: (item: PodSummary) => void;
  onDeleteClick: (item: PodSummary) => void;
  onFilterNode?: (nodeName: string) => void;
  onFilterLabel?: (label: string) => void;
}

export function ResourceTableRow({
  item,
  isSelected,
  density = "comfortable",
  isFailingView = false,
  isPendingView = false,
  onToggleSelect,
  onRowClick,
  onLogsClick,
  onExecClick,
  onRestartClick,
  onDeleteClick,
  onFilterNode,
  onFilterLabel,
}: ResourceTableRowProps) {
  const itemKey = `${item.namespace}/${item.name}`;
  const [copiedName, setCopiedName] = React.useState(false);
  const [copiedIp, setCopiedIp] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

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

  const isCompact = density === "compact";

  return (
    <React.Fragment>
      <tr
        onClick={() => onRowClick(item)}
        className={cn(
          "hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group",
          isCompact ? "h-7 text-[11px]" : "h-9 text-xs",
          isSelected && "bg-[var(--accent)]/5 dark:bg-[var(--accent)]/10",
          isExpanded && "bg-[var(--surface-hover)]/70",
        )}
      >
        <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
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

        {/* Name with Expand Chevron & Quick Copy */}
        <td className="py-1 px-3 font-medium font-mono text-[var(--foreground)] truncate">
          <div className="flex items-center gap-1 min-w-0">
            <Tooltip
              content={
                isExpanded
                  ? "Collapse containers"
                  : "Expand containers & sidecars"
              }
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded((prev) => !prev);
                }}
                className="p-0.5 -ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
                aria-label={
                  isExpanded
                    ? "Collapse containers"
                    : "Expand containers & sidecars"
                }
              >
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isExpanded && "rotate-90 text-[var(--accent)]",
                  )}
                />
              </button>
            </Tooltip>
            <span className="truncate" title={item.name}>
              {item.name}
            </span>
            <Tooltip content={copiedName ? "Copied!" : "Copy pod name"}>
              <button
                type="button"
                onClick={handleCopyName}
                className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                aria-label="Copy pod name"
              >
                {copiedName ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </Tooltip>
          </div>
        </td>

        {/* Namespace */}
        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">
          {item.namespace}
        </td>

        {/* Status */}
        <td className="py-1 px-3 truncate">
          <PodStatusBeacon pod={item} />
        </td>

        {/* Ready */}
        <td className="py-1 px-3 font-mono text-[var(--foreground)] truncate">
          {item.ready}
        </td>

        {/* Restarts */}
        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">
          <span
            className={cn(
              "tabular-nums text-xs",
              item.restarts === 0 && "opacity-40",
              item.restarts > 0 &&
                item.restarts < 10 &&
                "text-amber-500 font-medium",
              item.restarts >= 10 && "text-rose-500 font-semibold",
            )}
            title={
              item.restarts > 0
                ? `${item.restarts} container restart${item.restarts > 1 ? "s" : ""}`
                : "0 restarts"
            }
          >
            {item.restarts}
          </span>
        </td>

        {/* Node (Clickable Filter Pill) */}
        <td className="py-1 px-3 truncate" onClick={(e) => e.stopPropagation()}>
          {item.nodeName ? (
            <button
              type="button"
              onClick={() => onFilterNode && onFilterNode(item.nodeName!)}
              title={`Filter pods on node '${item.nodeName}'`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 hover:bg-[var(--accent)]/15 hover:text-[var(--accent)] border border-[var(--border)] transition-colors cursor-pointer truncate max-w-full"
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
          className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {item.ip ? (
            <button
              type="button"
              onClick={handleCopyIp}
              className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer group/ip truncate max-w-full"
              title="Click to copy IP"
            >
              <span className="truncate">{item.ip}</span>
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
        <td className="py-1 px-3 font-mono text-[var(--foreground)] text-[11px] truncate">
          <span
            className={cn(item.cpu === "-" && "opacity-40")}
            title={
              item.cpu !== "-"
                ? `CPU Request: ${item.cpu}`
                : "No CPU request specified"
            }
          >
            {item.cpu}
          </span>
        </td>

        {/* Memory */}
        <td className="py-1 px-3 font-mono text-[var(--foreground)] text-[11px] truncate">
          <span
            className={cn(item.memory === "-" && "opacity-40")}
            title={
              item.memory !== "-"
                ? `Memory Request: ${item.memory}`
                : "No memory request specified"
            }
          >
            {item.memory}
          </span>
        </td>

        {/* Age */}
        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">
          {item.age}
        </td>

        {/* Action Buttons: Clean '...' Dropdown */}
        <td
          className="py-1 px-2 text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <ResourceRowActions
            item={item}
            onLogsClick={onLogsClick}
            onExecClick={onExecClick}
            onRestartClick={onRestartClick}
            onDeleteClick={onDeleteClick}
          />
        </td>
      </tr>

      {/* Expanded Container and Sidecars Sub-row */}
      {isExpanded && (
        <ResourceRowDetails
          item={item}
          onLogsClick={onLogsClick}
          onExecClick={onExecClick}
          onFilterLabel={onFilterLabel}
        />
      )}
    </React.Fragment>
  );
}
