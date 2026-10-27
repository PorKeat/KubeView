"use client";

import { RefreshCw, Globe } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { ReplicaSetStatusFilter } from "../lib/replicaSetStatus";

export interface ReplicaSetEmptyStateProps {
  statusFilter: ReplicaSetStatusFilter;
  search: string;
  isFiltered: boolean;
  currentNamespace: string;
  scopedReplicaSetCount: number;
  replicaSetCount: number;
  namespaceCounts: Record<string, number>;
  onClearFilters: () => void;
  onSelectNamespace: (namespace: string) => void;
  onReload: () => void;
}

export function ReplicaSetEmptyState({
  statusFilter,
  search,
  isFiltered,
  currentNamespace,
  scopedReplicaSetCount,
  replicaSetCount,
  namespaceCounts,
  onClearFilters,
  onSelectNamespace,
  onReload,
}: ReplicaSetEmptyStateProps) {
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
            ? "All ReplicaSets Healthy"
            : statusFilter === "progressing" && !search
              ? "All ReplicaSets Settled"
              : statusFilter === "scaleddown" && !search
                ? "No Scaled Down ReplicaSets"
                : isFiltered
                  ? `No replicasets match filter "${search || statusFilter}"`
                  : currentNamespace !== "all"
                    ? `No replicasets in "${currentNamespace}"`
                    : "No ReplicaSets Found"
        }
        description={
          statusFilter === "degraded" && !search
            ? `All ${scopedReplicaSetCount} replicasets in ${
                currentNamespace === "all"
                  ? "all cluster namespaces"
                  : `namespace "${currentNamespace}"`
              } report ready replicas and no replica failures.`
            : statusFilter === "progressing" && !search
              ? `Zero active replica transitions. All ${scopedReplicaSetCount} replicasets in ${
                  currentNamespace === "all"
                    ? "all cluster namespaces"
                    : `namespace "${currentNamespace}"`
                } have converged on their desired replica count.`
              : isFiltered
                ? `0 of ${scopedReplicaSetCount} replicasets in ${
                    currentNamespace === "all"
                      ? "all namespaces"
                      : `namespace "${currentNamespace}"`
                  } match your active search or status criteria.`
                : currentNamespace !== "all"
                  ? `Namespace "${currentNamespace}" currently holds zero replicasets. ${replicaSetCount} replicasets are active in other namespaces.`
                  : "No ReplicaSets are present in the connected cluster. ReplicaSets are created automatically by Deployments."
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
            ? `kubectl create deployment demo-app --image=nginx --replicas=2 -n ${
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
                  label: `View All Namespaces (${replicaSetCount})`,
                  icon: <Globe className="w-3.5 h-3.5" />,
                  onClick: () => onSelectNamespace("all"),
                }
              : {
                  label: "Reload ReplicaSets",
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
                  label: "Reload ReplicaSets",
                  icon: <RefreshCw className="w-3.5 h-3.5" />,
                  onClick: onReload,
                }
              : undefined
        }
      />
    </div>
  );
}
