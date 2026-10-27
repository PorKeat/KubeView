"use client";

import { Globe, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui";

export interface NetworkingEmptyStateProps {
  nounPlural: string;
  isFiltered: boolean;
  search: string;
  setSearch: (value: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  currentNamespace: string;
  itemsLength: number;
  emptyDescription?: string;
  scopedCount: number;
  namespaceCounts: Record<string, number>;
  setCurrentNamespace: (namespace: string) => void;
  onRefresh: () => void;
  codeCommand?: (namespace: string) => string;
}

export function NetworkingEmptyState({
  nounPlural,
  isFiltered,
  search,
  setSearch,
  activeFilter,
  setActiveFilter,
  currentNamespace,
  itemsLength,
  emptyDescription,
  scopedCount,
  namespaceCounts,
  setCurrentNamespace,
  onRefresh,
  codeCommand,
}: NetworkingEmptyStateProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
      <EmptyState
        variant={isFiltered ? "search" : "empty"}
        title={
          isFiltered
            ? `No ${nounPlural} match filter "${search || activeFilter}"`
            : currentNamespace !== "all"
              ? `No ${nounPlural} in "${currentNamespace}"`
              : `No ${nounPlural} found`
        }
        description={
          isFiltered
            ? `0 of ${scopedCount} ${nounPlural} in ${currentNamespace === "all" ? "all namespaces" : `namespace "${currentNamespace}"`} match your active search or filter criteria.`
            : currentNamespace !== "all"
              ? `Namespace "${currentNamespace}" currently holds zero ${nounPlural}. ${itemsLength} ${nounPlural} are active in other namespaces.`
              : (emptyDescription ??
                `No ${nounPlural} are present in the connected cluster.`)
        }
        scopeBadge={
          isFiltered
            ? search
              ? `Query: "${search}"`
              : `Filter: ${activeFilter}`
            : `Namespace: ${currentNamespace}`
        }
        codeSnippet={
          !isFiltered && codeCommand
            ? codeCommand(
                currentNamespace === "all" ? "default" : currentNamespace,
              )
            : undefined
        }
        suggestions={
          !isFiltered && currentNamespace !== "all"
            ? Object.entries(namespaceCounts)
                .filter(([namespace]) => namespace !== currentNamespace)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([namespace, count]) => ({
                  label: `${namespace} (${count})`,
                  onClick: () => setCurrentNamespace(namespace),
                }))
            : undefined
        }
        action={
          isFiltered
            ? {
                label: "Clear Filters",
                icon: <RefreshCw className="w-3.5 h-3.5" />,
                onClick: () => {
                  setSearch("");
                  setActiveFilter("all");
                },
              }
            : currentNamespace !== "all"
              ? {
                  label: `View All Namespaces (${itemsLength})`,
                  icon: <Globe className="w-3.5 h-3.5" />,
                  onClick: () => setCurrentNamespace("all"),
                }
              : {
                  label: `Reload ${nounPlural}`,
                  icon: <RefreshCw className="w-3.5 h-3.5" />,
                  onClick: onRefresh,
                }
        }
        secondaryAction={
          currentNamespace !== "all" && isFiltered
            ? {
                label: "Search All Namespaces",
                icon: <Globe className="w-3.5 h-3.5" />,
                onClick: () => setCurrentNamespace("all"),
              }
            : !isFiltered && currentNamespace !== "all"
              ? {
                  label: `Reload ${nounPlural}`,
                  icon: <RefreshCw className="w-3.5 h-3.5" />,
                  onClick: onRefresh,
                }
              : undefined
        }
      />
    </div>
  );
}
