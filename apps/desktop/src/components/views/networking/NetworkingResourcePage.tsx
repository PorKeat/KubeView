"use client";

import { useClusterStore } from "@/stores/clusterStore";
import { EmptyState, TableSkeleton } from "@/components/ui";

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
