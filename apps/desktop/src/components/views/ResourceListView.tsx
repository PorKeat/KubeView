"use client";

import * as React from "react";
import {
  Search,
  RefreshCw,
  Terminal,
  FileText,
  Trash2,
  RotateCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  MinusSquare,
  AlertCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Layers,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import type { PodSummary } from "@kubeview/contracts";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/ui";
import { NamespaceSelectorDropdown } from "@/components/layout/NamespaceSelectorDropdown";

interface ResourceListViewProps {
  resourceType: string;
}

export function ResourceListView({ resourceType }: ResourceListViewProps) {
  const {
    pods,
    isPodsLoading,
    totalPodsCount,
    loadPods,
    currentNamespace,
    currentContext,
    availableNamespaces,
    setCurrentNamespace,
    connectionStatus,
    openInspector,
    openLogsModal,
    openExecModal,
    openRestartConfirm,
    openDeleteConfirm,
    openKubeconfigModal,
  } = useClusterStore();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [sortField, setSortField] = React.useState<keyof PodSummary>("name");
  const [sortAsc, setSortAsc] = React.useState(true);

  // Trigger load on mount or when context/namespace changes
  React.useEffect(() => {
    if (connectionStatus === "connected" || connectionStatus === "degraded") {
      loadPods(currentNamespace, currentContext);
    }
  }, [currentNamespace, connectionStatus, currentContext]);

  const handleRefresh = async () => {
    await loadPods(currentNamespace);
    toast.success(`Refreshed ${resourceType} list`);
  };

  // Filter items
  const filteredItems = pods.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.namespace.toLowerCase().includes(search.toLowerCase()) ||
      (item.nodeName && item.nodeName.toLowerCase().includes(search.toLowerCase())) ||
      (item.ip && item.ip.includes(search));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "running" && item.status === "Running") ||
      (statusFilter === "pending" && item.status === "Pending") ||
      (statusFilter === "failing" && !["Running", "Completed", "Pending"].includes(item.status));

    const matchesNamespace =
      currentNamespace === "all" || item.namespace === currentNamespace;

    return matchesSearch && matchesStatus && matchesNamespace;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const handleSort = (field: keyof PodSummary) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === sortedItems.length && sortedItems.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedItems.map((i) => `${i.namespace}/${i.name}`)));
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            Running
          </span>
        );
      case "Pending":
      case "ContainerCreating":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            {status}
          </span>
        );
      case "Completed":
      case "Succeeded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/[0.04] dark:bg-white/[0.06] text-[var(--muted)] border border-[var(--border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
            {status}
          </span>
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
      <div className="h-11 border-b border-[var(--border)] px-3 flex items-center justify-between shrink-0 glass-panel gap-3">
        {/* Left: Search Bar & Namespace Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${resourceType.toLowerCase()} by name, namespace, node, IP...`}
              className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-black/30 border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)] transition-all font-mono"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Modern Namespace Dropdown filter */}
          {availableNamespaces.length > 1 && (
            <NamespaceSelectorDropdown variant="toolbar" />
          )}
        </div>

        {/* Center: Status Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-black/30 p-0.5 rounded-lg border border-[var(--border)] text-xs">
          {[
            { id: "all", label: "All", count: pods.length },
            { id: "running", label: "Running", count: pods.filter((p) => p.status === "Running").length },
            { id: "pending", label: "Pending", count: pods.filter((p) => p.status === "Pending" || p.status === "ContainerCreating").length },
            { id: "failing", label: "Failing", count: pods.filter((p) => !["Running", "Completed", "Pending", "Succeeded"].includes(p.status)).length },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={cn(
                "px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                statusFilter === pill.id
                  ? "bg-white dark:bg-white/[0.12] text-[var(--foreground)] dark:text-white font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <span>{pill.label}</span>
              <span className="text-[10px] text-[var(--muted)] font-mono">{pill.count}</span>
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 text-xs text-[var(--muted)] shrink-0">
          <span className="font-mono text-[11px]">{sortedItems.length} items</span>
          <div className="h-3 w-[1px] bg-[var(--border)]" />
          <button
            onClick={handleRefresh}
            disabled={isPodsLoading}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isPodsLoading && "animate-spin text-[var(--accent)]")} />
          </button>
        </div>
      </div>

      {/* Floating Batch Action Toolbar */}
      {selectedItems.size > 0 && (
        <div className="h-9 bg-[var(--surface-active)] border-b border-[var(--border)] px-4 flex items-center justify-between text-xs text-[var(--foreground)] animate-in fade-in duration-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--accent)] font-mono">{selectedItems.size}</span>
            <span>selected</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const first = Array.from(selectedItems)[0];
                if (first) {
                  const [ns, name] = first.split("/");
                  openRestartConfirm({ name, namespace: ns });
                }
              }}
              className="px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Restart Workload</span>
            </button>
            <button
              onClick={() => {
                const first = Array.from(selectedItems)[0];
                if (first) {
                  const [ns, name] = first.split("/");
                  openDeleteConfirm({ name, namespace: ns });
                }
              }}
              className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Table View Area */}
      {isPodsLoading && pods.length === 0 ? (
        <TableSkeleton rows={10} columns={7} />
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] shadow-xs">
              <tr className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8">
                <th className="w-9 px-3 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
                  >
                    {selectedItems.size === sortedItems.length && sortedItems.length > 0 ? (
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
                      sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
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
                      sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
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
                      sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
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
                      sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th className="py-1 px-3">CPU (Req)</th>
                <th className="py-1 px-3">Memory (Req)</th>
                <th
                  onClick={() => handleSort("age")}
                  className="py-1 px-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Age</span>
                    {sortField === "age" ? (
                      sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th className="py-1 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sortedItems.map((item) => {
                const itemKey = `${item.namespace}/${item.name}`;
                const isSelected = selectedItems.has(itemKey);

                return (
                  <tr
                    key={itemKey}
                    onClick={() =>
                      openInspector({
                        kind: "Pod",
                        name: item.name,
                        namespace: item.namespace,
                        status: item.status,
                        data: item as unknown as Record<string, unknown>,
                      })
                    }
                    className={cn(
                      "h-9 hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group",
                      isSelected && "bg-[var(--accent)]/5 dark:bg-[var(--accent)]/10"
                    )}
                  >
                    <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelectItem(itemKey)}
                        className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                        ) : (
                          <Square className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                        )}
                      </button>
                    </td>
                    <td className="py-1 px-3 font-medium font-mono text-[var(--foreground)] truncate max-w-xs">
                      {item.name}
                    </td>
                    <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.namespace}</td>
                    <td className="py-1 px-3">{getStatusBadge(item.status)}</td>
                    <td className="py-1 px-3 font-mono text-[var(--foreground)]">{item.ready}</td>
                    <td className="py-1 px-3 font-mono text-[var(--muted)]">
                      <span className={cn(item.restarts > 0 && "text-amber-500 font-semibold")}>
                        {item.restarts}
                      </span>
                    </td>
                    <td className="py-1 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[var(--foreground)] text-[11px] w-9">{item.cpu}</span>
                        {item.cpuPercent > 0 && (
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden w-12">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{ width: `${item.cpuPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-1 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[var(--foreground)] text-[11px] w-12">{item.memory}</span>
                        {item.memoryPercent > 0 && (
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden w-12">
                            <div
                              className={cn("h-full rounded-full", item.memoryPercent > 70 ? "bg-rose-500" : "bg-cyan-500 dark:bg-cyan-400")}
                              style={{ width: `${item.memoryPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.age}</td>
                    <td className="py-1 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* 1. View Logs */}
                        <button
                          onClick={() => openLogsModal({ name: item.name, namespace: item.namespace })}
                          className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                          title="View Logs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* 2. Exec Shell */}
                        <button
                          onClick={() => openExecModal({ name: item.name, namespace: item.namespace })}
                          className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                          title="Exec Shell"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>

                        {/* 3. Restart */}
                        <button
                          onClick={() => openRestartConfirm({ name: item.name, namespace: item.namespace })}
                          className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                          title="Restart Pod"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        {/* 4. Delete Pod */}
                        <button
                          onClick={() => openDeleteConfirm({ name: item.name, namespace: item.namespace })}
                          className="p-1 rounded hover:bg-rose-500/15 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
                          title="Delete Pod"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sortedItems.length === 0 && (
            <EmptyState
              variant={search || statusFilter !== "all" ? "search" : "empty"}
              title={search || statusFilter !== "all" ? "No Matching Resources" : `No ${resourceType} Found`}
              description={
                search || statusFilter !== "all"
                  ? `No ${resourceType.toLowerCase()} matched your filter criteria "${search || statusFilter}".`
                  : `Namespace "${currentNamespace}" currently contains no ${resourceType.toLowerCase()}.`
              }
              action={
                search || statusFilter !== "all"
                  ? {
                      label: "Clear Filters",
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      onClick: () => {
                        setSearch("");
                        setStatusFilter("all");
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
          Showing <span className="text-[var(--foreground)] font-mono">{sortedItems.length}</span> of{" "}
          <span className="text-[var(--foreground)] font-mono">{totalPodsCount}</span> items in namespace{" "}
          <strong className="text-[var(--foreground)] font-mono">{currentNamespace}</strong>
        </div>

        <div className="flex items-center gap-2">
          <span>Page 1 of 1</span>
          <div className="flex items-center gap-0.5">
            <button disabled className="p-1 rounded text-[var(--muted)] opacity-50 cursor-not-allowed">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button disabled className="p-1 rounded text-[var(--muted)] opacity-50 cursor-not-allowed">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
