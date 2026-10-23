"use client";

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Clock, RefreshCw, ChevronLeft, ChevronRight,
  CheckSquare,
  MinusSquare,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatLabelSelector } from "@/lib/labelSelector";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabStore } from "@/stores/tabStore";
import type { JobSummary } from "@kubeview/contracts";
import { EmptyState, TableSkeleton, Tooltip } from "@/components/ui";
import { JobTableToolbar } from "./components/JobTableToolbar";
import { JobTableRow } from "./components/JobTableRow";
import { BulkWorkloadToolbar } from "@/components/views/shared/BulkWorkloadToolbar";
import { useWorkloadSelection } from "@/components/views/shared/useWorkloadSelection";
import { jobMatchesSearch, jobMatchesStatus, type JobStatusFilter } from "./lib/jobStatus";

type SortField = "name" | "namespace" | "status" | "age";

const getJobKey = (item: JobSummary) =>
  `${item.namespace}/${item.name}`;

export function JobListView() {
  const {
    jobs, totalJobsCount, isJobsLoading, hasLoadedJobsOnce, loadJobs, loadPods,
    openInspector, currentNamespace, currentContext, setCurrentNamespace, setPodNodeFilter, setPodLabelFilter,
    jobOwnerFilter, setJobOwnerFilter, connectionStatus, openKubeconfigModal, autoRefreshInterval,
    openBulkWorkloadAction,
  } = useClusterStore();
  const { openTab } = useTabStore();
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [statusFilter, setStatusFilter] = React.useState<JobStatusFilter>("all");
  const [sortField, setSortField] = React.useState<SortField>("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const defaultPageSize = useSettingsStore((s) => s.defaultPageSize);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);
  React.useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => setCurrentPage(1), [deferredSearch, statusFilter, currentNamespace, pageSize, jobOwnerFilter]);
  React.useEffect(() => {
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(() => loadJobs(currentNamespace), autoRefreshInterval);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, currentContext, currentNamespace, loadJobs]);

  const handleRefresh = () => { loadJobs(currentNamespace); toast.info("Refreshed Job telemetry"); };
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const baseJobs = React.useMemo(() => currentNamespace === "all" ? jobs : jobs.filter((job) => job.namespace.toLowerCase() === currentNamespace.toLowerCase()), [jobs, currentNamespace]);
  const ownerFiltered = React.useMemo(() => jobOwnerFilter ? baseJobs.filter((job) => job.ownerCronJob === jobOwnerFilter) : baseJobs, [baseJobs, jobOwnerFilter]);
  const filteredItems = React.useMemo(() => ownerFiltered.filter((job) => jobMatchesStatus(job, statusFilter) && jobMatchesSearch(job, deferredSearch.trim().toLowerCase())), [ownerFiltered, statusFilter, deferredSearch]);
  const sortedItems = React.useMemo(() => [...filteredItems].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "name": comparison = a.name.localeCompare(b.name); break;
      case "namespace": comparison = a.namespace.localeCompare(b.namespace); break;
      case "status": comparison = a.status.localeCompare(b.status); break;
      case "age": comparison = a.creationTimestamp.localeCompare(b.creationTimestamp); break;
    }
    return sortAsc ? comparison : -comparison;
  }), [filteredItems, sortField, sortAsc]);
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sortedItems.length / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = React.useMemo(() => pageSize <= 0 ? sortedItems : sortedItems.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize), [sortedItems, safeCurrentPage, pageSize]);

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
    toast.info(selector ? `Filtered pods by job '${job.name}'` : `Opened pods in namespace '${job.namespace}'`);
  };

  const renderSortIndicator = (field: SortField) => sortField === field ? (sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />;
  const isFiltered = search.trim() !== "" || statusFilter !== "all" || Boolean(jobOwnerFilter);
  const total = totalJobsCount || jobs.length;

  if (connectionStatus === "offline") {
    return <div className="flex-1 flex items-center justify-center p-8 select-none"><EmptyState variant="empty" title="No Cluster Connected" description="Connect or import a kubeconfig file to view and manage live jobs." action={{ label: "Import Kubeconfig", icon: <Clock className="w-4 h-4" />, onClick: () => openKubeconfigModal("browse") }} /></div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <JobTableToolbar search={search} setSearch={setSearch} jobs={jobs} currentNamespace={currentNamespace} statusFilter={statusFilter} setStatusFilter={setStatusFilter} sortedItemsCount={sortedItems.length} handleRefresh={handleRefresh} isLoading={isJobsLoading} />
      {jobOwnerFilter && (
        <div className="h-9 border-b border-[var(--border)] px-3 flex items-center justify-between gap-3 bg-amber-500/5 text-[11px] font-mono text-amber-700 dark:text-amber-400 shrink-0">
          <span>Showing jobs owned by CronJob <strong className="font-semibold">{jobOwnerFilter}</strong></span>
          <button type="button" onClick={() => setJobOwnerFilter(null)} className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">Clear owner filter</button>
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
      {!hasLoadedJobsOnce || (isJobsLoading && filteredItems.length === 0) ? <TableSkeleton rows={8} columns={8} /> : sortedItems.length === 0 ? (
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
          <EmptyState
            variant={isFiltered ? "search" : "empty"}
            title={jobOwnerFilter ? `No Jobs for CronJob "${jobOwnerFilter}"` : isFiltered ? `No jobs match filter "${search || statusFilter}"` : currentNamespace !== "all" ? `No jobs in "${currentNamespace}"` : "No Jobs Found"}
            description={jobOwnerFilter ? `The selected CronJob has no retained Job history in ${currentNamespace === "all" ? "the cluster" : `namespace "${currentNamespace}"`}.` : isFiltered ? "No Job matches the active search or status filter." : currentNamespace !== "all" ? `Namespace "${currentNamespace}" has no Jobs. ${jobs.length} Jobs are active in other namespaces.` : "Jobs run pods to completion. They are created manually or by a CronJob."}
            scopeBadge={isFiltered ? (search ? `Query: "${search}"` : `Status: ${statusFilter}`) : `Namespace: ${currentNamespace}`}
            action={isFiltered ? { label: "Clear Filters", icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: () => { setSearch(""); setStatusFilter("all"); setJobOwnerFilter(null); } } : { label: "Reload Jobs", icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: () => loadJobs(currentNamespace) }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full min-w-[860px] text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] select-none"><tr className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8">
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

              <th onClick={() => handleSort("name")} className="w-52 sm:w-60 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"><div className="flex items-center gap-1"><span>Name</span>{renderSortIndicator("name")}</div></th>
              <th onClick={() => handleSort("namespace")} className="w-24 sm:w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"><div className="flex items-center gap-1"><span>Namespace</span>{renderSortIndicator("namespace")}</div></th>
              <th onClick={() => handleSort("status")} className="w-24 sm:w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"><div className="flex items-center gap-1"><span>Status</span>{renderSortIndicator("status")}</div></th>
              <th className="w-24 py-1 px-3">Completions</th><th className="w-20 py-1 px-3">Duration</th><th className="w-40 py-1 px-3">Owner</th>
              <th onClick={() => handleSort("age")} className="w-14 sm:w-16 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"><div className="flex items-center gap-1"><span>Age</span>{renderSortIndicator("age")}</div></th><th className="w-9 py-1 px-2 text-right" aria-label="Actions"></th>
            </tr></thead>
            <tbody className="divide-y divide-[var(--border)]">{paginatedItems.map((item) => <JobTableRow key={`${item.namespace}/${item.name}`} item={item} isSelected={selection.selectedItems.has(getJobKey(item))} onToggleSelect={selection.toggleSelectItem} onViewPods={handleViewPods} onRowClick={(job) => openInspector({ kind: "Job", name: job.name, namespace: job.namespace, status: job.status, data: job as unknown as Record<string, unknown> })} />)}</tbody>
          </table>
        </div>
      )}
      <div className="min-h-10 border-t border-[var(--border)] px-2 sm:px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-[var(--muted)] bg-[var(--surface)]/90 backdrop-blur-xs shrink-0 gap-2 sm:gap-4">
        <div className="flex min-w-0 max-w-full items-center gap-2 truncate"><span>Showing <span className="text-[var(--foreground)] font-mono font-medium">{sortedItems.length === 0 ? "0" : pageSize > 0 ? `${(safeCurrentPage - 1) * pageSize + 1}–${Math.min(safeCurrentPage * pageSize, sortedItems.length)}` : `1–${sortedItems.length}`}</span> of <span className="text-[var(--foreground)] font-mono font-medium">{sortedItems.length}</span> items</span><span className="text-[var(--muted)]/40">·</span><span className="font-mono">{currentNamespace}</span>{currentNamespace !== "all" && <><span className="text-[var(--muted)]/40">·</span><span className="text-[10px]">{total} total jobs</span></>}</div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:gap-4"><div className="flex items-center gap-1.5"><span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">Rows:</span><div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/[0.04] p-0.5">{[50, 100, 250, 0].map((size) => <button key={size} type="button" aria-pressed={pageSize === size} data-testid={`page-size-${size}`} onClick={() => { setPageSize(size); setCurrentPage(1); }} className={cn("px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer", pageSize === size ? "bg-[var(--surface-active)] dark:bg-white/10 text-[var(--foreground)] font-semibold" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>{size === 0 ? "All" : size}</button>)}</div></div>{pageSize > 0 && totalPages > 1 && <div className="flex items-center gap-1"><span className="font-mono">{safeCurrentPage}/{totalPages}</span><Tooltip content="Previous page" disabled={safeCurrentPage <= 1}><button disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer" aria-label="Previous page"><ChevronLeft className="w-3.5 h-3.5" /></button></Tooltip><Tooltip content="Next page" disabled={safeCurrentPage >= totalPages}><button disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] disabled:opacity-25 disabled:pointer-events-none cursor-pointer" aria-label="Next page"><ChevronRight className="w-3.5 h-3.5" /></button></Tooltip></div>}</div>
      </div>
    </div>
  );
}
