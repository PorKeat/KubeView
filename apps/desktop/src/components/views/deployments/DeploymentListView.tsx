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
  Layers,
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
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabStore } from "@/stores/tabStore";
import type { DeploymentSummary } from "@kubeview/contracts";
import { TableSkeleton, EmptyState, Tooltip } from "@/components/ui";

import { DeploymentTableToolbar } from "./components/DeploymentTableToolbar";
import { DeploymentBatchToolbar } from "./components/DeploymentBatchToolbar";
import { DeploymentNamespaceBanner } from "./components/DeploymentNamespaceBanner";
import { DeploymentTableRow } from "./components/DeploymentTableRow";
import {
  deploymentMatchesSearch,
  deploymentMatchesStatus,
  type DeploymentStatusFilter,
} from "./lib/deploymentStatus";

type SortField = "name" | "namespace" | "status" | "ready" | "age";

export function DeploymentListView() {
  const {
    deployments,
    totalDeploymentsCount,
    isDeploymentsLoading,
    hasLoadedDeploymentsOnce,
    loadDeployments,
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
  } = useClusterStore();
  const { openTab } = useTabStore();

  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [statusFilter, setStatusFilter] =
    React.useState<DeploymentStatusFilter>("all");
  const [sortField, setSortField] = React.useState<SortField>("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(
    new Set(),
  );
  const defaultPageSize = useSettingsStore((s) => s.defaultPageSize);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);
  React.useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, statusFilter, currentNamespace, pageSize]);

  // Load on mount and whenever the active context or namespace scope changes.
  React.useEffect(() => {
    if (currentContext) {
      loadDeployments(currentNamespace);
    }
  }, [currentContext, currentNamespace, loadDeployments]);

  React.useEffect(() => {
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(() => {
      loadDeployments(currentNamespace);
    }, autoRefreshInterval);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, currentContext, currentNamespace, loadDeployments]);

  const handleRefresh = () => {
    loadDeployments(currentNamespace);
    toast.info("Refreshed deployment telemetry");
  };

  const handleSort = (field: SortField) => {
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

  const namespaceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const deployment of deployments) {
      counts[deployment.namespace] = (counts[deployment.namespace] || 0) + 1;
    }
    return counts;
  }, [deployments]);

  const baseDeployments = React.useMemo(() => {
    if (currentNamespace === "all") return deployments;
    return deployments.filter(
      (deployment) =>
        deployment.namespace.toLowerCase() === currentNamespace.toLowerCase(),
    );
  }, [deployments, currentNamespace]);

  const filteredItems = React.useMemo(() => {
    return baseDeployments.filter(
      (deployment) =>
        deploymentMatchesStatus(deployment, statusFilter) &&
        deploymentMatchesSearch(
          deployment,
          deferredSearch.trim().toLowerCase(),
        ),
    );
  }, [baseDeployments, statusFilter, deferredSearch]);

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

  const isPageAllSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) =>
      selectedItems.has(`${item.namespace}/${item.name}`),
    );
  const isPageSomeSelected =
    !isPageAllSelected &&
    paginatedItems.some((item) =>
      selectedItems.has(`${item.namespace}/${item.name}`),
    );

  const toggleSelectAll = () => {
    const next = new Set(selectedItems);
    if (isPageAllSelected) {
      paginatedItems.forEach((item) =>
        next.delete(`${item.namespace}/${item.name}`),
      );
    } else {
      paginatedItems.forEach((item) =>
        next.add(`${item.namespace}/${item.name}`),
      );
    }
    setSelectedItems(next);
  };

  const handleViewPods = (deployment: DeploymentSummary) => {
    const selector = formatLabelSelector(deployment.selector);
    setCurrentNamespace(deployment.namespace);
    setPodNodeFilter(null);
    setPodLabelFilter(selector || null, `Deployment: ${deployment.name}`);
    loadPods(deployment.namespace);
    openTab({ id: "pods", title: "Pods", closable: true });
    toast.info(
      selector
        ? `Filtered pods by deployment '${deployment.name}'`
        : `Opened pods in namespace '${deployment.namespace}'`,
    );
  };

  const selectedDeployments = React.useMemo(
    () =>
      deployments.filter((deployment) =>
        selectedItems.has(`${deployment.namespace}/${deployment.name}`),
      ),
    [deployments, selectedItems],
  );

  const handleBatchViewPods = () => {
    const first = selectedDeployments[0];
    if (first) {
      handleViewPods(first);
    }
  };

  const handleCopyRestartCommands = () => {
    if (selectedDeployments.length === 0) return;
    const commands = selectedDeployments
      .map(
        (deployment) =>
          `kubectl rollout restart deployment/${deployment.name} -n ${deployment.namespace}`,
      )
      .join("\n");
    navigator.clipboard.writeText(commands);
    toast.success(
      `Copied ${selectedDeployments.length} rollout restart command${
        selectedDeployments.length > 1 ? "s" : ""
      }`,
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

  const clusterDeploymentCount = totalDeploymentsCount || deployments.length;
  const isFiltered = search.trim() !== "" || statusFilter !== "all";
  const scopedDeploymentCount =
    currentNamespace === "all"
      ? deployments.length
      : namespaceCounts[currentNamespace] || 0;

  if (connectionStatus === "offline") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none">
        <EmptyState
          variant="empty"
          title="No Cluster Connected"
          description="Connect or import a kubeconfig file to view and manage live deployments."
          action={{
            label: "Import Kubeconfig",
            icon: <Layers className="w-4 h-4" />,
            onClick: () => openKubeconfigModal("browse"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <DeploymentTableToolbar
        search={search}
        setSearch={setSearch}
        deployments={deployments}
        currentNamespace={currentNamespace}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortedItemsCount={sortedItems.length}
        handleRefresh={handleRefresh}
        isLoading={isDeploymentsLoading}
      />

      <DeploymentNamespaceBanner
        currentNamespace={currentNamespace}
        filteredItemsCount={filteredItems.length}
        totalDeploymentsCount={deployments.length}
        search={search}
        namespaceCounts={namespaceCounts}
        setCurrentNamespace={setCurrentNamespace}
      />

      <DeploymentBatchToolbar
        selectedItemsCount={selectedItems.size}
        onViewPods={handleBatchViewPods}
        onCopyRestartCommands={handleCopyRestartCommands}
        onClearSelection={() => setSelectedItems(new Set())}
      />

      {!hasLoadedDeploymentsOnce ||
      (isDeploymentsLoading && filteredItems.length === 0) ? (
        <TableSkeleton rows={10} columns={10} />
      ) : sortedItems.length === 0 ? (
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
          <EmptyState
            variant={
              (statusFilter === "degraded" || statusFilter === "progressing") &&
              !search
                ? "healthy"
                : isFiltered
                  ? "search"
                  : "empty"
            }
            title={
              statusFilter === "degraded" && !search
                ? "All Deployments Healthy"
                : statusFilter === "progressing" && !search
                  ? "All Rollouts Complete"
                  : statusFilter === "paused" && !search
                    ? "No Paused Deployments"
                    : isFiltered
                      ? `No deployments match filter "${search || statusFilter}"`
                      : currentNamespace !== "all"
                        ? `No deployments in "${currentNamespace}"`
                        : "No Deployments Found"
            }
            description={
              statusFilter === "degraded" && !search
                ? `All ${scopedDeploymentCount} deployments in ${
                    currentNamespace === "all"
                      ? "all cluster namespaces"
                      : `namespace "${currentNamespace}"`
                  } have satisfied their availability conditions.`
                : statusFilter === "progressing" && !search
                  ? `Zero active rollouts. All ${scopedDeploymentCount} deployments in ${
                      currentNamespace === "all"
                        ? "all cluster namespaces"
                        : `namespace "${currentNamespace}"`
                    } have converged on their desired replica count.`
                  : isFiltered
                    ? `0 of ${scopedDeploymentCount} deployments in ${
                        currentNamespace === "all"
                          ? "all namespaces"
                          : `namespace "${currentNamespace}"`
                      } match your active search or rollout status criteria.`
                    : currentNamespace !== "all"
                      ? `Namespace "${currentNamespace}" currently holds zero deployments. ${deployments.length} deployments are active in other namespaces.`
                      : "No deployments are present in the connected cluster. Create one to begin tracking rollout health."
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
                      label: `View All Namespaces (${deployments.length})`,
                      icon: <Globe className="w-3.5 h-3.5" />,
                      onClick: () => setCurrentNamespace("all"),
                    }
                  : {
                      label: "Reload Deployments",
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      onClick: () => loadDeployments(currentNamespace),
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
                      label: "Reload Deployments",
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      onClick: () => loadDeployments(currentNamespace),
                    }
                  : undefined
            }
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full min-w-[1000px] text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] select-none">
              <tr className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8">
                <th className="w-8 px-2 text-center">
                  <Tooltip
                    content={
                      isPageAllSelected
                        ? "Deselect all on page"
                        : "Select all on page"
                    }
                  >
                    <button
                      onClick={toggleSelectAll}
                      className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
                      aria-label={
                        isPageAllSelected
                          ? "Deselect all on page"
                          : "Select all on page"
                      }
                    >
                      {isPageAllSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                      ) : isPageSomeSelected || selectedItems.size > 0 ? (
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
                <th className="w-24 py-1 px-3">Up-to-date</th>
                <th className="w-24 py-1 px-3">Available</th>
                <th className="w-28 py-1 px-3">Strategy</th>
                <th
                  onClick={() => handleSort("age")}
                  className="w-14 sm:w-16 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Age</span>
                    {renderSortIndicator("age")}
                  </div>
                </th>
                <th
                  className="w-9 py-1 px-2 text-right"
                  aria-label="Actions"
                ></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedItems.map((item) => (
                <DeploymentTableRow
                  key={`${item.namespace}/${item.name}`}
                  item={item}
                  isSelected={selectedItems.has(
                    `${item.namespace}/${item.name}`,
                  )}
                  onToggleSelect={toggleSelectItem}
                  onViewPods={handleViewPods}
                  onRowClick={(deployment) =>
                    openInspector({
                      kind: "Deployment",
                      name: deployment.name,
                      namespace: deployment.namespace,
                      status: deployment.status,
                      data: deployment as unknown as Record<string, unknown>,
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
          {sortedItems.length !== scopedDeploymentCount && (
            <span className="text-[10px] text-[var(--muted)] opacity-70">
              (filtered from {scopedDeploymentCount} total)
            </span>
          )}
          {currentNamespace !== "all" && (
            <>
              <span className="text-[var(--muted)]/40">·</span>
              <span className="text-[10px] text-[var(--muted)]">
                {clusterDeploymentCount} total deployments
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
                        layoutId="deploymentPageSizeIndicator"
                        className="absolute inset-0 rounded-md bg-[var(--surface-active)] dark:bg-white/10 shadow-xs border border-[var(--border)]/60"
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 32,
                          mass: 0.8,
                        }}
                      />
                    )}
                    <span className="relative z-10">
                      {size === 0 ? "All" : size}
                    </span>
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

                <Tooltip
                  content="Previous page"
                  disabled={safeCurrentPage <= 1}
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    disabled={safeCurrentPage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </motion.button>
                </Tooltip>

                <Tooltip
                  content="Next page"
                  disabled={safeCurrentPage >= totalPages}
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </motion.button>
                </Tooltip>

                <Tooltip
                  content="Last page"
                  disabled={safeCurrentPage >= totalPages}
                >
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
