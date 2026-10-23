"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ArrowUpDown, ArrowUp, ArrowDown, Cpu, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Globe,
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
import type { DaemonSetSummary } from "@kubeview/contracts";
import { TableSkeleton, EmptyState, Tooltip } from "@/components/ui";
import { DaemonSetTableToolbar } from "./components/DaemonSetTableToolbar";
import { DaemonSetTableRow } from "./components/DaemonSetTableRow";
import { BulkWorkloadToolbar } from "@/components/views/shared/BulkWorkloadToolbar";
import { useWorkloadSelection } from "@/components/views/shared/useWorkloadSelection";
import { daemonSetMatchesSearch, daemonSetMatchesStatus, type DaemonSetStatusFilter } from "./lib/daemonSetStatus";

type SortField = "name" | "namespace" | "status" | "ready" | "age";

const getDaemonSetKey = (item: DaemonSetSummary) =>
  `${item.namespace}/${item.name}`;

export function DaemonSetListView() {
  const {
    daemonSets, totalDaemonSetsCount, isDaemonSetsLoading, hasLoadedDaemonSetsOnce,
    loadDaemonSets, loadPods, openInspector, currentNamespace, currentContext,
    setCurrentNamespace, setPodNodeFilter, setPodLabelFilter, connectionStatus,
    openKubeconfigModal, autoRefreshInterval,
    openBulkWorkloadAction,
  } = useClusterStore();
  const { openTab } = useTabStore();

  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [statusFilter, setStatusFilter] = React.useState<DaemonSetStatusFilter>("all");
  const [sortField, setSortField] = React.useState<SortField>("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const defaultPageSize = useSettingsStore((s) => s.defaultPageSize);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);
  React.useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => setCurrentPage(1), [deferredSearch, statusFilter, currentNamespace, pageSize]);
  React.useEffect(() => { if (currentContext) loadDaemonSets(currentNamespace); }, [currentContext, currentNamespace, loadDaemonSets]);
  React.useEffect(() => {
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(() => loadDaemonSets(currentNamespace), autoRefreshInterval);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, currentContext, currentNamespace, loadDaemonSets]);

  const handleRefresh = () => { loadDaemonSets(currentNamespace); toast.info("Refreshed DaemonSet telemetry"); };
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const namespaceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ds of daemonSets) counts[ds.namespace] = (counts[ds.namespace] || 0) + 1;
    return counts;
  }, [daemonSets]);

  const baseDaemonSets = React.useMemo(() => {
    if (currentNamespace === "all") return daemonSets;
    return daemonSets.filter((ds) => ds.namespace.toLowerCase() === currentNamespace.toLowerCase());
  }, [daemonSets, currentNamespace]);

  const filteredItems = React.useMemo(() => baseDaemonSets.filter((ds) => daemonSetMatchesStatus(ds, statusFilter) && daemonSetMatchesSearch(ds, deferredSearch.trim().toLowerCase())), [baseDaemonSets, statusFilter, deferredSearch]);

  const sortedItems = React.useMemo(() => [...filteredItems].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "name": comparison = a.name.localeCompare(b.name); break;
      case "namespace": comparison = a.namespace.localeCompare(b.namespace); break;
      case "status": comparison = a.status.localeCompare(b.status); break;
      case "ready": comparison = (a.desiredNumberScheduled === 0 ? 1 : a.numberReady / a.desiredNumberScheduled) - (b.desiredNumberScheduled === 0 ? 1 : b.numberReady / b.desiredNumberScheduled); break;
      case "age": comparison = a.creationTimestamp.localeCompare(b.creationTimestamp); break;
    }
    return sortAsc ? comparison : -comparison;
  }), [filteredItems, sortField, sortAsc]);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sortedItems.length / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = React.useMemo(() => {
    if (pageSize <= 0) return sortedItems;
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, safeCurrentPage, pageSize]);

  const selection = useWorkloadSelection(daemonSets, paginatedItems, getDaemonSetKey);

  const openBulkAction = (action: "restart" | "delete") => {
    if (selection.selectedObjects.length === 0) return;
    openBulkWorkloadAction({
      kind: "DaemonSet",
      action,
      targets: selection.selectedObjects.map((item) => ({
        name: item.name,
        namespace: item.namespace,
      })),
      onCompleted: selection.clearSelection,
    });
  };

  const handleViewPods = (ds: DaemonSetSummary) => {
    const selector = formatLabelSelector(ds.selector);
    setCurrentNamespace(ds.namespace);
    setPodNodeFilter(null);
    setPodLabelFilter(selector || null, `DaemonSet: ${ds.name}`);
    loadPods(ds.namespace);
    openTab({ id: "pods", title: "Pods", closable: true });
    toast.info(selector ? `Filtered pods by daemonset '${ds.name}'` : `Opened pods in namespace '${ds.namespace}'`);
  };

  const renderSortIndicator = (field: SortField) => sortField === field ? (sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />;

  const totalDaemonSets = totalDaemonSetsCount || daemonSets.length;
  const isFiltered = search.trim() !== "" || statusFilter !== "all";
  const scopedDaemonSets = currentNamespace === "all" ? daemonSets.length : namespaceCounts[currentNamespace] || 0;

  if (connectionStatus === "offline") {
    return <div className="flex-1 flex items-center justify-center p-8 select-none"><EmptyState variant="empty" title="No Cluster Connected" description="Connect or import a kubeconfig file to view and manage live daemonsets." action={{ label: "Import Kubeconfig", icon: <Cpu className="w-4 h-4" />, onClick: () => openKubeconfigModal("browse") }} /></div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <DaemonSetTableToolbar search={search} setSearch={setSearch} daemonSets={daemonSets} currentNamespace={currentNamespace} statusFilter={statusFilter} setStatusFilter={setStatusFilter} sortedItemsCount={sortedItems.length} handleRefresh={handleRefresh} isLoading={isDaemonSetsLoading} />
      <BulkWorkloadToolbar
        selectedCount={selection.selectedItems.size}
        noun="DaemonSet"
        pluralNoun="DaemonSets"
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
      {!hasLoadedDaemonSetsOnce || (isDaemonSetsLoading && filteredItems.length === 0) ? <TableSkeleton rows={10} columns={11} /> : sortedItems.length === 0 ? (
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
          <EmptyState
            variant={(statusFilter === "degraded" || statusFilter === "progressing") && !search ? "healthy" : isFiltered ? "search" : "empty"}
            title={statusFilter === "degraded" && !search ? "All DaemonSets Healthy" : statusFilter === "progressing" && !search ? "All DaemonSets Settled" : isFiltered ? `No daemonsets match filter "${search || statusFilter}"` : currentNamespace !== "all" ? `No daemonsets in "${currentNamespace}"` : "No DaemonSets Found"}
            description={statusFilter === "degraded" && !search ? `All ${scopedDaemonSets} daemonsets in ${currentNamespace === "all" ? "all cluster namespaces" : `namespace "${currentNamespace}"`} have ready daemon pods.` : statusFilter === "progressing" && !search ? `Zero active DaemonSet transitions. All ${scopedDaemonSets} daemonsets in ${currentNamespace === "all" ? "all cluster namespaces" : `namespace "${currentNamespace}"`} are on their desired revision.` : isFiltered ? `0 of ${scopedDaemonSets} daemonsets in ${currentNamespace === "all" ? "all namespaces" : `namespace "${currentNamespace}"`} match your active search or status criteria.` : currentNamespace !== "all" ? `Namespace "${currentNamespace}" currently holds zero daemonsets. ${daemonSets.length} daemonsets are active in other namespaces.` : "No DaemonSets are present in the connected cluster. DaemonSets run one pod on every matching node."}
            scopeBadge={isFiltered ? (search ? `Query: "${search}"` : `Status: ${statusFilter}`) : `Namespace: ${currentNamespace}`}
            codeSnippet={!isFiltered ? `kubectl get daemonsets -n ${currentNamespace === "all" ? "default" : currentNamespace}` : undefined}
            suggestions={!isFiltered && currentNamespace !== "all" ? Object.entries(namespaceCounts).filter(([ns]) => ns !== currentNamespace && ns !== "all").sort((a, b) => b[1] - a[1]).slice(0, 4).map(([ns, count]) => ({ label: `${ns} (${count})`, onClick: () => setCurrentNamespace(ns) })) : undefined}
            action={isFiltered ? { label: "Clear Filters", icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: () => { setSearch(""); setStatusFilter("all"); } } : currentNamespace !== "all" ? { label: `View All Namespaces (${daemonSets.length})`, icon: <Globe className="w-3.5 h-3.5" />, onClick: () => setCurrentNamespace("all") } : { label: "Reload DaemonSets", icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: () => loadDaemonSets(currentNamespace) }}
            secondaryAction={currentNamespace !== "all" && isFiltered ? { label: "Search All Namespaces", icon: <Globe className="w-3.5 h-3.5" />, onClick: () => setCurrentNamespace("all") } : !isFiltered && currentNamespace !== "all" ? { label: "Reload DaemonSets", icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: () => loadDaemonSets(currentNamespace) } : undefined}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full min-w-[1080px] text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] select-none">
              <tr className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8 whitespace-nowrap">
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

                <th onClick={() => handleSort("name")} className="w-44 sm:w-48 md:w-52 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"><div className="flex items-center gap-1"><span>Name</span>{renderSortIndicator("name")}</div></th>
                <th onClick={() => handleSort("namespace")} className="w-24 sm:w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"><div className="flex items-center gap-1"><span>Namespace</span>{renderSortIndicator("namespace")}</div></th>
                <th onClick={() => handleSort("status")} className="w-24 sm:w-28 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"><div className="flex items-center gap-1"><span>Status</span>{renderSortIndicator("status")}</div></th>
                <th className="w-20 py-1 px-2">Desired</th>
                <th className="w-20 py-1 px-2">Current</th>
                <th onClick={() => handleSort("ready")} className="w-20 py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors"><div className="flex items-center gap-1"><span>Ready</span>{renderSortIndicator("ready")}</div></th>
                <th className="w-20 py-1 px-2">Up-to-date</th>
                <th className="w-20 py-1 px-2">Available</th>
                <th className="w-32 py-1 px-2">Node Selector</th>
                <th onClick={() => handleSort("age")} className="w-14 sm:w-16 py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"><div className="flex items-center gap-1"><span>Age</span>{renderSortIndicator("age")}</div></th>
                <th className="w-9 py-1 px-2 text-right" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedItems.map((item) => <DaemonSetTableRow key={`${item.namespace}/${item.name}`} item={item} isSelected={selection.selectedItems.has(getDaemonSetKey(item))} onToggleSelect={selection.toggleSelectItem} onViewPods={handleViewPods} onRowClick={(ds) => openInspector({ kind: "DaemonSet", name: ds.name, namespace: ds.namespace, status: ds.status, data: ds as unknown as Record<string, unknown> })} />)}
            </tbody>
          </table>
        </div>
      )}
      <div className="min-h-10 border-t border-[var(--border)] px-2 sm:px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-[var(--muted)] bg-[var(--surface)]/90 backdrop-blur-xs shrink-0 gap-2 sm:gap-4">
        <div className="flex min-w-0 max-w-full items-center gap-2 truncate">
          <span>Showing <span className="text-[var(--foreground)] font-mono font-medium">{sortedItems.length === 0 ? "0" : pageSize > 0 ? `${(safeCurrentPage - 1) * pageSize + 1}–${Math.min(safeCurrentPage * pageSize, sortedItems.length)}` : `1–${sortedItems.length}`}</span> of <span className="text-[var(--foreground)] font-mono font-medium">{sortedItems.length}</span> items</span>
          <span className="text-[var(--muted)]/40">·</span>
          <div className="inline-flex items-center gap-1"><span>namespace:</span><span className="font-mono font-medium text-[var(--foreground)] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[10px]">{currentNamespace}</span></div>
          {sortedItems.length !== scopedDaemonSets && <span className="text-[10px] text-[var(--muted)] opacity-70">(filtered from {scopedDaemonSets} total)</span>}
          {currentNamespace !== "all" && <><span className="text-[var(--muted)]/40">·</span><span className="text-[10px] text-[var(--muted)]">{totalDaemonSets} total daemonsets</span></>}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:gap-4">
          <div className="flex items-center gap-1.5"><span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">Rows:</span><div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/[0.04] p-0.5 relative">{[50, 100, 250, 0].map((size) => { const selected = pageSize === size; return <button key={size} type="button" aria-pressed={selected} data-testid={`page-size-${size}`} onClick={() => { setPageSize(size); setCurrentPage(1); }} className={cn("relative px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer select-none", selected ? "text-[var(--foreground)] font-semibold" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>{selected && <motion.span layoutId="daemonSetPageSizeIndicator" className="absolute inset-0 rounded-md bg-[var(--surface-active)] dark:bg-white/10 shadow-xs border border-[var(--border)]/60" transition={{ type: "spring", stiffness: 450, damping: 32, mass: 0.8 }} />}<span className="relative z-10">{size === 0 ? "All" : size}</span></button>; })}</div></div>
          {pageSize > 0 && totalPages > 1 && <div className="flex items-center gap-2"><span className="font-mono text-[11px] text-[var(--muted)]">Page <strong className="text-[var(--foreground)] font-semibold">{safeCurrentPage}</strong> of <strong className="text-[var(--foreground)] font-semibold">{totalPages}</strong></span><div className="flex items-center gap-1"><Tooltip content="First page" disabled={safeCurrentPage <= 1}><button disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage(1)} className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer" aria-label="First page"><ChevronsLeft className="w-3.5 h-3.5" /></button></Tooltip><Tooltip content="Previous page" disabled={safeCurrentPage <= 1}><button disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer" aria-label="Previous page"><ChevronLeft className="w-3.5 h-3.5" /></button></Tooltip><Tooltip content="Next page" disabled={safeCurrentPage >= totalPages}><button disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer" aria-label="Next page"><ChevronRight className="w-3.5 h-3.5" /></button></Tooltip><Tooltip content="Last page" disabled={safeCurrentPage >= totalPages}><button disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer" aria-label="Last page"><ChevronsRight className="w-3.5 h-3.5" /></button></Tooltip></div></div>}
        </div>
      </div>
    </div>
  );
}
