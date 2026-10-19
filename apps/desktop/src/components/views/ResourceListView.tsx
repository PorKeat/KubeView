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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/ui";

interface ResourceListViewProps {
  resourceType: string;
}

interface MockResourceItem {
  name: string;
  namespace: string;
  status: "Running" | "Pending" | "CrashLoopBackOff" | "Completed";
  ready: string;
  restarts: number;
  age: string;
  cpu: string;
  cpuPercent: number;
  memory: string;
  memoryPercent: number;
}

const MOCK_PODS: MockResourceItem[] = [
  { name: "coredns-7c65d6cfc9-j9kmq", namespace: "kube-system", status: "Running", ready: "1/1", restarts: 0, age: "12d", cpu: "4m", cpuPercent: 4, memory: "18Mi", memoryPercent: 12 },
  { name: "coredns-7c65d6cfc9-w82fl", namespace: "kube-system", status: "Running", ready: "1/1", restarts: 0, age: "12d", cpu: "5m", cpuPercent: 5, memory: "19Mi", memoryPercent: 13 },
  { name: "etcd-kind-control-plane", namespace: "kube-system", status: "Running", ready: "1/1", restarts: 0, age: "12d", cpu: "18m", cpuPercent: 18, memory: "64Mi", memoryPercent: 35 },
  { name: "kube-apiserver-kind-control-plane", namespace: "kube-system", status: "Running", ready: "1/1", restarts: 0, age: "12d", cpu: "45m", cpuPercent: 45, memory: "182Mi", memoryPercent: 55 },
  { name: "api-gateway-7f8d-x9q", namespace: "production", status: "CrashLoopBackOff", ready: "0/1", restarts: 8, age: "4h", cpu: "1m", cpuPercent: 1, memory: "42Mi", memoryPercent: 24 },
  { name: "auth-service-589679bc4-plk7d", namespace: "production", status: "Running", ready: "1/1", restarts: 0, age: "3d", cpu: "12m", cpuPercent: 12, memory: "86Mi", memoryPercent: 40 },
  { name: "database-postgres-0", namespace: "production", status: "Running", ready: "1/1", restarts: 1, age: "14d", cpu: "32m", cpuPercent: 32, memory: "340Mi", memoryPercent: 68 },
  { name: "redis-cache-master-0", namespace: "production", status: "Running", ready: "1/1", restarts: 0, age: "7d", cpu: "8m", cpuPercent: 8, memory: "54Mi", memoryPercent: 28 },
  { name: "analytics-worker-2", namespace: "default", status: "Pending", ready: "0/1", restarts: 0, age: "15m", cpu: "-", cpuPercent: 0, memory: "-", memoryPercent: 0 },
  { name: "frontend-web-6d9b4b574-z2vqx", namespace: "default", status: "Running", ready: "1/1", restarts: 0, age: "1d", cpu: "9m", cpuPercent: 9, memory: "62Mi", memoryPercent: 30 },
  { name: "cron-cleanup-2894120-4mkl9", namespace: "default", status: "Completed", ready: "0/1", restarts: 0, age: "55m", cpu: "-", cpuPercent: 0, memory: "-", memoryPercent: 0 },
];

export function ResourceListView({ resourceType }: ResourceListViewProps) {
  const { openInspector } = useClusterStore();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedNamespaces, setSelectedNamespaces] = React.useState<string>("all");
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [sortField, setSortField] = React.useState<keyof MockResourceItem>("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setIsError(false);
    setTimeout(() => {
      setIsLoading(false);
      toast.success(`Refreshed ${resourceType} list`);
    }, 500);
  };

  // Filter items
  const filteredItems = MOCK_PODS.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.namespace.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "running" && item.status === "Running") ||
      (statusFilter === "pending" && item.status === "Pending") ||
      (statusFilter === "failing" && item.status === "CrashLoopBackOff");

    const matchesNamespace =
      selectedNamespaces === "all" || item.namespace === selectedNamespaces;

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

  const handleSort = (field: keyof MockResourceItem) => {
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

  const getStatusBadge = (status: MockResourceItem["status"]) => {
    switch (status) {
      case "Running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            Running
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Pending
          </span>
        );
      case "CrashLoopBackOff":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
            CrashLoopBackOff
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/[0.04] dark:bg-white/[0.06] text-[var(--muted)] border border-[var(--border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
            Completed
          </span>
        );
    }
  };

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
              placeholder={`Filter ${resourceType.toLowerCase()} by name, namespace...`}
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
        </div>

        {/* Center: Status Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-black/30 p-0.5 rounded-lg border border-[var(--border)] text-xs">
          {[
            { id: "all", label: "All", count: MOCK_PODS.length },
            { id: "running", label: "Running", count: MOCK_PODS.filter((p) => p.status === "Running").length },
            { id: "pending", label: "Pending", count: MOCK_PODS.filter((p) => p.status === "Pending").length },
            { id: "failing", label: "Failing", count: MOCK_PODS.filter((p) => p.status === "CrashLoopBackOff").length },
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
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-[var(--accent)]")} />
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
                toast.success(`Restarting ${selectedItems.size} workloads...`);
                setSelectedItems(new Set());
              }}
              className="px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCw className="w-3 h-3 text-[var(--status-warning)]" />
              <span>Rolling Restart</span>
            </button>
            <button
              onClick={() => {
                toast.error(`Deleted ${selectedItems.size} resources`);
                setSelectedItems(new Set());
              }}
              className="px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-rose-500/10 hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Table Body or Loading/Error States */}
      {isError ? (
        <ErrorState
          title={`Failed to load ${resourceType}`}
          message={`Unable to connect to the Kubernetes cluster to query ${resourceType.toLowerCase()}.`}
          code="ERR_RESOURCE_QUERY_FAILED"
          onRetry={handleRefresh}
        />
      ) : isLoading ? (
        <div className="flex-1 overflow-auto">
          <TableSkeleton rows={9} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider z-10 select-none font-mono">
            <tr>
              <th className="py-2.5 px-3 w-8 text-center">
                <button onClick={toggleSelectAll} className="p-0.5 hover:text-[var(--foreground)] cursor-pointer">
                  {selectedItems.size === sortedItems.length && sortedItems.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                  ) : selectedItems.size > 0 ? (
                    <MinusSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[var(--muted)]" />
                  )}
                </button>
              </th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--foreground)]" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">
                  <span>Name</span>
                  {sortField === "name" && (sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />)}
                </div>
              </th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--foreground)]" onClick={() => handleSort("namespace")}>
                <div className="flex items-center gap-1">
                  <span>Namespace</span>
                  {sortField === "namespace" && (sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />)}
                </div>
              </th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--foreground)]" onClick={() => handleSort("status")}>
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {sortField === "status" && (sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />)}
                </div>
              </th>
              <th className="py-2.5 px-3">Ready</th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--foreground)]" onClick={() => handleSort("restarts")}>
                <div className="flex items-center gap-1">
                  <span>Restarts</span>
                  {sortField === "restarts" && (sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />)}
                </div>
              </th>
              <th className="py-2.5 px-3 w-28">CPU</th>
              <th className="py-2.5 px-3 w-32">Memory</th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--foreground)]" onClick={() => handleSort("age")}>
                <div className="flex items-center gap-1">
                  <span>Age</span>
                  {sortField === "age" && (sortAsc ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" /> : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />)}
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.05]">
            {sortedItems.map((item) => {
              const itemKey = `${item.namespace}/${item.name}`;
              const isSelected = selectedItems.has(itemKey);

              return (
                <tr
                  key={itemKey}
                  className={cn(
                    "h-9.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer group relative",
                    isSelected ? "bg-[var(--accent)]/10" : ""
                  )}
                  onClick={() => openInspector({ kind: resourceType.slice(0, -1) || "Pod", name: item.name, namespace: item.namespace, status: item.status })}
                >
                  <td className="py-1 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleSelectItem(itemKey)} className="p-0.5 hover:text-[var(--foreground)]">
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--foreground)]" />
                      )}
                    </button>
                  </td>
                  <td className="py-1 px-3 font-medium text-[var(--foreground)] font-mono truncate max-w-xs">
                    {item.name}
                  </td>
                  <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.namespace}</td>
                  <td className="py-1 px-3">{getStatusBadge(item.status)}</td>
                  <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.ready}</td>
                  <td className="py-1 px-3 font-mono text-[var(--muted)]">
                    <span className={cn(item.restarts > 0 && "text-amber-600 dark:text-amber-400 font-semibold")}>
                      {item.restarts}
                    </span>
                  </td>
                  <td className="py-1 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--foreground)] text-[11px] w-8">{item.cpu}</span>
                      {item.cpuPercent > 0 && (
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden w-12">
                          <div
                            className={cn("h-full rounded-full", item.cpuPercent > 70 ? "bg-rose-500" : "bg-emerald-500 dark:bg-emerald-400")}
                            style={{ width: `${item.cpuPercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-1 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--foreground)] text-[11px] w-10">{item.memory}</span>
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
                      <button
                        onClick={() => toast.success(`Logs: ${item.name}`)}
                        className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        title="View Logs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toast.success(`Exec: ${item.name}`)}
                        className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        title="Exec Shell"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toast.info(`Restarted ${item.name}`)}
                        className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        title="Restart"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
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
                : `Namespace "${selectedNamespaces}" currently contains no ${resourceType.toLowerCase()}.`
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

      {/* Footer Status Bar with Pagination */}
      <div className="h-8 border-t border-[var(--border)] px-4 flex items-center justify-between text-[11px] text-[var(--muted)] bg-[var(--surface)] shrink-0">
        <div>
          Showing <span className="text-[var(--foreground)] font-mono">{sortedItems.length}</span> of{" "}
          <span className="text-[var(--foreground)] font-mono">{MOCK_PODS.length}</span> items
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
