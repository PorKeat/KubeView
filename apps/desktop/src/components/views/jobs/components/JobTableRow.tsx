"use client";

import * as React from "react";
import { CheckSquare, Square, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobSummary } from "@kubeview/contracts";
import { StatusBeacon, Tooltip } from "@/components/ui";
import { getJobBeaconVariant, getJobStatusPulse } from "../lib/jobStatus";
import { JobRowActions } from "./JobRowActions";
import { JobRowDetails } from "./JobRowDetails";

export interface JobTableRowProps {
  item: JobSummary;
  isSelected: boolean;
  onToggleSelect: (key: string) => void;
  onViewPods: (job: JobSummary) => void;
  onRowClick?: (job: JobSummary) => void;
}

export function JobTableRow({
  item,
  isSelected,
  onToggleSelect,
  onViewPods,
  onRowClick,
}: JobTableRowProps) {
  const itemKey = `${item.namespace}/${item.name}`;
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <React.Fragment>
      <tr
        onClick={() =>
          onRowClick ? onRowClick(item) : setIsExpanded((prev) => !prev)
        }
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
            aria-label={`Select Job ${item.name}`}
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
          </div>
        </td>
        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">
          {item.namespace}
        </td>
        <td className="py-1 px-3 truncate">
          <StatusBeacon
            variant={getJobBeaconVariant(item)}
            label={item.status}
            size="xs"
            pulse={getJobStatusPulse(item)}
          />
        </td>
        <td className="py-1 px-3 font-mono text-[var(--foreground)] text-[11px] truncate">
          <span
            className="tabular-nums"
            title={`${item.succeeded} of ${item.desiredCompletions} completions`}
          >
            {item.completions}
          </span>
        </td>
        <td className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate">
          {item.duration || "-"}
        </td>
        <td className="py-1 px-3 truncate">
          {item.ownerCronJob ? (
            <span
              title={`CronJob: ${item.ownerCronJob}`}
              className="inline-flex max-w-full min-w-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            >
              <Clock className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[140px]">
                {item.ownerCronJob}
              </span>
            </span>
          ) : (
            <span className="text-[10px] text-[var(--muted)] font-mono italic">
              manual
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
          <JobRowActions item={item} onViewPods={onViewPods} />
        </td>
      </tr>

      {isExpanded && <JobRowDetails item={item} onViewPods={onViewPods} />}
    </React.Fragment>
  );
}
