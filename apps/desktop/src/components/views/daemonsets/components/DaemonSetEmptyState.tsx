"use client";

import { RefreshCw, Globe } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { DaemonSetStatusFilter } from "../lib/daemonSetStatus";

export interface DaemonSetEmptyStateProps {
  statusFilter: DaemonSetStatusFilter;
  search: string;
  isFiltered: boolean;
  currentNamespace: string;
  scopedDaemonSetCount: number;
  daemonSetCount: number;
  namespaceCounts: Record<string, number>;
  onClearFilters: () => void;
  onSelectNamespace: (namespace: string) => void;
  onReload: () => void;
}

export function DaemonSetEmptyState({
  statusFilter,
  search,
  isFiltered,
  currentNamespace,
  scopedDaemonSetCount,
  daemonSetCount,
  namespaceCounts,
  onClearFilters,
  onSelectNamespace,
  onReload,
}: DaemonSetEmptyStateProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
      <EmptyState
        variant={
          (statusFilter === "degraded" || statusFilter === "progressing") &&
          !search
            ? "healthy"
            : isFiltered
              ? "search"
              : "empty"
        }
        title={
          statusFilter === "degraded" && !search
            ? "All DaemonSets Healthy"
            : statusFilter === "progressing" && !search
              ? "All DaemonSets Settled"
              : isFiltered
                ? `No daemonsets match filter "${search || statusFilter}"`
                : currentNamespace !== "all"
                  ? `No daemonsets in "${currentNamespace}"`
                  : "No DaemonSets Found"
        }
        description={
          statusFilter === "degraded" && !search
            ? `All ${scopedDaemonSetCount} daemonsets in ${currentNamespace === "all" ? "all cluster namespaces" : `namespace "${currentNamespace}"`} have ready daemon pods.`
            : statusFilter === "progressing" && !search
              ? `Zero active DaemonSet transitions. All ${scopedDaemonSetCount} daemonsets in ${currentNamespace === "all" ? "all cluster namespaces" : `namespace "${currentNamespace}"`} are on their desired revision.`
              : isFiltered
                ? `0 of ${scopedDaemonSetCount} daemonsets in ${currentNamespace === "all" ? "all namespaces" : `namespace "${currentNamespace}"`} match your active search or status criteria.`
                : currentNamespace !== "all"
                  ? `Namespace "${currentNamespace}" currently holds zero daemonsets. ${daemonSetCount} daemonsets are active in other namespaces.`
                  : "No DaemonSets are present in the connected cluster. DaemonSets run one pod on every matching node."
        }
        scopeBadge={
          isFiltered
            ? search
              ? `Query: "${search}"`
              : `Status: ${statusFilter}`
            : `Namespace: ${currentNamespace}`
        }
        codeSnippet={
          !isFiltered
            ? `kubectl get daemonsets -n ${currentNamespace === "all" ? "default" : currentNamespace}`
            : undefined
        }
        suggestions={
          !isFiltered && currentNamespace !== "all"
            ? Object.entries(namespaceCounts)
                .filter(([ns]) => ns !== currentNamespace && ns !== "all")
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([ns, count]) => ({
                  label: `${ns} (${count})`,
                  onClick: () => onSelectNamespace(ns),
                }))
            : undefined
        }
        action={
          isFiltered
            ? {
                label: "Clear Filters",
                icon: <RefreshCw className="w-3.5 h-3.5" />,
                onClick: onClearFilters,
              }
            : currentNamespace !== "all"
              ? {
                  label: `View All Namespaces (${daemonSetCount})`,
                  icon: <Globe className="w-3.5 h-3.5" />,
                  onClick: () => onSelectNamespace("all"),
                }
              : {
                  label: "Reload DaemonSets",
                  icon: <RefreshCw className="w-3.5 h-3.5" />,
                  onClick: onReload,
                }
        }
        secondaryAction={
          currentNamespace !== "all" && isFiltered
            ? {
                label: "Search All Namespaces",
                icon: <Globe className="w-3.5 h-3.5" />,
                onClick: () => onSelectNamespace("all"),
              }
            : !isFiltered && currentNamespace !== "all"
              ? {
                  label: "Reload DaemonSets",
                  icon: <RefreshCw className="w-3.5 h-3.5" />,
                  onClick: onReload,
                }
              : undefined
        }
      />
    </div>
  );
}
