"use client";

import * as React from "react";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { formatLabelSelector } from "@/lib/labelSelector";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabStore } from "@/stores/tabStore";
import type { DeploymentSummary } from "@kubeview/contracts";
import { TableSkeleton, EmptyState } from "@/components/ui";
import { useResourceActions } from "@/components/views/shared/useResourceActions";

import { DeploymentTableToolbar } from "./components/DeploymentTableToolbar";
import { DeploymentBatchToolbar } from "./components/DeploymentBatchToolbar";
import { DeploymentNamespaceBanner } from "./components/DeploymentNamespaceBanner";
import { DeploymentTableRow } from "./components/DeploymentTableRow";
import { DeploymentEmptyState } from "./components/DeploymentEmptyState";
import { DeploymentPaginationFooter } from "./components/DeploymentPaginationFooter";
import {
  DeploymentTableHeader,
  type DeploymentSortField,
} from "./components/DeploymentTableHeader";
import {
  deploymentMatchesSearch,
  deploymentMatchesStatus,
  type DeploymentStatusFilter,
} from "./lib/deploymentStatus";

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
  const { createResource } = useResourceActions();

  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [statusFilter, setStatusFilter] =
    React.useState<DeploymentStatusFilter>("all");
  const [sortField, setSortField] = React.useState<DeploymentSortField>("name");
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

  const handleSort = (field: DeploymentSortField) => {
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
        onCreate={() => createResource("Deployment", currentNamespace)}
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
        <DeploymentEmptyState
          statusFilter={statusFilter}
          search={search}
          isFiltered={isFiltered}
          currentNamespace={currentNamespace}
          scopedDeploymentCount={scopedDeploymentCount}
          deploymentCount={deployments.length}
          namespaceCounts={namespaceCounts}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          onSelectNamespace={setCurrentNamespace}
          onReload={() => loadDeployments(currentNamespace)}
        />
      ) : (
        <div
          data-tour="deployments-table"
          className="flex-1 overflow-auto min-h-0"
        >
          <table className="w-full min-w-[1000px] text-left text-xs border-collapse table-fixed">
            <DeploymentTableHeader
              sortField={sortField}
              sortAsc={sortAsc}
              onSort={handleSort}
              selectedItemsCount={selectedItems.size}
              isPageAllSelected={isPageAllSelected}
              isPageSomeSelected={isPageSomeSelected}
              onToggleSelectAll={toggleSelectAll}
            />
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

      <DeploymentPaginationFooter
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        safeCurrentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        sortedItemsCount={sortedItems.length}
        scopedDeploymentCount={scopedDeploymentCount}
        clusterDeploymentCount={clusterDeploymentCount}
        currentNamespace={currentNamespace}
      />
    </div>
  );
}
