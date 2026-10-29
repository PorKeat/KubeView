"use client";

import * as React from "react";
import { Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatLabelSelector } from "@/lib/labelSelector";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabStore } from "@/stores/tabStore";
import type { JobSummary } from "@kubeview/contracts";
import { EmptyState, TableSkeleton } from "@/components/ui";
import { JobTableToolbar } from "./components/JobTableToolbar";
import { JobTableRow } from "./components/JobTableRow";
import { JobEmptyState } from "./components/JobEmptyState";
import { JobListFooter } from "./components/JobListFooter";
import { JobTableHeader, type JobSortField } from "./components/JobTableHeader";
import { BulkWorkloadToolbar } from "@/components/views/shared/BulkWorkloadToolbar";
import { useWorkloadSelection } from "@/components/views/shared/useWorkloadSelection";
import {
  jobMatchesSearch,
  jobMatchesStatus,
  type JobStatusFilter,
} from "./lib/jobStatus";

const getJobKey = (item: JobSummary) => `${item.namespace}/${item.name}`;

export function JobListView() {
  const {
    jobs,
    totalJobsCount,
    isJobsLoading,
    hasLoadedJobsOnce,
    loadJobs,
    loadPods,
    openInspector,
    currentNamespace,
    currentContext,
    setCurrentNamespace,
    setPodNodeFilter,
    setPodLabelFilter,
    jobOwnerFilter,
    setJobOwnerFilter,
    connectionStatus,
    openKubeconfigModal,
    autoRefreshInterval,
    openBulkWorkloadAction,
  } = useClusterStore();
  const { openTab } = useTabStore();
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [statusFilter, setStatusFilter] =
    React.useState<JobStatusFilter>("all");
  const [sortField, setSortField] = React.useState<JobSortField>("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const defaultPageSize = useSettingsStore((s) => s.defaultPageSize);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);
  React.useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(
    () => setCurrentPage(1),
    [deferredSearch, statusFilter, currentNamespace, pageSize, jobOwnerFilter],
  );
  React.useEffect(() => {
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(
      () => loadJobs(currentNamespace),
      autoRefreshInterval,
    );
    return () => clearInterval(timer);
  }, [autoRefreshInterval, currentContext, currentNamespace, loadJobs]);

  const handleRefresh = () => {
    loadJobs(currentNamespace);
    toast.info("Refreshed Job telemetry");
  };
  const handleSort = (field: JobSortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const baseJobs = React.useMemo(
    () =>
      currentNamespace === "all"
        ? jobs
        : jobs.filter(
            (job) =>
              job.namespace.toLowerCase() === currentNamespace.toLowerCase(),
          ),
    [jobs, currentNamespace],
  );
  const ownerFiltered = React.useMemo(
    () =>
      jobOwnerFilter
        ? baseJobs.filter((job) => job.ownerCronJob === jobOwnerFilter)
        : baseJobs,
    [baseJobs, jobOwnerFilter],
  );
  const filteredItems = React.useMemo(
    () =>
      ownerFiltered.filter(
        (job) =>
          jobMatchesStatus(job, statusFilter) &&
          jobMatchesSearch(job, deferredSearch.trim().toLowerCase()),
      ),
    [ownerFiltered, statusFilter, deferredSearch],
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

  const selection = useWorkloadSelection(jobs, paginatedItems, getJobKey);

  const openBulkDelete = () => {
    if (selection.selectedObjects.length === 0) return;
    openBulkWorkloadAction({
      kind: "Job",
      action: "delete",
      targets: selection.selectedObjects.map((item) => ({
        name: item.name,
        namespace: item.namespace,
      })),
      onCompleted: selection.clearSelection,
    });
  };

  const handleViewPods = (job: JobSummary) => {
    const selector = formatLabelSelector(job.selector);
    setCurrentNamespace(job.namespace);
    setPodNodeFilter(null);
    setPodLabelFilter(selector || null, `Job: ${job.name}`);
    loadPods(job.namespace);
    openTab({ id: "pods", title: "Pods", closable: true });
    toast.info(
      selector
        ? `Filtered pods by job '${job.name}'`
        : `Opened pods in namespace '${job.namespace}'`,
    );
  };

  const isFiltered =
    search.trim() !== "" || statusFilter !== "all" || Boolean(jobOwnerFilter);
  const total = totalJobsCount || jobs.length;

  if (connectionStatus === "offline") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none">
        <EmptyState
          variant="empty"
          title="No Cluster Connected"
          description="Connect or import a kubeconfig file to view and manage live jobs."
          action={{
            label: "Import Kubeconfig",
            icon: <Clock className="w-4 h-4" />,
            onClick: () => openKubeconfigModal("browse"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <JobTableToolbar
        search={search}
        setSearch={setSearch}
        jobs={jobs}
        currentNamespace={currentNamespace}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortedItemsCount={sortedItems.length}
        handleRefresh={handleRefresh}
        isLoading={isJobsLoading}
      />
      {jobOwnerFilter && (
        <div className="h-9 border-b border-[var(--border)] px-3 flex items-center justify-between gap-3 bg-amber-500/5 text-[11px] font-mono text-amber-700 dark:text-amber-400 shrink-0">
          <span>
            Showing jobs owned by CronJob{" "}
            <strong className="font-semibold">{jobOwnerFilter}</strong>
          </span>
          <button
            type="button"
            onClick={() => setJobOwnerFilter(null)}
            className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
          >
            Clear owner filter
          </button>
        </div>
      )}
      <BulkWorkloadToolbar
        selectedCount={selection.selectedItems.size}
        noun="Job"
        pluralNoun="Jobs"
        onClear={selection.clearSelection}
        actions={[
          {
            id: "delete",
            label: "Delete Selected",
            icon: Trash2,
            tone: "danger",
            onClick: openBulkDelete,
          },
        ]}
      />
      {!hasLoadedJobsOnce || (isJobsLoading && filteredItems.length === 0) ? (
        <TableSkeleton rows={8} columns={8} />
      ) : sortedItems.length === 0 ? (
        <JobEmptyState
          jobOwnerFilter={jobOwnerFilter}
          isFiltered={isFiltered}
          search={search}
          statusFilter={statusFilter}
          currentNamespace={currentNamespace}
          jobsCount={jobs.length}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
            setJobOwnerFilter(null);
          }}
          onReload={() => loadJobs(currentNamespace)}
        />
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <JobTableHeader
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
                <JobTableRow
                  key={`${item.namespace}/${item.name}`}
                  item={item}
                  isSelected={selection.selectedItems.has(getJobKey(item))}
                  onToggleSelect={selection.toggleSelectItem}
                  onViewPods={handleViewPods}
                  onRowClick={(job) =>
                    openInspector({
                      kind: "Job",
                      name: job.name,
                      namespace: job.namespace,
                      status: job.status,
                      data: job as unknown as Record<string, unknown>,
                    })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <JobListFooter
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        safeCurrentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        sortedItemsCount={sortedItems.length}
        totalJobs={total}
        currentNamespace={currentNamespace}
      />
    </div>
  );
}
