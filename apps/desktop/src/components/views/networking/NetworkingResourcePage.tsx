"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { EmptyState, TableSkeleton } from "@/components/ui";
import { useResourceActions } from "@/components/views/shared/useResourceActions";

import { NetworkingToolbar } from "./components/NetworkingToolbar";
import { NetworkingEmptyState } from "./components/NetworkingEmptyState";
import { NetworkingTable } from "./components/NetworkingTable";
import { NetworkingPaginationFooter } from "./components/NetworkingPaginationFooter";
import { useNetworkingListState } from "./hooks/useNetworkingListState";
import type { NetworkingResourcePageProps } from "./types";

export type {
  NetworkingColumn,
  NetworkingFilterOption,
  NetworkingStatusDescriptor,
  NetworkingResourcePageProps,
} from "./types";

export function NetworkingResourcePage<T>({
  icon: Icon,
  nounSingular,
  nounPlural,
  items,
  totalCount,
  isLoading,
  hasLoadedOnce,
  onRefresh,
  searchPlaceholder,
  matchesSearch,
  filterOptions,
  activeFilter,
  setActiveFilter,
  matchesFilter,
  columns,
  getKey,
  getName,
  getNamespace,
  getStatus,
  getAge,
  getCreationTimestamp,
  onRowClick,
  describeCommand,
  onEdit,
  onDelete,
  onDiagnose,
  onCreate,
  bulkDeleteKind,
  testIdPrefix,
  clusterScoped = false,
  includeClusterScoped = false,
  autoRefresh = true,
  emptyDescription,
  codeCommand,
}: NetworkingResourcePageProps<T>) {
  const {
    currentNamespace,
    setCurrentNamespace,
    connectionStatus,
    openKubeconfigModal,
  } = useClusterStore();
  const {
    pageSize,
    setPageSize,
    search,
    setSearch,
    sortField,
    sortAsc,
    setCurrentPage,
    copiedKey,
    setCopiedKey,
    handleSort,
    copyDescribe,
    namespaceCounts,
    filteredItems,
    sortedItems,
    totalPages,
    safeCurrentPage,
    paginatedItems,
    isFiltered,
    scopedCount,
    resolvedTotal,
  } = useNetworkingListState({
    items,
    totalCount,
    autoRefresh,
    onRefresh,
    matchesSearch,
    activeFilter,
    matchesFilter,
    columns,
    getKey,
    getName,
    getNamespace,
    getStatus,
    getCreationTimestamp,
    describeCommand,
    clusterScoped,
    includeClusterScoped,
  });
  const { deleteResources } = useResourceActions();
  const selectable = Boolean(bulkDeleteKind);
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [bulkConfirm, setBulkConfirm] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  React.useEffect(() => {
    setSelectedKeys(new Set());
    setBulkConfirm(false);
  }, [activeFilter, currentNamespace, search]);

  const selectedItems = React.useMemo(
    () => sortedItems.filter((item) => selectedKeys.has(getKey(item))),
    [getKey, selectedKeys, sortedItems],
  );
  const allSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedKeys.has(getKey(item)));
  const someSelected = paginatedItems.some((item) =>
    selectedKeys.has(getKey(item)),
  );

  const toggleSelect = (key: string) => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      for (const item of paginatedItems) {
        const key = getKey(item);
        if (allSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const deleteSelected = async () => {
    if (!bulkDeleteKind || selectedItems.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await deleteResources(
        bulkDeleteKind,
        selectedItems.map((item) => {
          const namespace = getNamespace(item);
          return {
            name: getName(item),
            namespace: namespace === "Cluster Scope" ? "" : namespace,
          };
        }),
      );
      setSelectedKeys(new Set());
      setBulkConfirm(false);
      onRefresh();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (connectionStatus === "offline") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none">
        <EmptyState
          variant="empty"
          title="No Cluster Connected"
          description={`Connect or import a kubeconfig file to view live ${nounPlural}.`}
          action={{
            label: "Import Kubeconfig",
            icon: <Icon className="w-4 h-4" />,
            onClick: () => openKubeconfigModal("browse"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <NetworkingToolbar
        search={search}
        setSearch={setSearch}
        searchPlaceholder={searchPlaceholder}
        nounSingular={nounSingular}
        nounPlural={nounPlural}
        filterOptions={filterOptions}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        testIdPrefix={testIdPrefix}
        sortedItemsCount={sortedItems.length}
        onRefresh={onRefresh}
        onCreate={onCreate}
        isLoading={isLoading}
      />

      {selectable && selectedKeys.size > 0 && (
        <div
          data-testid={`${testIdPrefix}-bulk-bar`}
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1.5"
        >
          <span className="font-mono text-[11px] text-[var(--foreground)]">
            {selectedItems.length} selected
          </span>
          <div className="flex items-center gap-2">
            {bulkConfirm ? (
              <>
                <span className="text-[10px] text-[var(--muted)]">
                  Delete {selectedItems.length} {nounPlural}?
                </span>
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-bulk-delete-confirm`}
                  onClick={() => void deleteSelected()}
                  disabled={isBulkDeleting}
                  className="rounded-md bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60 cursor-pointer"
                >
                  {isBulkDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkConfirm(false)}
                  className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                data-testid={`${testIdPrefix}-bulk-delete`}
                onClick={() => setBulkConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[10px] font-medium text-rose-600 transition-colors hover:bg-rose-500/20 cursor-pointer dark:text-rose-400"
              >
                <Trash2 className="h-3 w-3" />
                Delete selected
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedKeys(new Set());
                setBulkConfirm(false);
              }}
              className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {!hasLoadedOnce || (isLoading && filteredItems.length === 0) ? (
        <TableSkeleton rows={10} columns={columns.length + 4} />
      ) : sortedItems.length === 0 ? (
        <NetworkingEmptyState
          nounPlural={nounPlural}
          isFiltered={isFiltered}
          search={search}
          setSearch={setSearch}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          currentNamespace={currentNamespace}
          itemsLength={items.length}
          emptyDescription={emptyDescription}
          scopedCount={scopedCount}
          namespaceCounts={namespaceCounts}
          setCurrentNamespace={setCurrentNamespace}
          onRefresh={onRefresh}
          codeCommand={codeCommand}
        />
      ) : (
        <NetworkingTable
          icon={Icon}
          nounSingular={nounSingular}
          columns={columns}
          paginatedItems={paginatedItems}
          getKey={getKey}
          getName={getName}
          getNamespace={getNamespace}
          getStatus={getStatus}
          getAge={getAge}
          sortField={sortField}
          sortAsc={sortAsc}
          handleSort={handleSort}
          copiedKey={copiedKey}
          setCopiedKey={setCopiedKey}
          copyDescribe={copyDescribe}
          onRowClick={onRowClick}
          onEdit={onEdit}
          onDelete={onDelete}
          onDiagnose={onDiagnose}
          selectable={selectable}
          selectedKeys={selectedKeys}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          allSelected={allSelected}
          someSelected={someSelected}
          testIdPrefix={testIdPrefix}
        />
      )}

      <NetworkingPaginationFooter
        sortedItemsLength={sortedItems.length}
        pageSize={pageSize}
        safeCurrentPage={safeCurrentPage}
        totalPages={totalPages}
        currentNamespace={currentNamespace}
        scopedCount={scopedCount}
        resolvedTotal={resolvedTotal}
        nounPlural={nounPlural}
        testIdPrefix={testIdPrefix}
        setPageSize={setPageSize}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}
