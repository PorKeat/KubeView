"use client";

import * as React from "react";
import { Cpu, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatLabelSelector } from "@/lib/labelSelector";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabStore } from "@/stores/tabStore";
import type { DaemonSetSummary } from "@kubeview/contracts";
import { TableSkeleton, EmptyState } from "@/components/ui";
import { DaemonSetTableToolbar } from "./components/DaemonSetTableToolbar";
import { DaemonSetTableRow } from "./components/DaemonSetTableRow";
import { DaemonSetEmptyState } from "./components/DaemonSetEmptyState";
import { DaemonSetPaginationFooter } from "./components/DaemonSetPaginationFooter";
import {
  DaemonSetTableHeader,
  type DaemonSetSortField,
} from "./components/DaemonSetTableHeader";
import { BulkWorkloadToolbar } from "@/components/views/shared/BulkWorkloadToolbar";
import { useWorkloadSelection } from "@/components/views/shared/useWorkloadSelection";
import {
  daemonSetMatchesSearch,
  daemonSetMatchesStatus,
  type DaemonSetStatusFilter,
} from "./lib/daemonSetStatus";

const getDaemonSetKey = (item: DaemonSetSummary) =>
  `${item.namespace}/${item.name}`;

export function DaemonSetListView() {
  const {
    daemonSets,
    totalDaemonSetsCount,
    isDaemonSetsLoading,
    hasLoadedDaemonSetsOnce,
    loadDaemonSets,
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
    React.useState<DaemonSetStatusFilter>("all");
  const [sortField, setSortField] = React.useState<DaemonSetSortField>("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const defaultPageSize = useSettingsStore((s) => s.defaultPageSize);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);
  React.useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(
    () => setCurrentPage(1),
    [deferredSearch, statusFilter, currentNamespace, pageSize],
  );
  React.useEffect(() => {
    if (currentContext) loadDaemonSets(currentNamespace);
  }, [currentContext, currentNamespace, loadDaemonSets]);
  React.useEffect(() => {
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(
      () => loadDaemonSets(currentNamespace),
      autoRefreshInterval,
    );
    return () => clearInterval(timer);
  }, [autoRefreshInterval, currentContext, currentNamespace, loadDaemonSets]);

  const handleRefresh = () => {
    loadDaemonSets(currentNamespace);
    toast.info("Refreshed DaemonSet telemetry");
  };
  const handleSort = (field: DaemonSetSortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const namespaceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ds of daemonSets)
      counts[ds.namespace] = (counts[ds.namespace] || 0) + 1;
    return counts;
  }, [daemonSets]);

  const baseDaemonSets = React.useMemo(() => {
    if (currentNamespace === "all") return daemonSets;
    return daemonSets.filter(
      (ds) => ds.namespace.toLowerCase() === currentNamespace.toLowerCase(),
    );
  }, [daemonSets, currentNamespace]);

  const filteredItems = React.useMemo(
    () =>
      baseDaemonSets.filter(
        (ds) =>
          daemonSetMatchesStatus(ds, statusFilter) &&
          daemonSetMatchesSearch(ds, deferredSearch.trim().toLowerCase()),
      ),
    [baseDaemonSets, statusFilter, deferredSearch],
  );

  const sortedItems = React.useMemo(
    () =>
      [...filteredItems].sort((a, b) => {
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
          case "ready":
            comparison =
              (a.desiredNumberScheduled === 0
                ? 1
                : a.numberReady / a.desiredNumberScheduled) -
              (b.desiredNumberScheduled === 0
                ? 1
                : b.numberReady / b.desiredNumberScheduled);
            break;
          case "age":
            comparison = a.creationTimestamp.localeCompare(b.creationTimestamp);
            break;
        }
        return sortAsc ? comparison : -comparison;
      }),
    [filteredItems, sortField, sortAsc],
  );

  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(sortedItems.length / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = React.useMemo(() => {
    if (pageSize <= 0) return sortedItems;
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, safeCurrentPage, pageSize]);

  const selection = useWorkloadSelection(
    daemonSets,
    paginatedItems,
    getDaemonSetKey,
  );

  const openBulkAction = (action: "restart" | "delete") => {
    if (selection.selectedObjects.length === 0) return;
    openBulkWorkloadAction({
      kind: "DaemonSet",
      action,
      targets: selection.selectedObjects.map((item) => ({
        name: item.name,
        namespace: item.namespace,
      })),
      onCompleted: selection.clearSelection,
    });
  };

  const handleViewPods = (ds: DaemonSetSummary) => {
    const selector = formatLabelSelector(ds.selector);
    setCurrentNamespace(ds.namespace);
    setPodNodeFilter(null);
    setPodLabelFilter(selector || null, `DaemonSet: ${ds.name}`);
    loadPods(ds.namespace);
    openTab({ id: "pods", title: "Pods", closable: true });
    toast.info(
      selector
        ? `Filtered pods by daemonset '${ds.name}'`
        : `Opened pods in namespace '${ds.namespace}'`,
    );
  };

  const totalDaemonSets = totalDaemonSetsCount || daemonSets.length;
  const isFiltered = search.trim() !== "" || statusFilter !== "all";
  const scopedDaemonSets =
    currentNamespace === "all"
      ? daemonSets.length
      : namespaceCounts[currentNamespace] || 0;

  if (connectionStatus === "offline") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none">
        <EmptyState
          variant="empty"
          title="No Cluster Connected"
          description="Connect or import a kubeconfig file to view and manage live daemonsets."
          action={{
            label: "Import Kubeconfig",
            icon: <Cpu className="w-4 h-4" />,
            onClick: () => openKubeconfigModal("browse"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <DaemonSetTableToolbar
        search={search}
        setSearch={setSearch}
        daemonSets={daemonSets}
        currentNamespace={currentNamespace}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortedItemsCount={sortedItems.length}
        handleRefresh={handleRefresh}
        isLoading={isDaemonSetsLoading}
      />
      <BulkWorkloadToolbar
        selectedCount={selection.selectedItems.size}
        noun="DaemonSet"
        pluralNoun="DaemonSets"
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
      {!hasLoadedDaemonSetsOnce ||
      (isDaemonSetsLoading && filteredItems.length === 0) ? (
        <TableSkeleton rows={10} columns={11} />
      ) : sortedItems.length === 0 ? (
        <DaemonSetEmptyState
          statusFilter={statusFilter}
          search={search}
          isFiltered={isFiltered}
          currentNamespace={currentNamespace}
          scopedDaemonSetCount={scopedDaemonSets}
          daemonSetCount={daemonSets.length}
          namespaceCounts={namespaceCounts}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          onSelectNamespace={setCurrentNamespace}
          onReload={() => loadDaemonSets(currentNamespace)}
        />
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full min-w-[1080px] xl:min-w-0 text-left text-xs border-collapse table-fixed">
            <DaemonSetTableHeader
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
                <DaemonSetTableRow
                  key={`${item.namespace}/${item.name}`}
                  item={item}
                  isSelected={selection.selectedItems.has(
                    getDaemonSetKey(item),
                  )}
                  onToggleSelect={selection.toggleSelectItem}
                  onViewPods={handleViewPods}
                  onRowClick={(ds) =>
                    openInspector({
                      kind: "DaemonSet",
                      name: ds.name,
                      namespace: ds.namespace,
                      status: ds.status,
                      data: ds as unknown as Record<string, unknown>,
                    })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <DaemonSetPaginationFooter
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        safeCurrentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        sortedItemsCount={sortedItems.length}
        scopedDaemonSetCount={scopedDaemonSets}
        totalDaemonSets={totalDaemonSets}
        currentNamespace={currentNamespace}
      />
    </div>
  );
}
