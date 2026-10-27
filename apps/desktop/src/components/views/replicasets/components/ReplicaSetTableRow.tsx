"use client";

import * as React from "react";
import {
  CheckSquare,
  Square,
  Copy,
  Check,
  ChevronRight,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ReplicaSetSummary } from "@kubeview/contracts";
import { StatusBeacon, Tooltip } from "@/components/ui";
import {
  getReplicaSetBeaconVariant,
  getReplicaSetStatusPulse,
} from "../lib/replicaSetStatus";
import { ReplicaSetRowActions } from "./ReplicaSetRowActions";
import { ReplicaSetRowDetails } from "./ReplicaSetRowDetails";

export interface ReplicaSetTableRowProps {
  item: ReplicaSetSummary;
  isSelected: boolean;
  onToggleSelect: (key: string) => void;
  onViewPods: (replicaSet: ReplicaSetSummary) => void;
  onRowClick?: (replicaSet: ReplicaSetSummary) => void;
}

export function ReplicaSetTableRow({
  item,
  isSelected,
  onToggleSelect,
  onViewPods,
  onRowClick,
}: ReplicaSetTableRowProps) {
  const itemKey = `${item.namespace}/${item.name}`;
  const [copiedName, setCopiedName] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleCopyName = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(item.name);
    setCopiedName(true);
    toast.success(`Copied replicaset name: ${item.name}`);
    setTimeout(() => setCopiedName(false), 1500);
  };

  const desired = item.desiredReplicas ?? 0;
  const current = item.currentReplicas ?? 0;
  const ready = item.readyReplicas ?? 0;
  const readyRatio = desired === 0 ? 1 : ready / desired;
  const readyTone =
    readyRatio >= 1
      ? "text-[var(--foreground)]"
      : readyRatio === 0
        ? "text-rose-500 font-semibold"
        : "text-amber-500 font-medium";

  return (
    <React.Fragment>
      <tr
        onClick={() => {
          if (onRowClick) {
            onRowClick(item);
          } else {
            setIsExpanded((prev) => !prev);
          }
        }}
        className={cn(
          "hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group h-9 text-xs",
          isSelected && "bg-[var(--accent)]/5 dark:bg-[var(--accent)]/10",
          isExpanded && "bg-[var(--surface-hover)]/70",
        )}
      >
        <td
          className="px-2 text-center"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onToggleSelect(itemKey)}
            className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
            aria-label={`Select ReplicaSet ${item.name}`}
          >
            {isSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
            ) : (
              <Square className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            )}
          </button>
        </td>
        <td className="py-1 px-3 font-medium font-mono text-[var(--foreground)] truncate">
          <div className="flex items-center gap-1 min-w-0">
            <Tooltip
              content={isExpanded ? "Collapse details" : "Expand details"}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsExpanded((prev) => !prev);
                }}
                className="p-0.5 -ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
                aria-label={isExpanded ? "Collapse details" : "Expand details"}
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
            <Tooltip content={copiedName ? "Copied!" : "Copy replicaset name"}>
              <button
                type="button"
                onClick={handleCopyName}
                className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                aria-label="Copy replicaset name"
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

        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">
          {item.namespace}
        </td>

        <td className="py-1 px-3 truncate">
          <StatusBeacon
            variant={getReplicaSetBeaconVariant(item)}
            label={item.status}
            size="xs"
            pulse={getReplicaSetStatusPulse(item)}
          />
        </td>

        <td className="py-1 px-3 font-mono text-[var(--foreground)] text-[11px] truncate">
          <span className="tabular-nums" title={`${desired} desired replicas`}>
            {desired}
          </span>
        </td>

        <td className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate">
          <span
            className={cn(
              "tabular-nums",
              current !== desired && "text-amber-500",
            )}
            title={`${current} current replicas`}
          >
            {current}
          </span>
        </td>

        <td className="py-1 px-3 font-mono text-[11px] truncate">
          <span
            className={cn("tabular-nums text-xs", readyTone)}
            title={`${ready} of ${desired} replicas ready`}
          >
            {ready}
          </span>
        </td>

        <td className="py-1 px-3 truncate">
          {item.ownerDeployment ? (
            <span
              title={item.ownerDeployment}
              className="inline-flex max-w-full min-w-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
            >
              <Layers className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[120px]">
                {item.ownerDeployment}
              </span>
            </span>
          ) : (
            <span className="text-[10px] text-[var(--muted)] font-mono italic">
              standalone
            </span>
          )}
        </td>

        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">
          {item.age}
        </td>

        <td
          className="py-1 px-2 text-right"
          onClick={(event) => event.stopPropagation()}
        >
          <ReplicaSetRowActions item={item} onViewPods={onViewPods} />
        </td>
      </tr>

      {isExpanded && (
        <ReplicaSetRowDetails item={item} onViewPods={onViewPods} />
      )}
    </React.Fragment>
  );
}
