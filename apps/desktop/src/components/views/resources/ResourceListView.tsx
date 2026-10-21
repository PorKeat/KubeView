"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  MinusSquare,
  Box,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import type { PodSummary } from "@kubeview/contracts";
import { TableSkeleton, EmptyState } from "@/components/ui";

import { ResourceTableToolbar } from "./components/ResourceTableToolbar";
import { ResourceBatchToolbar } from "./components/ResourceBatchToolbar";
import { ResourceNamespaceBanner } from "./components/ResourceNamespaceBanner";
import { ResourceTableRow } from "./components/ResourceTableRow";
import {
  getPodIssue,
  isPodFailing,
  isPodRunning,
  isPodPending,
} from "./lib/podIssues";

export interface ResourceListViewProps {
  resourceType: string;
}

export function ResourceListView({ resourceType }: ResourceListViewProps) {
  const {
    pods,
    isPodsLoading,
    hasLoadedPodsOnce,
    totalPodsCount,
    clusterOverview,
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
    setAutoRefreshInterval,
    openKubeconfigModal,
    podNodeFilter,
    setPodNodeFilter,
  } = useClusterStore();

  // Free-text search with useDeferredValue for 120Hz input responsiveness
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [labelFilter, setLabelFilter] = React.useState<string | null>(null);
  const [density, setDensity] = React.useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [sortField, setSortField] = React.useState<
    "name" | "namespace" | "status" | "age" | "restarts" | "node"
  >("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(
    new Set(),
  );

  // Client-side pagination for low memory & fast rendering on 1,000+ pods
  const [pageSize, setPageSize] = React.useState<number>(50);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    deferredSearch,
    statusFilter,
    podNodeFilter,
    labelFilter,
    currentNamespace,
    pageSize,
  ]);

  // Initial fetch when mounted, when context changes, or if pods have not loaded yet
  React.useEffect(() => {
    if (currentContext && (!hasLoadedPodsOnce || useClusterStore.getState().pods.length === 0)) {
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

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const toggleSelectItem = (key: string) => {
    const next = new Set(selectedItems);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedItems(next);
  };

  // Compute cluster-wide pod counts by namespace
  const namespaceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pods) {
      counts[p.namespace] = (counts[p.namespace] || 0) + 1;
    }
    return counts;
  }, [pods]);

  // Scoped baseline pods for active namespace & node filter
  const basePods = React.useMemo(() => {
    let list =
      currentNamespace === "all"
        ? pods
        : pods.filter(
            (p) =>
              p.namespace.toLowerCase() === currentNamespace.toLowerCase(),
          );

    if (podNodeFilter) {
      list = list.filter((p) => {
        if (!p.nodeName) return false;
        const pNode = p.nodeName.trim().toLowerCase();
        const fNode = podNodeFilter.trim().toLowerCase();
        return (
          pNode === fNode ||
          pNode.startsWith(fNode + ".") ||
          fNode.startsWith(pNode + ".")
        );
      });
    }

    return list;
  }, [podNodeFilter, pods, currentNamespace]);

  // Filter items (client-side high speed filtering)
  const filteredItems = React.useMemo(() => {
    return pods.filter((pod) => {
      // 1. Pod Node filter
      if (podNodeFilter) {
        if (!pod.nodeName) return false;
        const pNode = pod.nodeName.trim().toLowerCase();
        const fNode = podNodeFilter.trim().toLowerCase();
        if (
          pNode !== fNode &&
          !pNode.startsWith(fNode + ".") &&
          !fNode.startsWith(pNode + ".")
        ) {
          return false;
        }
      }

      // 1.5 Label filter
      if (labelFilter) {
        if (!pod.labels) return false;
        const [filterKey, filterVal] = labelFilter.includes("=")
          ? labelFilter.split("=")
          : [labelFilter, undefined];
        const actualVal = pod.labels[filterKey.trim()];
        if (actualVal === undefined) return false;
        if (
          filterVal !== undefined &&
          actualVal.trim() !== filterVal.trim()
        ) {
          return false;
        }
      }

      // 2. Namespace filter
      if (
        currentNamespace !== "all" &&
        pod.namespace.toLowerCase() !== currentNamespace.toLowerCase()
      ) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "running" && !isPodRunning(pod))
          return false;
        if (statusFilter === "pending" && !isPodPending(pod))
          return false;
        if (statusFilter === "failing" && !isPodFailing(pod))
          return false;
      }

      // 4. Free-text search (debounced via useDeferredValue for 120 FPS typing)
      if (deferredSearch.trim()) {
        const query = deferredSearch.toLowerCase();
        const matchesName = pod.name.toLowerCase().includes(query);
        const matchesNs = pod.namespace.toLowerCase().includes(query);
        const matchesNode = pod.nodeName?.toLowerCase().includes(query);
        const matchesIp = pod.ip?.toLowerCase().includes(query);
        return matchesName || matchesNs || matchesNode || matchesIp;
      }

      return true;
    });
  }, [
    pods,
    podNodeFilter,
    labelFilter,
    currentNamespace,
    statusFilter,
    deferredSearch,
  ]);

  // Sort items
  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      // In failing view, prioritize critical severity failures first
      if (statusFilter === "failing" && sortField === "name") {
        const issueA = getPodIssue(a);
        const issueB = getPodIssue(b);
        const weightA = issueA?.severity === "critical" ? 2 : 1;
        const weightB = issueB?.severity === "critical" ? 2 : 1;
        if (weightA !== weightB) {
          return weightB - weightA;
        }
      }

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
        case "restarts":
          comparison = a.restarts - b.restarts;
          break;
        case "node":
          comparison = (a.nodeName || "").localeCompare(b.nodeName || "");
          break;
        case "age":
          comparison = a.age.localeCompare(b.age);
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

  const isPageAllSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((i) => selectedItems.has(`${i.namespace}/${i.name}`));
  const isPageSomeSelected =
    !isPageAllSelected &&
    paginatedItems.some((i) => selectedItems.has(`${i.namespace}/${i.name}`));

  const toggleSelectAll = () => {
    if (isPageAllSelected) {
      const next = new Set(selectedItems);
      paginatedItems.forEach((i) => next.delete(`${i.namespace}/${i.name}`));
      setSelectedItems(next);
    } else {
      const next = new Set(selectedItems);
      paginatedItems.forEach((i) => next.add(`${i.namespace}/${i.name}`));
      setSelectedItems(next);
    }
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
        labelFilter={labelFilter}
        setLabelFilter={setLabelFilter}
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
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
          <EmptyState
            variant={
              (statusFilter === "failing" || statusFilter === "pending") && !search
                ? "healthy"
                : podNodeFilter
                  ? "empty"
                  : search || statusFilter !== "all"
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
                : search || statusFilter !== "all"
                  ? search
                    ? `Query: "${search}"`
                    : `Status: ${statusFilter}`
                  : `Namespace: ${currentNamespace}`
            }
            codeSnippet={
              !search && statusFilter === "all" && !podNodeFilter
                ? `kubectl run demo-app --image=nginx --namespace=${
                    currentNamespace === "all" ? "default" : currentNamespace
                  }`
                : undefined
            }
            suggestions={
              !search &&
              statusFilter === "all" &&
              !podNodeFilter &&
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
                : (statusFilter === "failing" || statusFilter === "pending") && !search
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
                : !search &&
                    statusFilter === "all" &&
                    currentNamespace !== "all"
                  ? {
                      label: "Search All Namespaces",
                      icon: <Globe className="w-3.5 h-3.5" />,
                      onClick: () => {
                        setCurrentNamespace("all");
                      },
                    }
                  : currentNamespace !== "all" &&
                      (search || statusFilter !== "all")
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
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)]">
              <tr className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8">
                <th className="w-9 px-3 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
                    title={isPageAllSelected ? "Deselect all on page" : "Select all on page"}
                  >
                    {isPageAllSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                    ) : isPageSomeSelected || selectedItems.size > 0 ? (
                      <MinusSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Name</span>
                    {sortField === "name" ? (
                      sortAsc ? (
                        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("namespace")}
                  className="py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Namespace</span>
                    {sortField === "namespace" ? (
                      sortAsc ? (
                        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {sortField === "status" ? (
                      sortAsc ? (
                        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th className="py-1 px-3">Ready</th>
                <th
                  onClick={() => handleSort("restarts")}
                  className="py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Restarts</span>
                    {sortField === "restarts" ? (
                      sortAsc ? (
                        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("node")}
                  className="py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Node</span>
                    {sortField === "node" ? (
                      sortAsc ? (
                        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th className="py-1 px-3">IP</th>
                <th className="py-1 px-3">CPU (Req)</th>
                <th className="py-1 px-3">Memory (Req)</th>
                <th
                  onClick={() => handleSort("age")}
                  className="py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Age</span>
                    {sortField === "age" ? (
                      sortAsc ? (
                        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th className="py-1 px-3 text-right">Actions</th>
              </tr>
            </thead>
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
                  onFilterLabel={(label) => setLabelFilter(label)}
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
          {podNodeFilter && (
            <>
              <span className="text-[var(--muted)]/40">·</span>
              <div className="inline-flex items-center gap-1">
                <span className="text-[var(--muted)]">node:</span>
                <span className="font-mono font-medium text-[var(--foreground)] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[10px]">
                  {podNodeFilter}
                </span>
              </div>
            </>
          )}
          {sortedItems.length !==
            (podNodeFilter ? basePods.length : pods.length) && (
            <span className="text-[10px] text-[var(--muted)] opacity-70">
              (filtered from {podNodeFilter ? basePods.length : pods.length} total)
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Page size selector with sliding spring indicator */}
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
                        layoutId="pageSizeIndicator"
                        className="absolute inset-0 rounded-md bg-[var(--surface-active)] dark:bg-white/10 shadow-xs border border-[var(--border)]/60"
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 32,
                          mass: 0.8,
                        }}
                      />
                    )}
                    <span className="relative z-10">{size === 0 ? "All" : size}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Page navigation with tactile animated buttons */}
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
