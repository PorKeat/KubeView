"use client";

import { sortableHeaderProps } from "@/lib/sortableHeader";

import * as React from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { CronJobSummary } from "@kubeview/contracts";
import { EmptyState, TableSkeleton, Tooltip } from "@/components/ui";
import { CronJobTableToolbar } from "./components/CronJobTableToolbar";
import { CronJobTableRow } from "./components/CronJobTableRow";
import {
  cronJobMatchesSearch,
  cronJobMatchesStatus,
  type CronJobStatusFilter,
} from "./lib/cronJobStatus";

type SortField = "name" | "namespace" | "status" | "age";

export function CronJobListView() {
  const {
    cronJobs,
    totalCronJobsCount,
    isCronJobsLoading,
    hasLoadedCronJobsOnce,
    loadCronJobs,
    loadJobs,
    openInspector,
    currentNamespace,
    currentContext,
    setJobOwnerFilter,
    setJobsViewMode,
    connectionStatus,
    openKubeconfigModal,
    autoRefreshInterval,
  } = useClusterStore();
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [statusFilter, setStatusFilter] =
    React.useState<CronJobStatusFilter>("all");
  const [sortField, setSortField] = React.useState<SortField>("name");
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
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(
      () => loadCronJobs(currentNamespace),
      autoRefreshInterval,
    );
    return () => clearInterval(timer);
  }, [autoRefreshInterval, currentContext, currentNamespace, loadCronJobs]);

  const handleRefresh = () => {
    loadCronJobs(currentNamespace);
    toast.info("Refreshed CronJob telemetry");
  };
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };
  const baseCronJobs = React.useMemo(
    () =>
      currentNamespace === "all"
        ? cronJobs
        : cronJobs.filter(
            (cj) =>
              cj.namespace.toLowerCase() === currentNamespace.toLowerCase(),
          ),
    [cronJobs, currentNamespace],
  );
  const filteredItems = React.useMemo(
    () =>
      baseCronJobs.filter(
        (cj) =>
          cronJobMatchesStatus(cj, statusFilter) &&
          cronJobMatchesSearch(cj, deferredSearch.trim().toLowerCase()),
      ),
    [baseCronJobs, statusFilter, deferredSearch],
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
  const paginatedItems = React.useMemo(
    () =>
      pageSize <= 0
        ? sortedItems
        : sortedItems.slice(
            (safeCurrentPage - 1) * pageSize,
            safeCurrentPage * pageSize,
          ),
    [sortedItems, safeCurrentPage, pageSize],
  );

  const handleViewJobs = (cronJob: CronJobSummary) => {
    setJobOwnerFilter(cronJob.name);
    setJobsViewMode("jobs");
    loadJobs(currentNamespace);
    toast.info(`Showing Jobs owned by CronJob '${cronJob.name}'`);
  };

  const renderSortIndicator = (field: SortField) =>
    sortField === field ? (
      sortAsc ? (
        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
      ) : (
        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
      )
    ) : (
      <ArrowUpDown className="w-3 h-3 opacity-30" />
    );
  const isFiltered = search.trim() !== "" || statusFilter !== "all";
  const total = totalCronJobsCount || cronJobs.length;

  if (connectionStatus === "offline") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none">
        <EmptyState
          variant="empty"
          title="No Cluster Connected"
          description="Connect or import a kubeconfig file to view and manage live cronjobs."
          action={{
            label: "Import Kubeconfig",
            icon: <Calendar className="w-4 h-4" />,
            onClick: () => openKubeconfigModal("browse"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <CronJobTableToolbar
        search={search}
        setSearch={setSearch}
        cronJobs={cronJobs}
        currentNamespace={currentNamespace}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortedItemsCount={sortedItems.length}
        handleRefresh={handleRefresh}
        isLoading={isCronJobsLoading}
      />
      {!hasLoadedCronJobsOnce ||
      (isCronJobsLoading && filteredItems.length === 0) ? (
        <TableSkeleton rows={8} columns={9} />
      ) : sortedItems.length === 0 ? (
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
          <EmptyState
            variant={isFiltered ? "search" : "empty"}
            title={
              isFiltered
                ? `No cronjobs match filter "${search || statusFilter}"`
                : currentNamespace !== "all"
                  ? `No cronjobs in "${currentNamespace}"`
                  : "No CronJobs Found"
            }
            description={
              isFiltered
                ? "No CronJob matches the active search or status filter."
                : currentNamespace !== "all"
                  ? `Namespace "${currentNamespace}" has no CronJobs. ${cronJobs.length} CronJobs are active in other namespaces.`
                  : "CronJobs create Jobs on a schedule. Suspend or trigger them independently."
            }
            scopeBadge={
              isFiltered
                ? search
                  ? `Query: "${search}"`
                  : `Status: ${statusFilter}`
                : `Namespace: ${currentNamespace}`
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
                : {
                    label: "Reload CronJobs",
                    icon: <RefreshCw className="w-3.5 h-3.5" />,
                    onClick: () => loadCronJobs(currentNamespace),
                  }
            }
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full min-w-[920px] text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] select-none">
              <tr className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8">
                <th
                  {...sortableHeaderProps({
                    field: "name",
                    activeField: sortField,
                    ascending: sortAsc,
                    onSort: handleSort,
                  })}
                  className="w-48 sm:w-56 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Name</span>
                    {renderSortIndicator("name")}
                  </div>
                </th>
                <th
                  {...sortableHeaderProps({
                    field: "namespace",
                    activeField: sortField,
                    ascending: sortAsc,
                    onSort: handleSort,
                  })}
                  className="w-24 sm:w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Namespace</span>
                    {renderSortIndicator("namespace")}
                  </div>
                </th>
                <th
                  {...sortableHeaderProps({
                    field: "status",
                    activeField: sortField,
                    ascending: sortAsc,
                    onSort: handleSort,
                  })}
                  className="w-24 sm:w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                <th className="w-36 py-1 px-3">Schedule</th>
                <th className="w-20 py-1 px-3">Suspended</th>
                <th className="w-16 py-1 px-3">Active</th>
                <th className="w-36 py-1 px-3">Last Schedule</th>
                <th
                  {...sortableHeaderProps({
                    field: "age",
                    activeField: sortField,
                    ascending: sortAsc,
                    onSort: handleSort,
                  })}
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
                <CronJobTableRow
                  key={`${item.namespace}/${item.name}`}
                  item={item}
                  onViewJobs={handleViewJobs}
                  onRowClick={(cj) =>
                    openInspector({
                      kind: "CronJob",
                      name: cj.name,
                      namespace: cj.namespace,
                      status: cj.status,
                      data: cj as unknown as Record<string, unknown>,
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
                  ? `${(safeCurrentPage - 1) * pageSize + 1}–${Math.min(safeCurrentPage * pageSize, sortedItems.length)}`
                  : `1–${sortedItems.length}`}
            </span>{" "}
            of{" "}
            <span className="text-[var(--foreground)] font-mono font-medium">
              {sortedItems.length}
            </span>{" "}
            items
          </span>
          <span className="text-[var(--muted)]/40">·</span>
          <span className="font-mono">{currentNamespace}</span>
          {currentNamespace !== "all" && (
            <>
              <span className="text-[var(--muted)]/40">·</span>
              <span className="text-[10px]">{total} total cronjobs</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">
              Rows:
            </span>
            <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/[0.04] p-0.5">
              {[50, 100, 250, 0].map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={pageSize === size}
                  data-testid={`page-size-${size}`}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer",
                    pageSize === size
                      ? "bg-[var(--surface-active)] dark:bg-white/10 text-[var(--foreground)] font-semibold"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {size === 0 ? "All" : size}
                </button>
              ))}
            </div>
          </div>
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <span className="font-mono">
                {safeCurrentPage}/{totalPages}
              </span>
              <Tooltip content="Previous page" disabled={safeCurrentPage <= 1}>
                <button
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip
                content="Next page"
                disabled={safeCurrentPage >= totalPages}
              >
                <button
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
