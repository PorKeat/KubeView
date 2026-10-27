"use client";

import * as React from "react";
import { CheckSquare, Square, Copy, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DeploymentSummary } from "@kubeview/contracts";
import { StatusBeacon, Tooltip } from "@/components/ui";
import {
  getDeploymentBeaconVariant,
  getDeploymentStatusPulse,
} from "../lib/deploymentStatus";
import { DeploymentRowActions } from "./DeploymentRowActions";
import { DeploymentRowDetails } from "./DeploymentRowDetails";

export interface DeploymentTableRowProps {
  item: DeploymentSummary;
  isSelected: boolean;
  density?: "comfortable" | "compact";
  onToggleSelect: (key: string) => void;
  onViewPods: (item: DeploymentSummary) => void;
  onRowClick?: (item: DeploymentSummary) => void;
}

export function DeploymentTableRow({
  item,
  isSelected,
  density = "comfortable",
  onToggleSelect,
  onViewPods,
  onRowClick,
}: DeploymentTableRowProps) {
  const itemKey = `${item.namespace}/${item.name}`;
  const [copiedName, setCopiedName] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleCopyName = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(item.name);
    setCopiedName(true);
    toast.success(`Copied deployment name: ${item.name}`);
    setTimeout(() => setCopiedName(false), 1500);
  };

  const desired = item.desiredReplicas ?? 0;
  const ready = item.readyReplicas ?? 0;
  const updated = item.updatedReplicas ?? 0;
  const available = item.availableReplicas ?? 0;
  const readyRatio = desired === 0 ? 1 : ready / desired;
  const readyTone =
    readyRatio >= 1
      ? "text-[var(--foreground)]"
      : readyRatio === 0
        ? "text-rose-500 font-semibold"
        : "text-amber-500 font-medium";

  const isCompact = density === "compact";

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
          "hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group",
          isCompact ? "h-7 text-[11px]" : "h-9 text-xs",
          isSelected && "bg-[var(--accent)]/5 dark:bg-[var(--accent)]/10",
          isExpanded && "bg-[var(--surface-hover)]/70",
        )}
      >
        <td
          className="px-2 text-center"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => onToggleSelect(itemKey)}
            className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
            aria-label={`Select deployment ${item.name}`}
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
              content={
                isExpanded
                  ? "Collapse rollout details"
                  : "Expand rollout details"
              }
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsExpanded((prev) => !prev);
                }}
                className="p-0.5 -ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
                aria-label={
                  isExpanded
                    ? "Collapse rollout details"
                    : "Expand rollout details"
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
            <Tooltip content={copiedName ? "Copied!" : "Copy deployment name"}>
              <button
                type="button"
                onClick={handleCopyName}
                className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                aria-label="Copy deployment name"
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
            variant={getDeploymentBeaconVariant(item)}
            label={item.status}
            size="xs"
            pulse={getDeploymentStatusPulse(item)}
          />
        </td>

        <td className="py-1 px-3 font-mono truncate">
          <span
            className={cn("tabular-nums text-xs", readyTone)}
            title={`${ready} of ${desired} replicas ready`}
          >
            {item.ready}
          </span>
        </td>

        <td className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate">
          <span
            className={cn(
              "tabular-nums",
              updated < desired ? "text-amber-500" : "opacity-80",
            )}
            title={`${updated} of ${desired} replicas updated`}
          >
            {updated}/{desired}
          </span>
        </td>

        <td className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate">
          <span
            className={cn(
              "tabular-nums",
              available < desired ? "text-amber-500" : "opacity-80",
            )}
            title={`${available} of ${desired} replicas available`}
          >
            {available}/{desired}
          </span>
        </td>

        <td className="py-1 px-3 truncate">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
            {item.strategy}
          </span>
        </td>

        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">
          {item.age}
        </td>

        <td
          className="py-1 px-2 text-right"
          onClick={(event) => event.stopPropagation()}
        >
          <DeploymentRowActions item={item} onViewPods={onViewPods} />
        </td>
      </tr>

      {isExpanded && (
        <DeploymentRowDetails item={item} onViewPods={onViewPods} />
      )}
    </React.Fragment>
  );
}
