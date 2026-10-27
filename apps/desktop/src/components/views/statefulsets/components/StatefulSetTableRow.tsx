"use client";

import * as React from "react";
import {
  CheckSquare,
  Square,
  Check,
  ChevronRight,
  Copy,
  Database,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatefulSetSummary } from "@kubeview/contracts";
import { StatusBeacon, Tooltip } from "@/components/ui";
import {
  getStatefulSetBeaconVariant,
  getStatefulSetStatusPulse,
} from "../lib/statefulSetStatus";
import { useStatefulSetRowActions } from "./row/useStatefulSetRowActions";
import { StatefulSetActionMenu } from "./row/StatefulSetActionMenu";
import { StatefulSetExpandedRow } from "./row/StatefulSetExpandedRow";

export interface StatefulSetTableRowProps {
  item: StatefulSetSummary;
  isSelected: boolean;
  onToggleSelect: (key: string) => void;
  onViewPods: (statefulSet: StatefulSetSummary) => void;
  onRowClick?: (statefulSet: StatefulSetSummary) => void;
}

export function StatefulSetTableRow({
  item,
  isSelected,
  onToggleSelect,
  onViewPods,
  onRowClick,
}: StatefulSetTableRowProps) {
  const itemKey = `${item.namespace}/${item.name}`;
  const [isExpanded, setIsExpanded] = React.useState(false);

  const desired = item.desiredReplicas ?? 0;
  const current = item.currentReplicas ?? 0;
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

  const {
    copiedName,
    copiedCommand,
    showActionMenu,
    setShowActionMenu,
    showKubectlSubmenu,
    setShowKubectlSubmenu,
    openUpwards,
    actionMenuRef,
    actionButtonRef,
    handleToggleActionMenu,
    handleCopyName,
    handleScaleWorkload,
    handleRestartWorkload,
    handleDeleteWorkload,
    kubectlCommands,
    handleCopyKubectl,
  } = useStatefulSetRowActions(item, desired);

  const handleViewPodsFromMenu = () => {
    setShowActionMenu(false);
    onViewPods(item);
  };

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
            aria-label={`Select StatefulSet ${item.name}`}
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
            <Tooltip content={copiedName ? "Copied!" : "Copy statefulset name"}>
              <button
                type="button"
                onClick={handleCopyName}
                className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                aria-label="Copy statefulset name"
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
            variant={getStatefulSetBeaconVariant(item)}
            label={item.status}
            size="xs"
            pulse={getStatefulSetStatusPulse(item)}
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

        <td className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate">
          <span
            className={cn(
              "tabular-nums",
              updated < desired && "text-amber-500",
            )}
            title={`${updated} of ${desired} replicas updated`}
          >
            {updated}
          </span>
        </td>

        <td className="py-1 px-3 truncate">
          {item.serviceName ? (
            <span
              title={`Service: ${item.serviceName}`}
              className="inline-flex max-w-full min-w-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
            >
              <Database className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[130px]">{item.serviceName}</span>
            </span>
          ) : (
            <span className="text-[10px] text-[var(--muted)] font-mono italic">
              none
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
          <div
            className="relative inline-flex items-center justify-end"
            ref={actionMenuRef}
          >
            <Tooltip
              content="Actions menu"
              disabled={showActionMenu}
              side="left"
            >
              <button
                ref={actionButtonRef}
                type="button"
                onClick={handleToggleActionMenu}
                className={cn(
                  "p-1 rounded-md transition-colors cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]",
                  showActionMenu
                    ? "bg-[var(--surface-active)] text-[var(--foreground)] opacity-100"
                    : "hover:bg-black/10 dark:hover:bg-white/10 opacity-60 group-hover:opacity-100",
                )}
                aria-label={`Actions for ${item.name}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </Tooltip>

            <StatefulSetActionMenu
              open={showActionMenu}
              item={item}
              openUpwards={openUpwards}
              showKubectlSubmenu={showKubectlSubmenu}
              onToggleKubectlSubmenu={() =>
                setShowKubectlSubmenu((value) => !value)
              }
              copiedCommand={copiedCommand}
              onCopyKubectl={handleCopyKubectl}
              kubectlCommands={kubectlCommands}
              onViewPods={handleViewPodsFromMenu}
              onScale={handleScaleWorkload}
              onRestart={handleRestartWorkload}
              onDelete={handleDeleteWorkload}
            />
          </div>
        </td>
      </tr>

      {isExpanded && (
        <StatefulSetExpandedRow
          item={item}
          desired={desired}
          current={current}
          ready={ready}
          updated={updated}
          available={available}
          onViewPods={() => onViewPods(item)}
        />
      )}
    </React.Fragment>
  );
}
