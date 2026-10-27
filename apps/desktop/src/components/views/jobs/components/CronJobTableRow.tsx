"use client";

import * as React from "react";
import { ChevronRight, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CronJobSummary } from "@kubeview/contracts";
import { StatusBeacon, Tooltip } from "@/components/ui";
import {
  getCronJobBeaconVariant,
  getCronJobStatusPulse,
} from "../lib/cronJobStatus";
import { CronJobRowActions } from "./CronJobRowActions";
import { CronJobRowDetails } from "./CronJobRowDetails";

export interface CronJobTableRowProps {
  item: CronJobSummary;
  onViewJobs: (cronJob: CronJobSummary) => void;
  onRowClick?: (cronJob: CronJobSummary) => void;
}

export function CronJobTableRow({
  item,
  onViewJobs,
  onRowClick,
}: CronJobTableRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <React.Fragment>
      <tr
        onClick={() =>
          onRowClick ? onRowClick(item) : setIsExpanded((prev) => !prev)
        }
        className={cn(
          "hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group h-9 text-xs",
          isExpanded && "bg-[var(--surface-hover)]/70",
        )}
      >
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
            variant={getCronJobBeaconVariant(item)}
            label={item.status}
            size="xs"
            pulse={getCronJobStatusPulse(item)}
          />
        </td>
        <td className="py-1 px-3 font-mono text-[var(--foreground)] text-[11px] truncate">
          <span
            className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]"
            title={item.schedule}
          >
            {item.schedule}
          </span>
        </td>
        <td className="py-1 px-3 truncate">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border",
              item.suspend
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            )}
          >
            <Pause className={cn("w-2.5 h-2.5", !item.suspend && "hidden")} />
            {item.suspend ? "Yes" : "No"}
          </span>
        </td>
        <td className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate">
          <span
            className={cn(
              "tabular-nums",
              item.activeJobs > 0 && "text-emerald-600 dark:text-emerald-400",
            )}
            title={`${item.activeJobs} active jobs`}
          >
            {item.activeJobs}
          </span>
        </td>
        <td
          className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate"
          title={item.lastScheduleTime || "Never scheduled"}
        >
          {item.lastScheduleTime
            ? new Date(item.lastScheduleTime).toLocaleString()
            : "-"}
        </td>
        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">
          {item.age}
        </td>
        <td
          className="py-1 px-2 text-right"
          onClick={(event) => event.stopPropagation()}
        >
          <CronJobRowActions item={item} onViewJobs={onViewJobs} />
        </td>
      </tr>

      {isExpanded && <CronJobRowDetails item={item} onViewJobs={onViewJobs} />}
    </React.Fragment>
  );
}
