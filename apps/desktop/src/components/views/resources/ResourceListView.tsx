"use client";

import * as React from "react";
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

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
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

  // Initial fetch when mounted, when context changes, or if pods are empty
  React.useEffect(() => {
    if (currentContext && (pods.length === 0 || !hasLoadedPodsOnce)) {
      loadPods();
    }
  }, [currentContext, pods.length, hasLoadedPodsOnce, loadPods]);

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

      // 2. Namespace filter
      if (
        currentNamespace !== "all" &&
        pod.namespace.toLowerCase() !== currentNamespace.toLowerCase()
      ) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "running" && pod.status !== "Running")
          return false;
        if (
          statusFilter === "pending" &&
          pod.status !== "Pending" &&
          pod.status !== "ContainerCreating"
        )
          return false;
        if (
          statusFilter === "failing" &&
          ["Running", "Completed", "Pending", "Succeeded"].includes(pod.status)
        )
          return false;
        if (
          statusFilter === "issues" &&
          pod.restarts === 0 &&
          ["Running", "Completed", "Succeeded"].includes(pod.status)
        )
          return false;
      }

      // 4. Free-text search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = pod.name.toLowerCase().includes(query);
        const matchesNs = pod.namespace.toLowerCase().includes(query);
        const matchesNode = pod.nodeName?.toLowerCase().includes(query);
        const matchesIp = pod.ip?.toLowerCase().includes(query);
        return matchesName || matchesNs || matchesNode || matchesIp;
      }

      return true;
    });
  }, [pods, podNodeFilter, currentNamespace, statusFilter, search]);

  // Sort items
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

  const toggleSelectAll = () => {
    if (selectedItems.size === sortedItems.length && sortedItems.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(
        new Set(sortedItems.map((i) => `${i.namespace}/${i.name}`)),
      );
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
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        pods={pods}
        currentNamespace={currentNamespace}
        sortedItemsCount={sortedItems.length}
        autoRefreshInterval={autoRefreshInterval}
        setAutoRefreshInterval={setAutoRefreshInterval}
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
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)]">
              <tr className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8">
                <th className="w-9 px-3 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
                  >
                    {selectedItems.size === sortedItems.length &&
                    sortedItems.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                    ) : selectedItems.size > 0 ? (
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
              {sortedItems.map((item) => (
                <ResourceTableRow
                  key={`${item.namespace}/${item.name}`}
                  item={item}
                  isSelected={selectedItems.has(
                    `${item.namespace}/${item.name}`,
                  )}
                  density={density}
                  onToggleSelect={toggleSelectItem}
                  onFilterNode={(node) => setPodNodeFilter(node)}
                  onRowClick={(pod) =>
                    openInspector({
                      kind: "Pod",
                      name: pod.name,
                      namespace: pod.namespace,
                      status: pod.status,
                      data: pod as unknown as Record<string, unknown>,
                    })
                  }
                  onLogsClick={(pod) =>
                    openLogsModal({ name: pod.name, namespace: pod.namespace })
                  }
                  onExecClick={(pod) =>
                    openExecModal({ name: pod.name, namespace: pod.namespace })
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

          {sortedItems.length === 0 && (
            <EmptyState
              variant={
                podNodeFilter
                  ? "empty"
                  : search || statusFilter !== "all"
                    ? "search"
                    : "empty"
              }
              title={
                podNodeFilter
                  ? `No pods running on node "${podNodeFilter}"`
                  : search || statusFilter !== "all"
                    ? `No ${resourceType.toLowerCase()} match filter "${search || statusFilter}"`
                    : `No ${resourceType.toLowerCase()} scheduled in "${currentNamespace}"`
              }
              description={
                podNodeFilter
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
          )}
        </div>
      )}

      {/* Footer Status Bar */}
      <div className="h-8 border-t border-[var(--border)] px-4 flex items-center justify-between text-[11px] text-[var(--muted)] bg-[var(--surface)] shrink-0">
        <div>
          Showing{" "}
          <span className="text-[var(--foreground)] font-mono">
            {sortedItems.length}
          </span>{" "}
          of{" "}
          <span className="text-[var(--foreground)] font-mono">
            {podNodeFilter
              ? basePods.length
              : totalPodsCount > 0
                ? totalPodsCount
                : clusterOverview?.totalPods ?? pods.length}
          </span>{" "}
          {podNodeFilter ? (
            <>
              pods on node{" "}
              <strong className="text-[var(--foreground)] font-mono">
                {podNodeFilter}
              </strong>
              {currentNamespace !== "all" && (
                <>
                  {" "}
                  in namespace{" "}
                  <strong className="text-[var(--foreground)] font-mono">
                    {currentNamespace}
                  </strong>
                </>
              )}
            </>
          ) : (
            <>
              items in namespace{" "}
              <strong className="text-[var(--foreground)] font-mono">
                {currentNamespace}
              </strong>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span>Page 1 of 1</span>
          <div className="flex items-center gap-0.5">
            <button
              disabled
              className="p-1 rounded text-[var(--muted)] opacity-50 cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              disabled
              className="p-1 rounded text-[var(--muted)] opacity-50 cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
