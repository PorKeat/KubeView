"use client";

import { Cpu, MemoryStick, type LucideIcon } from "lucide-react";
import type { PodSummary } from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import { cn } from "@/lib/utils";
import {
  formatBytesCompact,
  formatMillicores,
  usageBarClass,
  usagePercent,
  usageToneClass,
} from "@/lib/format";

export interface PodUsageCardProps {
  podData: PodSummary | undefined;
  namespace: string;
  podName: string;
}

interface UsageRowProps {
  label: string;
  icon: LucideIcon;
  usage?: number;
  request?: number;
  limit?: number;
  format: (value?: number) => string;
}

function UsageRow({
  label,
  icon: Icon,
  usage,
  request,
  limit,
  format,
}: UsageRowProps) {
  const limitPercent = usagePercent(usage, limit);
  const requestPercent = usagePercent(usage, request);
  const barPercent = limitPercent ?? requestPercent;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
          <Icon className="h-3 w-3" aria-hidden="true" />
          {label}
        </span>
        <span className="font-mono text-[10px] text-[var(--muted)]">
          {limitPercent !== undefined
            ? `${limitPercent}% of limit`
            : requestPercent !== undefined
              ? `${requestPercent}% of request`
              : "no request / limit"}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2 font-mono">
        <span
          className={cn("text-sm font-semibold", usageToneClass(limitPercent))}
        >
          {format(usage)}
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          {limit !== undefined && limit > 0
            ? `${format(limit)} limit`
            : request !== undefined && request > 0
              ? `${format(request)} request`
              : "no request / limit"}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-active)]">
        <span
          className={cn("block h-full rounded-full", usageBarClass(barPercent))}
          style={{ width: `${Math.min(100, Math.max(0, barPercent ?? 0))}%` }}
        />
      </div>
    </div>
  );
}

export function PodUsageCard({
  podData,
  namespace,
  podName,
}: PodUsageCardProps) {
  const usage = useClusterStore(
    (state) => state.podUsage[`${namespace}/${podName}`],
  );
  const usageAvailable = useClusterStore((state) => state.podUsageAvailable);
  const usageReason = useClusterStore((state) => state.podUsageReason);
  const usageLoading = useClusterStore((state) => state.isPodUsageLoading);

  if (!podData) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-[var(--foreground)]">
          Live resource usage
        </span>
        <span className="font-mono text-[10px] text-[var(--muted)]">
          {usage
            ? "Metrics Server"
            : usageLoading
              ? "loading..."
              : "metrics unavailable"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <UsageRow
          label="CPU"
          icon={Cpu}
          usage={usage?.cpuUsageMillicores}
          request={podData.cpuRequestMillicores}
          limit={podData.cpuLimitMillicores}
          format={formatMillicores}
        />
        <UsageRow
          label="Memory"
          icon={MemoryStick}
          usage={usage?.memoryUsageBytes}
          request={podData.memoryRequestBytes}
          limit={podData.memoryLimitBytes}
          format={formatBytesCompact}
        />
      </div>

      {!usage && (
        <p className="mt-3 border-t border-[var(--border)]/60 pt-2 text-[10px] leading-relaxed text-[var(--muted)]">
          {usageLoading
            ? "Loading live usage from Metrics Server..."
            : usageAvailable
              ? "Metrics Server has not reported this pod yet. Requests and limits are still shown above."
              : usageReason ||
                "Metrics Server is not available for this cluster, so live usage cannot be shown."}
        </p>
      )}
    </div>
  );
}
