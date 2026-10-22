"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Repeat,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatLabelSelector } from "@/lib/labelSelector";
import { useClusterStore } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import type { ReplicaSetSummary } from "@kubeview/contracts";
import { TableSkeleton, EmptyState, Tooltip } from "@/components/ui";

import { ReplicaSetTableToolbar } from "./components/ReplicaSetTableToolbar";
import { ReplicaSetTableRow } from "./components/ReplicaSetTableRow";
import {
  replicaSetMatchesSearch,
  replicaSetMatchesStatus,
  type ReplicaSetStatusFilter,
} from "./lib/replicaSetStatus";

type SortField = "name" | "namespace" | "status" | "ready" | "age";

export function ReplicaSetListView() {
  const {
    replicaSets,
    totalReplicaSetsCount,
    isReplicaSetsLoading,
    hasLoadedReplicaSetsOnce,
    loadReplicaSets,
    loadPods,
    currentNamespace,
    currentContext,
    setCurrentNamespace,
    setPodNodeFilter,
    setPodLabelFilter,
    connectionStatus,
    openKubeconfigModal,
    autoRefreshInterval,
  } = useClusterStore();
  const { openTab } = useTabStore();

  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [statusFilter, setStatusFilter] =
    React.useState<ReplicaSetStatusFilter>("all");
  const [sortField, setSortField] = React.useState<SortField>("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const [pageSize, setPageSize] = React.useState<number>(50);
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

      {!hasLoadedReplicaSetsOnce ||
      (isReplicaSetsLoading && filteredItems.length === 0) ? (
        <TableSkeleton rows={10} columns={8} />
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
                ? "All ReplicaSets Healthy"
                : statusFilter === "progressing" && !search
                  ? "All ReplicaSets Settled"
                  : statusFilter === "scaleddown" && !search
                    ? "No Scaled Down ReplicaSets"
                    : isFiltered
                      ? `No replicasets match filter "${search || statusFilter}"`
                      : currentNamespace !== "all"
                        ? `No replicasets in "${currentNamespace}"`
                        : "No ReplicaSets Found"
            }
            description={
              statusFilter === "degraded" && !search
                ? `All ${scopedReplicaSets} replicasets in ${
                    currentNamespace === "all"
                      ? "all cluster namespaces"
                      : `namespace "${currentNamespace}"`
                  } report ready replicas and no replica failures.`
                : statusFilter === "progressing" && !search
                  ? `Zero active replica transitions. All ${scopedReplicaSets} replicasets in ${
                      currentNamespace === "all"
                        ? "all cluster namespaces"
                        : `namespace "${currentNamespace}"`
                    } have converged on their desired replica count.`
                  : isFiltered
                    ? `0 of ${scopedReplicaSets} replicasets in ${
                        currentNamespace === "all"
                          ? "all namespaces"
                          : `namespace "${currentNamespace}"`
                      } match your active search or status criteria.`
                    : currentNamespace !== "all"
                      ? `Namespace "${currentNamespace}" currently holds zero replicasets. ${replicaSets.length} replicasets are active in other namespaces.`
                      : "No ReplicaSets are present in the connected cluster. ReplicaSets are created automatically by Deployments."
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
                      label: `View All Namespaces (${replicaSets.length})`,
                      icon: <Globe className="w-3.5 h-3.5" />,
                      onClick: () => setCurrentNamespace("all"),
                    }
                  : {
                      label: "Reload ReplicaSets",
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      onClick: () => loadReplicaSets(currentNamespace),
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
                      label: "Reload ReplicaSets",
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      onClick: () => loadReplicaSets(currentNamespace),
                    }
                  : undefined
            }
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] select-none">
              <tr className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8">
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
                  className="w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("ready")}
                  className="w-20 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Ready</span>
                    {renderSortIndicator("ready")}
                  </div>
                </th>
                <th className="w-20 py-1 px-3">Current</th>
                <th className="w-40 py-1 px-3">Owner</th>
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
                <ReplicaSetTableRow
                  key={`${item.namespace}/${item.name}`}
                  item={item}
                  onViewPods={handleViewPods}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="h-10 border-t border-[var(--border)] px-4 flex items-center justify-between text-[11px] text-[var(--muted)] bg-[var(--surface)]/90 backdrop-blur-xs shrink-0 gap-4">
        <div className="flex items-center gap-2 truncate">
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
          {sortedItems.length !== scopedReplicaSets && (
            <span className="text-[10px] text-[var(--muted)] opacity-70">
              (filtered from {scopedReplicaSets} total)
            </span>
          )}
          {currentNamespace !== "all" && (
            <>
              <span className="text-[var(--muted)]/40">·</span>
              <span className="text-[10px] text-[var(--muted)]">
                {totalReplicaSets} total replicasets
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
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
                    type="button"
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
                        layoutId="replicaSetPageSizeIndicator"
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
