"use client";

import * as React from "react";
import { Database, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatLabelSelector } from "@/lib/labelSelector";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabStore } from "@/stores/tabStore";
import type { StatefulSetSummary } from "@kubeview/contracts";
import { TableSkeleton, EmptyState } from "@/components/ui";

import { StatefulSetTableToolbar } from "./components/StatefulSetTableToolbar";
import { StatefulSetTableRow } from "./components/StatefulSetTableRow";
import { StatefulSetEmptyState } from "./components/StatefulSetEmptyState";
import { StatefulSetPaginationFooter } from "./components/StatefulSetPaginationFooter";
import {
  StatefulSetTableHeader,
  type StatefulSetSortField,
} from "./components/StatefulSetTableHeader";
import { BulkWorkloadToolbar } from "@/components/views/shared/BulkWorkloadToolbar";
import { useWorkloadSelection } from "@/components/views/shared/useWorkloadSelection";
import {
  statefulSetMatchesSearch,
  statefulSetMatchesStatus,
  type StatefulSetStatusFilter,
} from "./lib/statefulSetStatus";

const getStatefulSetKey = (item: StatefulSetSummary) =>
  `${item.namespace}/${item.name}`;

export function StatefulSetListView() {
  const {
    statefulSets,
    totalStatefulSetsCount,
    isStatefulSetsLoading,
    hasLoadedStatefulSetsOnce,
    loadStatefulSets,
    loadPods,
    openInspector,
    currentNamespace,
    currentContext,
    setCurrentNamespace,
    setPodNodeFilter,
    setPodLabelFilter,
    connectionStatus,
    openKubeconfigModal,
    autoRefreshInterval,
    openBulkWorkloadAction,
  } = useClusterStore();
  const { openTab } = useTabStore();

  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [statusFilter, setStatusFilter] =
    React.useState<StatefulSetStatusFilter>("all");
  const [sortField, setSortField] =
    React.useState<StatefulSetSortField>("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const defaultPageSize = useSettingsStore((s) => s.defaultPageSize);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);
  React.useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, statusFilter, currentNamespace, pageSize]);

  React.useEffect(() => {
    if (currentContext) {
      loadStatefulSets(currentNamespace);
    }
  }, [currentContext, currentNamespace, loadStatefulSets]);

  React.useEffect(() => {
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(() => {
      loadStatefulSets(currentNamespace);
    }, autoRefreshInterval);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, currentContext, currentNamespace, loadStatefulSets]);

  const handleRefresh = () => {
    loadStatefulSets(currentNamespace);
    toast.info("Refreshed StatefulSet telemetry");
  };

  const handleSort = (field: StatefulSetSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const namespaceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const statefulSet of statefulSets) {
      counts[statefulSet.namespace] = (counts[statefulSet.namespace] || 0) + 1;
    }
    return counts;
  }, [statefulSets]);

  const baseStatefulSets = React.useMemo(() => {
    if (currentNamespace === "all") return statefulSets;
    return statefulSets.filter(
      (statefulSet) =>
        statefulSet.namespace.toLowerCase() === currentNamespace.toLowerCase(),
    );
  }, [statefulSets, currentNamespace]);

  const filteredItems = React.useMemo(() => {
    return baseStatefulSets.filter(
      (statefulSet) =>
        statefulSetMatchesStatus(statefulSet, statusFilter) &&
        statefulSetMatchesSearch(
          statefulSet,
          deferredSearch.trim().toLowerCase(),
        ),
    );
  }, [baseStatefulSets, statusFilter, deferredSearch]);

  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "namespace":
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "ready": {
          const ratioA =
            a.desiredReplicas === 0 ? 1 : a.readyReplicas / a.desiredReplicas;
          const ratioB =
            b.desiredReplicas === 0 ? 1 : b.readyReplicas / b.desiredReplicas;
          comparison = ratioA - ratioB;
          break;
        }
        case "age":
          comparison = a.creationTimestamp.localeCompare(b.creationTimestamp);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [filteredItems, sortField, sortAsc]);

  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(sortedItems.length / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = React.useMemo(() => {
    if (pageSize <= 0) return sortedItems;
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, safeCurrentPage, pageSize]);

  const selection = useWorkloadSelection(
    statefulSets,
    paginatedItems,
    getStatefulSetKey,
  );

  const openBulkAction = (action: "restart" | "delete") => {
    if (selection.selectedObjects.length === 0) return;
    openBulkWorkloadAction({
      kind: "StatefulSet",
      action,
      targets: selection.selectedObjects.map((item) => ({
        name: item.name,
        namespace: item.namespace,
      })),
      onCompleted: selection.clearSelection,
    });
  };

  const handleViewPods = (statefulSet: StatefulSetSummary) => {
    const selector = formatLabelSelector(statefulSet.selector);
    setCurrentNamespace(statefulSet.namespace);
    setPodNodeFilter(null);
    setPodLabelFilter(selector || null, `StatefulSet: ${statefulSet.name}`);
    loadPods(statefulSet.namespace);
    openTab({ id: "pods", title: "Pods", closable: true });
    toast.info(
      selector
        ? `Filtered pods by statefulset '${statefulSet.name}'`
        : `Opened pods in namespace '${statefulSet.namespace}'`,
    );
  };

  const totalStatefulSets = totalStatefulSetsCount || statefulSets.length;
  const isFiltered = search.trim() !== "" || statusFilter !== "all";
  const scopedStatefulSets =
    currentNamespace === "all"
      ? statefulSets.length
      : namespaceCounts[currentNamespace] || 0;

  if (connectionStatus === "offline") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none">
        <EmptyState
          variant="empty"
          title="No Cluster Connected"
          description="Connect or import a kubeconfig file to view and manage live statefulsets."
          action={{
            label: "Import Kubeconfig",
            icon: <Database className="w-4 h-4" />,
            onClick: () => openKubeconfigModal("browse"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <StatefulSetTableToolbar
        search={search}
        setSearch={setSearch}
        statefulSets={statefulSets}
        currentNamespace={currentNamespace}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortedItemsCount={sortedItems.length}
        handleRefresh={handleRefresh}
        isLoading={isStatefulSetsLoading}
      />

      <BulkWorkloadToolbar
        selectedCount={selection.selectedItems.size}
        noun="StatefulSet"
        pluralNoun="StatefulSets"
        onClear={selection.clearSelection}
        actions={[
          {
            id: "restart",
            label: "Restart Selected",
            icon: RotateCw,
            onClick: () => openBulkAction("restart"),
          },
          {
            id: "delete",
            label: "Delete Selected",
            icon: Trash2,
            tone: "danger",
            onClick: () => openBulkAction("delete"),
          },
        ]}
      />
      {!hasLoadedStatefulSetsOnce ||
      (isStatefulSetsLoading && filteredItems.length === 0) ? (
        <TableSkeleton rows={10} columns={10} />
      ) : sortedItems.length === 0 ? (
        <StatefulSetEmptyState
          statusFilter={statusFilter}
          search={search}
          isFiltered={isFiltered}
          currentNamespace={currentNamespace}
          scopedStatefulSetCount={scopedStatefulSets}
          statefulSetCount={statefulSets.length}
          namespaceCounts={namespaceCounts}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          onSelectNamespace={setCurrentNamespace}
          onReload={() => loadStatefulSets(currentNamespace)}
        />
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full min-w-[1040px] text-left text-xs border-collapse table-fixed">
            <StatefulSetTableHeader
              sortField={sortField}
              sortAsc={sortAsc}
              onSort={handleSort}
              selectedItemsCount={selection.selectedItems.size}
              isPageAllSelected={selection.isPageAllSelected}
              isPageSomeSelected={selection.isPageSomeSelected}
              onToggleSelectAll={selection.toggleSelectAll}
            />
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedItems.map((item) => (
                <StatefulSetTableRow
                  key={`${item.namespace}/${item.name}`}
                  item={item}
                  isSelected={selection.selectedItems.has(
                    getStatefulSetKey(item),
                  )}
                  onToggleSelect={selection.toggleSelectItem}
                  onViewPods={handleViewPods}
                  onRowClick={(statefulSet) =>
                    openInspector({
                      kind: "StatefulSet",
                      name: statefulSet.name,
                      namespace: statefulSet.namespace,
                      status: statefulSet.status,
                      data: statefulSet as unknown as Record<string, unknown>,
                    })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StatefulSetPaginationFooter
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        safeCurrentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        sortedItemsCount={sortedItems.length}
        scopedStatefulSetCount={scopedStatefulSets}
        totalStatefulSets={totalStatefulSets}
        currentNamespace={currentNamespace}
      />
    </div>
  );
}
