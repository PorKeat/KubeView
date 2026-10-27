"use client";

import { RefreshCw, Globe } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { DeploymentStatusFilter } from "../lib/deploymentStatus";

export interface DeploymentEmptyStateProps {
  statusFilter: DeploymentStatusFilter;
  search: string;
  isFiltered: boolean;
  currentNamespace: string;
  scopedDeploymentCount: number;
  deploymentCount: number;
  namespaceCounts: Record<string, number>;
  onClearFilters: () => void;
  onSelectNamespace: (namespace: string) => void;
  onReload: () => void;
}

export function DeploymentEmptyState({
  statusFilter,
  search,
  isFiltered,
  currentNamespace,
  scopedDeploymentCount,
  deploymentCount,
  namespaceCounts,
  onClearFilters,
  onSelectNamespace,
  onReload,
}: DeploymentEmptyStateProps) {
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
            ? "All Deployments Healthy"
            : statusFilter === "progressing" && !search
              ? "All Rollouts Complete"
              : statusFilter === "paused" && !search
                ? "No Paused Deployments"
                : isFiltered
                  ? `No deployments match filter "${search || statusFilter}"`
                  : currentNamespace !== "all"
                    ? `No deployments in "${currentNamespace}"`
                    : "No Deployments Found"
        }
        description={
          statusFilter === "degraded" && !search
            ? `All ${scopedDeploymentCount} deployments in ${
                currentNamespace === "all"
                  ? "all cluster namespaces"
                  : `namespace "${currentNamespace}"`
              } have satisfied their availability conditions.`
            : statusFilter === "progressing" && !search
              ? `Zero active rollouts. All ${scopedDeploymentCount} deployments in ${
                  currentNamespace === "all"
                    ? "all cluster namespaces"
                    : `namespace "${currentNamespace}"`
                } have converged on their desired replica count.`
              : isFiltered
                ? `0 of ${scopedDeploymentCount} deployments in ${
                    currentNamespace === "all"
                      ? "all namespaces"
                      : `namespace "${currentNamespace}"`
                  } match your active search or rollout status criteria.`
                : currentNamespace !== "all"
                  ? `Namespace "${currentNamespace}" currently holds zero deployments. ${deploymentCount} deployments are active in other namespaces.`
                  : "No deployments are present in the connected cluster. Create one to begin tracking rollout health."
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
                  label: `View All Namespaces (${deploymentCount})`,
                  icon: <Globe className="w-3.5 h-3.5" />,
                  onClick: () => onSelectNamespace("all"),
                }
              : {
                  label: "Reload Deployments",
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
                  label: "Reload Deployments",
                  icon: <RefreshCw className="w-3.5 h-3.5" />,
                  onClick: onReload,
                }
              : undefined
        }
      />
    </div>
  );
}
