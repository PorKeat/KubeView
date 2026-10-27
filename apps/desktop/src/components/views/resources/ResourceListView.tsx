"use client";

import * as React from "react";
import { Box } from "lucide-react";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";
import { EmptyState, TableSkeleton } from "@/components/ui";

import { ResourceTableToolbar } from "./components/ResourceTableToolbar";
import { ResourceBatchToolbar } from "./components/ResourceBatchToolbar";
import { ResourceNamespaceBanner } from "./components/ResourceNamespaceBanner";
import { ResourceTableRow } from "./components/ResourceTableRow";
import { ResourceTableHeader } from "./components/ResourceTableHeader";
import { ResourceListEmptyState } from "./components/ResourceListEmptyState";
import { ResourceListFooter } from "./components/ResourceListFooter";
import { usePodListModel } from "./hooks/usePodListModel";

export interface ResourceListViewProps {
  resourceType: string;
}

export function ResourceListView({ resourceType }: ResourceListViewProps) {
  const {
    pods,
    isPodsLoading,
    hasLoadedPodsOnce,
    totalPodsCount,
    loadPods,
    currentNamespace,
    currentContext,
    setCurrentNamespace,
    connectionStatus,
    openInspector,
    openLogsModal,
    openExecModal,
    openRestartConfirm,
    openDeleteConfirm,
    openBulkDeleteConfirm,
    openBulkRestartConfirm,
    autoRefreshInterval,
    openKubeconfigModal,
    podNodeFilter,
    setPodNodeFilter,
    podLabelFilter,
    podLabelFilterSource,
    setPodLabelFilter,
  } = useClusterStore();

  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    density,
    setDensity,
    sortField,
    sortAsc,
    handleSort,
    selectedItems,
    setSelectedItems,
    toggleSelectItem,
    isPageAllSelected,
    isPageSomeSelected,
    toggleSelectAll,
    pageSize,
    setPageSize,
    setCurrentPage,
    namespaceCounts,
    basePods,
    filteredItems,
    sortedItems,
    totalPages,
    safeCurrentPage,
    paginatedItems,
  } = usePodListModel({
    pods,
    currentNamespace,
    podNodeFilter,
    podLabelFilter,
  });

  // Initial fetch when mounted, when context changes, or if pods have not loaded yet
  React.useEffect(() => {
    if (
      currentContext &&
      (!hasLoadedPodsOnce || useClusterStore.getState().pods.length === 0)
    ) {
      loadPods();
    }
  }, [currentContext, hasLoadedPodsOnce, loadPods]);

  // Periodic Auto-refresh timer
  React.useEffect(() => {
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(() => {
      loadPods();
    }, autoRefreshInterval);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, currentContext, loadPods]);

  const handleRefresh = () => {
    loadPods();
    toast.info("Refreshed pod telemetry");
  };

  // If no cluster connected, render clean empty state
  if (connectionStatus === "offline") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none">
        <EmptyState
          variant="empty"
          title="No Cluster Connected"
          description="Connect or import a kubeconfig file to view and manage live pods."
          action={{
            label: "Import Kubeconfig",
            icon: <Box className="w-4 h-4" />,
            onClick: () => openKubeconfigModal("browse"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* Table Command & Filter Toolbar */}
      <ResourceTableToolbar
        search={search}
        setSearch={setSearch}
        resourceType={resourceType}
        podNodeFilter={podNodeFilter}
        setPodNodeFilter={setPodNodeFilter}
        labelFilter={podLabelFilter}
        labelFilterSource={podLabelFilterSource}
        setLabelFilter={(label) => setPodLabelFilter(label, null)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        pods={pods}
        currentNamespace={currentNamespace}
        sortedItemsCount={sortedItems.length}
        handleRefresh={handleRefresh}
        isPodsLoading={isPodsLoading}
        density={density}
        onToggleDensity={() =>
          setDensity((d) => (d === "comfortable" ? "compact" : "comfortable"))
        }
      />

      {/* Dynamic Namespace Activity Helper Banner */}
      <ResourceNamespaceBanner
        podNodeFilter={podNodeFilter}
        currentNamespace={currentNamespace}
        filteredItemsCount={filteredItems.length}
        totalPodsCount={pods.length}
        search={search}
        namespaceCounts={namespaceCounts}
        setCurrentNamespace={setCurrentNamespace}
      />

      {/* Floating Batch Action Toolbar */}
      <ResourceBatchToolbar
        selectedItemsCount={selectedItems.size}
        onBulkRestart={() => {
          const list = Array.from(selectedItems).map((k) => {
            const [ns, name] = k.split("/");
            return { namespace: ns, name };
          });
          openBulkRestartConfirm(list);
        }}
        onBulkDelete={() => {
          const list = Array.from(selectedItems).map((k) => {
            const [ns, name] = k.split("/");
            return { namespace: ns, name };
          });
          openBulkDeleteConfirm(list);
        }}
        onClearSelection={() => setSelectedItems(new Set())}
      />

      {/* Table View Area */}
      {!hasLoadedPodsOnce || (isPodsLoading && filteredItems.length === 0) ? (
        <TableSkeleton rows={10} columns={9} />
      ) : sortedItems.length === 0 ? (
        <ResourceListEmptyState
          resourceType={resourceType}
          statusFilter={statusFilter}
          search={search}
          podNodeFilter={podNodeFilter}
          podLabelFilter={podLabelFilter}
          podLabelFilterSource={podLabelFilterSource}
          currentNamespace={currentNamespace}
          pods={pods}
          namespaceCounts={namespaceCounts}
          totalPodsCount={totalPodsCount}
          setCurrentNamespace={setCurrentNamespace}
          setPodNodeFilter={setPodNodeFilter}
          setPodLabelFilter={setPodLabelFilter}
          setStatusFilter={setStatusFilter}
          setSearch={setSearch}
          loadPods={loadPods}
        />
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full min-w-[1080px] xl:min-w-0 text-left text-xs border-collapse table-fixed">
            <ResourceTableHeader
              sortField={sortField}
              sortAsc={sortAsc}
              handleSort={handleSort}
              isPageAllSelected={isPageAllSelected}
              isPageSomeSelected={isPageSomeSelected}
              selectedItemsCount={selectedItems.size}
              toggleSelectAll={toggleSelectAll}
            />
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedItems.map((item) => (
                <ResourceTableRow
                  key={`${item.namespace}/${item.name}`}
                  item={item}
                  isSelected={selectedItems.has(
                    `${item.namespace}/${item.name}`,
                  )}
                  density={density}
                  isFailingView={statusFilter === "failing"}
                  isPendingView={statusFilter === "pending"}
                  onToggleSelect={toggleSelectItem}
                  onFilterNode={(node) => setPodNodeFilter(node)}
                  onFilterLabel={(label) => setPodLabelFilter(label, null)}
                  onRowClick={(pod) =>
                    openInspector({
                      kind: "Pod",
                      name: pod.name,
                      namespace: pod.namespace,
                      status: pod.status,
                      data: pod as unknown as Record<string, unknown>,
                    })
                  }
                  onLogsClick={(pod, containerName) =>
                    openLogsModal({
                      name: pod.name,
                      namespace: pod.namespace,
                      container: containerName,
                    })
                  }
                  onExecClick={(pod, containerName) =>
                    openExecModal({
                      name: pod.name,
                      namespace: pod.namespace,
                      container: containerName,
                    })
                  }
                  onRestartClick={(pod) =>
                    openRestartConfirm({
                      name: pod.name,
                      namespace: pod.namespace,
                    })
                  }
                  onDeleteClick={(pod) =>
                    openDeleteConfirm({
                      name: pod.name,
                      namespace: pod.namespace,
                    })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Status Bar with Enterprise Pagination Controls */}
      <ResourceListFooter
        sortedItemsLength={sortedItems.length}
        pageSize={pageSize}
        safeCurrentPage={safeCurrentPage}
        totalPages={totalPages}
        currentNamespace={currentNamespace}
        podNodeFilter={podNodeFilter}
        basePodsLength={basePods.length}
        podsLength={pods.length}
        setPageSize={setPageSize}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}
