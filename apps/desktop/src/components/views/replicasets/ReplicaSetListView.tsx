"use client";

import * as React from "react";
import { Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatLabelSelector } from "@/lib/labelSelector";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabStore } from "@/stores/tabStore";
import type { ReplicaSetSummary } from "@kubeview/contracts";
import { TableSkeleton, EmptyState } from "@/components/ui";

import { ReplicaSetTableToolbar } from "./components/ReplicaSetTableToolbar";
import { ReplicaSetTableRow } from "./components/ReplicaSetTableRow";
import { ReplicaSetEmptyState } from "./components/ReplicaSetEmptyState";
import { ReplicaSetPaginationFooter } from "./components/ReplicaSetPaginationFooter";
import {
  ReplicaSetTableHeader,
  type ReplicaSetSortField,
} from "./components/ReplicaSetTableHeader";
import { BulkWorkloadToolbar } from "@/components/views/shared/BulkWorkloadToolbar";
import { useWorkloadSelection } from "@/components/views/shared/useWorkloadSelection";
import {
  replicaSetMatchesSearch,
  replicaSetMatchesStatus,
  type ReplicaSetStatusFilter,
} from "./lib/replicaSetStatus";

const getReplicaSetKey = (item: ReplicaSetSummary) =>
  `${item.namespace}/${item.name}`;

export function ReplicaSetListView() {
  const {
    replicaSets,
    totalReplicaSetsCount,
    isReplicaSetsLoading,
    hasLoadedReplicaSetsOnce,
    loadReplicaSets,
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
    React.useState<ReplicaSetStatusFilter>("all");
  const [sortField, setSortField] = React.useState<ReplicaSetSortField>("name");
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
      loadReplicaSets(currentNamespace);
    }
  }, [currentContext, currentNamespace, loadReplicaSets]);

  React.useEffect(() => {
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(() => {
      loadReplicaSets(currentNamespace);
    }, autoRefreshInterval);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, currentContext, currentNamespace, loadReplicaSets]);

  const handleRefresh = () => {
    loadReplicaSets(currentNamespace);
    toast.info("Refreshed ReplicaSet telemetry");
  };

  const handleSort = (field: ReplicaSetSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const namespaceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const replicaSet of replicaSets) {
      counts[replicaSet.namespace] = (counts[replicaSet.namespace] || 0) + 1;
    }
    return counts;
  }, [replicaSets]);

  const baseReplicaSets = React.useMemo(() => {
    if (currentNamespace === "all") return replicaSets;
    return replicaSets.filter(
      (replicaSet) =>
        replicaSet.namespace.toLowerCase() === currentNamespace.toLowerCase(),
    );
  }, [replicaSets, currentNamespace]);

  const filteredItems = React.useMemo(() => {
    return baseReplicaSets.filter(
      (replicaSet) =>
        replicaSetMatchesStatus(replicaSet, statusFilter) &&
        replicaSetMatchesSearch(
          replicaSet,
          deferredSearch.trim().toLowerCase(),
        ),
    );
  }, [baseReplicaSets, statusFilter, deferredSearch]);

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
    replicaSets,
    paginatedItems,
    getReplicaSetKey,
  );

  const openBulkDelete = () => {
    if (selection.selectedObjects.length === 0) return;
    openBulkWorkloadAction({
      kind: "ReplicaSet",
      action: "delete",
      targets: selection.selectedObjects.map((item) => ({
        name: item.name,
        namespace: item.namespace,
      })),
      onCompleted: selection.clearSelection,
    });
  };

  const handleViewPods = (replicaSet: ReplicaSetSummary) => {
    const selector = formatLabelSelector(replicaSet.selector);
    setCurrentNamespace(replicaSet.namespace);
    setPodNodeFilter(null);
    setPodLabelFilter(selector || null, `ReplicaSet: ${replicaSet.name}`);
    loadPods(replicaSet.namespace);
    openTab({ id: "pods", title: "Pods", closable: true });
    toast.info(
      selector
        ? `Filtered pods by replicaset '${replicaSet.name}'`
        : `Opened pods in namespace '${replicaSet.namespace}'`,
    );
  };

  const totalReplicaSets = totalReplicaSetsCount || replicaSets.length;
  const isFiltered = search.trim() !== "" || statusFilter !== "all";
  const scopedReplicaSets =
    currentNamespace === "all"
      ? replicaSets.length
      : namespaceCounts[currentNamespace] || 0;

  if (connectionStatus === "offline") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none">
        <EmptyState
          variant="empty"
          title="No Cluster Connected"
          description="Connect or import a kubeconfig file to view and manage live replicasets."
          action={{
            label: "Import Kubeconfig",
            icon: <Repeat className="w-4 h-4" />,
            onClick: () => openKubeconfigModal("browse"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <ReplicaSetTableToolbar
        search={search}
        setSearch={setSearch}
        replicaSets={replicaSets}
        currentNamespace={currentNamespace}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortedItemsCount={sortedItems.length}
        handleRefresh={handleRefresh}
        isLoading={isReplicaSetsLoading}
      />

      <BulkWorkloadToolbar
        selectedCount={selection.selectedItems.size}
        noun="ReplicaSet"
        pluralNoun="ReplicaSets"
        onClear={selection.clearSelection}
        actions={[
          {
            id: "delete",
            label: "Delete Selected",
            icon: Trash2,
            tone: "danger",
            onClick: openBulkDelete,
          },
        ]}
      />
      {!hasLoadedReplicaSetsOnce ||
      (isReplicaSetsLoading && filteredItems.length === 0) ? (
        <TableSkeleton rows={10} columns={8} />
      ) : sortedItems.length === 0 ? (
        <ReplicaSetEmptyState
          statusFilter={statusFilter}
          search={search}
          isFiltered={isFiltered}
          currentNamespace={currentNamespace}
          scopedReplicaSetCount={scopedReplicaSets}
          replicaSetCount={replicaSets.length}
          namespaceCounts={namespaceCounts}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          onSelectNamespace={setCurrentNamespace}
          onReload={() => loadReplicaSets(currentNamespace)}
        />
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <ReplicaSetTableHeader
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
                <ReplicaSetTableRow
                  key={`${item.namespace}/${item.name}`}
                  item={item}
                  isSelected={selection.selectedItems.has(
                    getReplicaSetKey(item),
                  )}
                  onToggleSelect={selection.toggleSelectItem}
                  onViewPods={handleViewPods}
                  onRowClick={(replicaSet) =>
                    openInspector({
                      kind: "ReplicaSet",
                      name: replicaSet.name,
                      namespace: replicaSet.namespace,
                      status: replicaSet.status,
                      data: replicaSet as unknown as Record<string, unknown>,
                    })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReplicaSetPaginationFooter
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        safeCurrentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        sortedItemsCount={sortedItems.length}
        scopedReplicaSetCount={scopedReplicaSets}
        totalReplicaSets={totalReplicaSets}
        currentNamespace={currentNamespace}
      />
    </div>
  );
}
