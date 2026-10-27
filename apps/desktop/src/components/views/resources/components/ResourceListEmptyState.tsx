"use client";

import { Globe, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { PodSummary } from "@kubeview/contracts";

export interface ResourceListEmptyStateProps {
  resourceType: string;
  statusFilter: string;
  search: string;
  podNodeFilter: string | null;
  podLabelFilter: string | null;
  podLabelFilterSource: string | null;
  currentNamespace: string;
  pods: PodSummary[];
  namespaceCounts: Record<string, number>;
  totalPodsCount: number;
  setCurrentNamespace: (namespace: string) => void;
  setPodNodeFilter: (node: string | null) => void;
  setPodLabelFilter: (label: string | null, source?: string | null) => void;
  setStatusFilter: (status: string) => void;
  setSearch: (value: string) => void;
  loadPods: () => void;
}

export function ResourceListEmptyState({
  resourceType,
  statusFilter,
  search,
  podNodeFilter,
  podLabelFilter,
  podLabelFilterSource,
  currentNamespace,
  pods,
  namespaceCounts,
  totalPodsCount,
  setCurrentNamespace,
  setPodNodeFilter,
  setPodLabelFilter,
  setStatusFilter,
  setSearch,
  loadPods,
}: ResourceListEmptyStateProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
      <EmptyState
        variant={
          (statusFilter === "failing" || statusFilter === "pending") && !search
            ? "healthy"
            : podNodeFilter
              ? "empty"
              : podLabelFilter || search || statusFilter !== "all"
                ? "search"
                : "empty"
        }
        title={
          statusFilter === "failing" && !search
            ? "All Workloads Healthy"
            : statusFilter === "pending" && !search
              ? "All Workloads Scheduled"
              : podNodeFilter
                ? `No pods running on node "${podNodeFilter}"`
                : podLabelFilter
                  ? `No ${resourceType.toLowerCase()} match ${
                      podLabelFilterSource ?? "label filter"
                    }`
                  : search || statusFilter !== "all"
                    ? `No ${resourceType.toLowerCase()} match filter "${search || statusFilter}"`
                    : `No ${resourceType.toLowerCase()} scheduled in "${currentNamespace}"`
        }
        description={
          statusFilter === "failing" && !search
            ? `All ${
                currentNamespace === "all"
                  ? pods.length
                  : namespaceCounts[currentNamespace] || 0
              } workloads in ${
                currentNamespace === "all"
                  ? "all cluster namespaces"
                  : `namespace "${currentNamespace}"`
              } are healthy with ready containers and zero active failures.`
            : statusFilter === "pending" && !search
              ? `Zero pending workloads. All ${
                  currentNamespace === "all"
                    ? pods.length
                    : namespaceCounts[currentNamespace] || 0
                } pods in ${
                  currentNamespace === "all"
                    ? "all cluster namespaces"
                    : `namespace "${currentNamespace}"`
                } have completed scheduling and initialization.`
              : podNodeFilter
                ? `Host "${podNodeFilter}" currently has zero running workloads matching your active criteria.`
                : podLabelFilter
                  ? `0 of ${
                      currentNamespace === "all"
                        ? pods.length
                        : namespaceCounts[currentNamespace] || 0
                    } ${resourceType.toLowerCase()} in ${
                      currentNamespace === "all"
                        ? "all namespaces"
                        : `namespace "${currentNamespace}"`
                    } match ${podLabelFilterSource ?? "the selected label filter"}.`
                  : search || statusFilter !== "all"
                    ? `0 of ${
                        currentNamespace === "all"
                          ? pods.length
                          : namespaceCounts[currentNamespace] || 0
                      } ${resourceType.toLowerCase()} in ${
                        currentNamespace === "all"
                          ? "all namespaces"
                          : `namespace "${currentNamespace}"`
                      } match your active search or status criteria.`
                    : `Namespace "${currentNamespace}" currently holds zero active workloads. ${pods.length} pods are active in other namespaces.`
        }
        scopeBadge={
          podNodeFilter
            ? `Node: ${podNodeFilter}`
            : podLabelFilter
              ? (podLabelFilterSource ?? `Label: ${podLabelFilter}`)
              : search || statusFilter !== "all"
                ? search
                  ? `Query: "${search}"`
                  : `Status: ${statusFilter}`
                : `Namespace: ${currentNamespace}`
        }
        codeSnippet={
          !search && statusFilter === "all" && !podNodeFilter && !podLabelFilter
            ? `kubectl run demo-app --image=nginx --namespace=${
                currentNamespace === "all" ? "default" : currentNamespace
              }`
            : undefined
        }
        suggestions={
          !search &&
          statusFilter === "all" &&
          !podNodeFilter &&
          !podLabelFilter &&
          currentNamespace !== "all"
            ? Object.entries(namespaceCounts)
                .filter(([ns]) => ns !== currentNamespace && ns !== "all")
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([ns, count]) => ({
                  label: `${ns} (${count})`,
                  onClick: () => {
                    setCurrentNamespace(ns);
                  },
                }))
            : undefined
        }
        action={
          podNodeFilter
            ? {
                label: "Clear Node Filter",
                icon: <RefreshCw className="w-3.5 h-3.5" />,
                onClick: () => setPodNodeFilter(null),
              }
            : podLabelFilter
              ? {
                  label: podLabelFilterSource
                    ? `Clear ${podLabelFilterSource.split(":")[0]} Filter`
                    : "Clear Label Filter",
                  icon: <RefreshCw className="w-3.5 h-3.5" />,
                  onClick: () => setPodLabelFilter(null, null),
                }
              : (statusFilter === "failing" || statusFilter === "pending") &&
                  !search
                ? {
                    label: "View All Workloads",
                    icon: <RefreshCw className="w-3.5 h-3.5" />,
                    onClick: () => setStatusFilter("all"),
                  }
                : search || statusFilter !== "all"
                  ? {
                      label: "Clear Filters",
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      onClick: () => {
                        setSearch("");
                        setStatusFilter("all");
                      },
                    }
                  : {
                      label: `View All Namespaces (${pods.length})`,
                      icon: <Globe className="w-3.5 h-3.5" />,
                      onClick: () => {
                        setCurrentNamespace("all");
                      },
                    }
        }
        secondaryAction={
          podNodeFilter
            ? currentNamespace !== "all"
              ? {
                  label: `Search All Namespaces (${pods.length || totalPodsCount})`,
                  icon: <Globe className="w-3.5 h-3.5" />,
                  onClick: () => {
                    setCurrentNamespace("all");
                  },
                }
              : {
                  label: "Reload Pods",
                  icon: <RefreshCw className="w-3.5 h-3.5" />,
                  onClick: () => {
                    loadPods();
                  },
                }
            : !search && statusFilter === "all" && currentNamespace !== "all"
              ? {
                  label: "Search All Namespaces",
                  icon: <Globe className="w-3.5 h-3.5" />,
                  onClick: () => {
                    setCurrentNamespace("all");
                  },
                }
              : currentNamespace !== "all" && (search || statusFilter !== "all")
                ? {
                    label: "Search All Namespaces",
                    icon: <Globe className="w-3.5 h-3.5" />,
                    onClick: () => {
                      setCurrentNamespace("all");
                    },
                  }
                : undefined
        }
      />
    </div>
  );
}
