"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Globe,
  CheckSquare,
  MinusSquare,
  Square,
  RotateCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatLabelSelector } from "@/lib/labelSelector";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabStore } from "@/stores/tabStore";
import type { StatefulSetSummary } from "@kubeview/contracts";
import { TableSkeleton, EmptyState, Tooltip } from "@/components/ui";

import { StatefulSetTableToolbar } from "./components/StatefulSetTableToolbar";
import { StatefulSetTableRow } from "./components/StatefulSetTableRow";
import { BulkWorkloadToolbar } from "@/components/views/shared/BulkWorkloadToolbar";
import { useWorkloadSelection } from "@/components/views/shared/useWorkloadSelection";
import {
  statefulSetMatchesSearch,
  statefulSetMatchesStatus,
  type StatefulSetStatusFilter,
} from "./lib/statefulSetStatus";

type SortField = "name" | "namespace" | "status" | "ready" | "age";

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
  const [sortField, setSortField] = React.useState<SortField>("name");
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

  const handleSort = (field: SortField) => {
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
          const ratioA = a.desiredReplicas === 0 ? 1 : a.readyReplicas / a.desiredReplicas;
          const ratioB = b.desiredReplicas === 0 ? 1 : b.readyReplicas / b.desiredReplicas;
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

  const selection = useWorkloadSelection(statefulSets, paginatedItems, getStatefulSetKey);

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

  const renderSortIndicator = (field: SortField) => {
    if (sortField === field) {
      return sortAsc ? (
        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
      ) : (
        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
      );
    }
    return <ArrowUpDown className="w-3 h-3 opacity-30" />;
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
                ? "All StatefulSets Healthy"
                : statusFilter === "progressing" && !search
                  ? "All StatefulSets Settled"
                  : statusFilter === "scaleddown" && !search
                    ? "No Scaled Down StatefulSets"
                    : isFiltered
                      ? `No statefulsets match filter "${search || statusFilter}"`
                      : currentNamespace !== "all"
                        ? `No statefulsets in "${currentNamespace}"`
                        : "No StatefulSets Found"
            }
            description={
              statusFilter === "degraded" && !search
                ? `All ${scopedStatefulSets} statefulsets in ${
                    currentNamespace === "all"
                      ? "all cluster namespaces"
                      : `namespace "${currentNamespace}"`
                  } report ready replicas.`
                : statusFilter === "progressing" && !search
                  ? `Zero active StatefulSet transitions. All ${scopedStatefulSets} statefulsets in ${
                      currentNamespace === "all"
                        ? "all cluster namespaces"
                        : `namespace "${currentNamespace}"`
                    } have converged on their desired revision.`
                  : isFiltered
                    ? `0 of ${scopedStatefulSets} statefulsets in ${
                        currentNamespace === "all"
                          ? "all namespaces"
                          : `namespace "${currentNamespace}"`
                      } match your active search or status criteria.`
                    : currentNamespace !== "all"
                      ? `Namespace "${currentNamespace}" currently holds zero statefulsets. ${statefulSets.length} statefulsets are active in other namespaces.`
                      : "No StatefulSets are present in the connected cluster. StatefulSets provide stable pod identity and persistent storage for stateful applications."
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
                ? `kubectl get statefulsets -n ${
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
                      onClick: () => setCurrentNamespace(ns),
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
                      setStatusFilter("all");
                    },
                  }
                : currentNamespace !== "all"
                  ? {
                      label: `View All Namespaces (${statefulSets.length})`,
                      icon: <Globe className="w-3.5 h-3.5" />,
                      onClick: () => setCurrentNamespace("all"),
                    }
                  : {
                      label: "Reload StatefulSets",
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      onClick: () => loadStatefulSets(currentNamespace),
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
                      label: "Reload StatefulSets",
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      onClick: () => loadStatefulSets(currentNamespace),
                    }
                  : undefined
            }
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full min-w-[1040px] text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] select-none">
              <tr className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8">
                <th className="w-8 px-2 text-center">
                  <Tooltip content={selection.isPageAllSelected ? "Deselect all on page" : "Select all on page"}>
                    <button
                      onClick={selection.toggleSelectAll}
                      className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
                      aria-label={selection.isPageAllSelected ? "Deselect all on page" : "Select all on page"}
                    >
                      {selection.isPageAllSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                      ) : selection.isPageSomeSelected || selection.selectedItems.size > 0 ? (
                        <MinusSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </Tooltip>
                </th>

                <th
                  onClick={() => handleSort("name")}
                  className="w-48 sm:w-56 md:w-64 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors min-w-0"
                >
                  <div className="flex items-center gap-1">
                    <span>Name</span>
                    {renderSortIndicator("name")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("namespace")}
                  className="w-24 sm:w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Namespace</span>
                    {renderSortIndicator("namespace")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="w-24 sm:w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                <th className="w-16 py-1 px-3">Desired</th>
                <th className="w-16 py-1 px-3">Current</th>
                <th
                  onClick={() => handleSort("ready")}
                  className="w-16 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Ready</span>
                    {renderSortIndicator("ready")}
                  </div>
                </th>
                <th className="w-16 py-1 px-3">Updated</th>
                <th className="w-36 py-1 px-3">Service</th>
                <th
                  onClick={() => handleSort("age")}
                  className="w-14 sm:w-16 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Age</span>
                    {renderSortIndicator("age")}
                  </div>
                </th>
                <th className="w-9 py-1 px-2 text-right" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedItems.map((item) => (
                <StatefulSetTableRow
                  key={`${item.namespace}/${item.name}`}
                  item={item}
                  isSelected={selection.selectedItems.has(getStatefulSetKey(item))}
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

      <div className="min-h-10 border-t border-[var(--border)] px-2 sm:px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-[var(--muted)] bg-[var(--surface)]/90 backdrop-blur-xs shrink-0 gap-2 sm:gap-4">
        <div className="flex min-w-0 max-w-full items-center gap-2 truncate">
          <span>
            Showing{" "}
            <span className="text-[var(--foreground)] font-mono font-medium">
              {sortedItems.length === 0
                ? "0"
                : pageSize > 0
                  ? `${(safeCurrentPage - 1) * pageSize + 1}–${Math.min(
                      safeCurrentPage * pageSize,
                      sortedItems.length,
                    )}`
                  : `1–${sortedItems.length}`}
            </span>{" "}
            of{" "}
            <span className="text-[var(--foreground)] font-mono font-medium">
              {sortedItems.length}
            </span>{" "}
            items
          </span>
          <span className="text-[var(--muted)]/40">·</span>
          <div className="inline-flex items-center gap-1">
            <span className="text-[var(--muted)]">namespace:</span>
            <span className="font-mono font-medium text-[var(--foreground)] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[10px]">
              {currentNamespace}
            </span>
          </div>
          {sortedItems.length !== scopedStatefulSets && (
            <span className="text-[10px] text-[var(--muted)] opacity-70">
              (filtered from {scopedStatefulSets} total)
            </span>
          )}
          {currentNamespace !== "all" && (
            <>
              <span className="text-[var(--muted)]/40">·</span>
              <span className="text-[10px] text-[var(--muted)]">
                {totalStatefulSets} total statefulsets
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">
              Rows:
            </span>
            <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/[0.04] p-0.5 relative">
              {[50, 100, 250, 0].map((size) => {
                const isSelected = pageSize === size;
                return (
                  <button
                    key={size}
                    type="button" aria-pressed={isSelected} data-testid={`page-size-${size}`}
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "relative px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer select-none",
                      isSelected
                        ? "text-[var(--foreground)] font-semibold"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="statefulSetPageSizeIndicator"
                        className="absolute inset-0 rounded-md bg-[var(--surface-active)] dark:bg-white/10 shadow-xs border border-[var(--border)]/60"
                        transition={{ type: "spring", stiffness: 450, damping: 32, mass: 0.8 }}
                      />
                    )}
                    <span className="relative z-10">{size === 0 ? "All" : size}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[var(--muted)]">
                Page{" "}
                <motion.strong
                  key={safeCurrentPage}
                  initial={{ opacity: 0.4, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[var(--foreground)] font-semibold inline-block min-w-[12px] text-center"
                >
                  {safeCurrentPage}
                </motion.strong>{" "}
                of{" "}
                <strong className="text-[var(--foreground)] font-semibold">
                  {totalPages}
                </strong>
              </span>

              <div className="flex items-center gap-1">
                <Tooltip content="First page" disabled={safeCurrentPage <= 1}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="First page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </motion.button>
                </Tooltip>

                <Tooltip content="Previous page" disabled={safeCurrentPage <= 1}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </motion.button>
                </Tooltip>

                <Tooltip content="Next page" disabled={safeCurrentPage >= totalPages}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </motion.button>
                </Tooltip>

                <Tooltip content="Last page" disabled={safeCurrentPage >= totalPages}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </motion.button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
