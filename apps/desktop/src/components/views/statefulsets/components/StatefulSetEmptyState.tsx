"use client";

import { RefreshCw, Globe } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { StatefulSetStatusFilter } from "../lib/statefulSetStatus";

export interface StatefulSetEmptyStateProps {
  statusFilter: StatefulSetStatusFilter;
  search: string;
  isFiltered: boolean;
  currentNamespace: string;
  scopedStatefulSetCount: number;
  statefulSetCount: number;
  namespaceCounts: Record<string, number>;
  onClearFilters: () => void;
  onSelectNamespace: (namespace: string) => void;
  onReload: () => void;
}

export function StatefulSetEmptyState({
  statusFilter,
  search,
  isFiltered,
  currentNamespace,
  scopedStatefulSetCount,
  statefulSetCount,
  namespaceCounts,
  onClearFilters,
  onSelectNamespace,
  onReload,
}: StatefulSetEmptyStateProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
      <EmptyState
        variant={
          (statusFilter === "degraded" ||
            statusFilter === "progressing" ||
            statusFilter === "scaleddown") &&
          !search
            ? "healthy"
            : isFiltered
              ? "search"
              : "empty"
        }
        title={
          statusFilter === "degraded" && !search
            ? "All StatefulSets Healthy"
            : statusFilter === "progressing" && !search
              ? "All StatefulSets Settled"
              : statusFilter === "scaleddown" && !search
                ? "No Scaled Down StatefulSets"
                : isFiltered
                  ? `No statefulsets match filter "${search || statusFilter}"`
                  : currentNamespace !== "all"
                    ? `No statefulsets in "${currentNamespace}"`
                    : "No StatefulSets Found"
        }
        description={
          statusFilter === "degraded" && !search
            ? `All ${scopedStatefulSetCount} statefulsets in ${
                currentNamespace === "all"
                  ? "all cluster namespaces"
                  : `namespace "${currentNamespace}"`
              } report ready replicas.`
            : statusFilter === "progressing" && !search
              ? `Zero active StatefulSet transitions. All ${scopedStatefulSetCount} statefulsets in ${
                  currentNamespace === "all"
                    ? "all cluster namespaces"
                    : `namespace "${currentNamespace}"`
                } have converged on their desired revision.`
              : isFiltered
                ? `0 of ${scopedStatefulSetCount} statefulsets in ${
                    currentNamespace === "all"
                      ? "all namespaces"
                      : `namespace "${currentNamespace}"`
                  } match your active search or status criteria.`
                : currentNamespace !== "all"
                  ? `Namespace "${currentNamespace}" currently holds zero statefulsets. ${statefulSetCount} statefulsets are active in other namespaces.`
                  : "No StatefulSets are present in the connected cluster. StatefulSets provide stable pod identity and persistent storage for stateful applications."
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
            ? `kubectl get statefulsets -n ${
                currentNamespace === "all" ? "default" : currentNamespace
              }`
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
                  label: `View All Namespaces (${statefulSetCount})`,
                  icon: <Globe className="w-3.5 h-3.5" />,
                  onClick: () => onSelectNamespace("all"),
                }
              : {
                  label: "Reload StatefulSets",
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
                  label: "Reload StatefulSets",
                  icon: <RefreshCw className="w-3.5 h-3.5" />,
                  onClick: onReload,
                }
              : undefined
        }
      />
    </div>
  );
}
