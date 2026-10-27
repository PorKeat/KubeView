"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Activity,
  Pencil,
  Trash2,
  Globe,
  RefreshCw,
  AlertTriangle,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sortableHeaderProps } from "@/lib/sortableHeader";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  EmptyState,
  StatusBeacon,
  TableSkeleton,
  Tooltip,
  type StatusBeaconVariant,
} from "@/components/ui";

export interface NetworkingColumn<T> {
  key: string;
  label: string;
  widthClass?: string;
  sortValue?: (item: T) => string | number;
  render: (item: T) => React.ReactNode;
}

export interface NetworkingFilterOption {
  id: string;
  label: string;
  count: number;
  warn?: boolean;
}

export interface NetworkingStatusDescriptor {
  label: string;
  variant: StatusBeaconVariant;
  pulse?: boolean;
}

export interface NetworkingResourcePageProps<T> {
  icon: React.ElementType;
  nounSingular: string;
  nounPlural: string;
  items: T[];
  totalCount: number;
  isLoading: boolean;
  hasLoadedOnce: boolean;
  onRefresh: () => void;
  searchPlaceholder: string;
  matchesSearch: (item: T, query: string) => boolean;
  filterOptions: NetworkingFilterOption[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  matchesFilter: (item: T, filter: string) => boolean;
  columns: NetworkingColumn<T>[];
  getKey: (item: T) => string;
  getName: (item: T) => string;
  getNamespace: (item: T) => string;
  getStatus: (item: T) => NetworkingStatusDescriptor;
  getAge: (item: T) => string;
  getCreationTimestamp: (item: T) => string;
  onRowClick: (item: T) => void;
  describeCommand: (item: T) => string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onDiagnose?: (item: T) => void;
  testIdPrefix: string;
  clusterScoped?: boolean;
  includeClusterScoped?: boolean;
  autoRefresh?: boolean;
  emptyDescription?: string;
  codeCommand?: (namespace: string) => string;
}

export function NetworkingResourcePage<T>({
  icon: Icon,
  nounSingular,
  nounPlural,
  items,
  totalCount,
  isLoading,
  hasLoadedOnce,
  onRefresh,
  searchPlaceholder,
  matchesSearch,
  filterOptions,
  activeFilter,
  setActiveFilter,
  matchesFilter,
  columns,
  getKey,
  getName,
  getNamespace,
  getStatus,
  getAge,
  getCreationTimestamp,
  onRowClick,
  describeCommand,
  onEdit,
  onDelete,
  onDiagnose,
  testIdPrefix,
  clusterScoped = false,
  includeClusterScoped = false,
  autoRefresh = true,
  emptyDescription,
  codeCommand,
}: NetworkingResourcePageProps<T>) {
  const {
    currentNamespace,
    setCurrentNamespace,
    connectionStatus,
    openKubeconfigModal,
    autoRefreshInterval,
  } = useClusterStore();
  const defaultPageSize = useSettingsStore((s) => s.defaultPageSize);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [sortField, setSortField] = React.useState("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, activeFilter, currentNamespace, pageSize]);

  React.useEffect(() => {
    if (!autoRefresh || autoRefreshInterval <= 0) return;
    const timer = setInterval(onRefresh, autoRefreshInterval);
    return () => clearInterval(timer);
  }, [autoRefresh, autoRefreshInterval, onRefresh]);

  const namespaceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const namespace = getNamespace(item);
      counts[namespace] = (counts[namespace] || 0) + 1;
    }
    return counts;
  }, [items, getNamespace]);

  const baseItems = React.useMemo(() => {
    if (clusterScoped || currentNamespace === "all") return items;
    return items.filter(
      (item) =>
        (includeClusterScoped && !getNamespace(item)) ||
        getNamespace(item).toLowerCase() === currentNamespace.toLowerCase(),
    );
  }, [
    items,
    currentNamespace,
    getNamespace,
    clusterScoped,
    includeClusterScoped,
  ]);

  const filteredItems = React.useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return baseItems.filter(
      (item) => matchesFilter(item, activeFilter) && matchesSearch(item, query),
    );
  }, [baseItems, activeFilter, deferredSearch, matchesFilter, matchesSearch]);

  const sortValueFor = React.useCallback(
    (item: T, field: string): string | number => {
      switch (field) {
        case "name":
          return getName(item);
        case "namespace":
          return getNamespace(item);
        case "status":
          return getStatus(item).label;
        case "age":
          return getCreationTimestamp(item);
        default: {
          const column = columns.find((entry) => entry.key === field);
          return column?.sortValue ? column.sortValue(item) : "";
        }
      }
    },
    [columns, getCreationTimestamp, getName, getNamespace, getStatus],
  );

  const sortedItems = React.useMemo(
    () =>
      [...filteredItems].sort((a, b) => {
        const left = sortValueFor(a, sortField);
        const right = sortValueFor(b, sortField);
        const comparison =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right));
        return sortAsc ? comparison : -comparison;
      }),
    [filteredItems, sortAsc, sortField, sortValueFor],
  );

  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(sortedItems.length / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = React.useMemo(() => {
    if (pageSize <= 0) return sortedItems;
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, safeCurrentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc((previous) => !previous);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const copyDescribe = (item: T) => {
    const command = describeCommand(item);
    navigator.clipboard.writeText(command);
    const key = getKey(item);
    setCopiedKey(key);
    toast.success(`Copied: ${command}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const renderSortIndicator = (field: string) =>
    sortField === field ? (
      sortAsc ? (
        <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
      ) : (
        <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
      )
    ) : (
      <ArrowUpDown className="w-3 h-3 opacity-30" />
    );

  const isFiltered = deferredSearch.trim() !== "" || activeFilter !== "all";
  const scopedCount =
    clusterScoped || currentNamespace === "all"
      ? items.length
      : namespaceCounts[currentNamespace] || 0;
  const resolvedTotal = totalCount || items.length;

  if (connectionStatus === "offline") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none">
        <EmptyState
          variant="empty"
          title="No Cluster Connected"
          description={`Connect or import a kubeconfig file to view live ${nounPlural}.`}
          action={{
            label: "Import Kubeconfig",
            icon: <Icon className="w-4 h-4" />,
            onClick: () => openKubeconfigModal("browse"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <div className="min-h-11 border-b border-[var(--border)] px-2 sm:px-3 py-1.5 flex flex-wrap lg:flex-nowrap items-center justify-between shrink-0 glass-panel gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0 w-full max-w-sm order-1 sm:order-none sm:w-auto">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-black/30 border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)] transition-all font-mono"
            aria-label={`Filter ${nounPlural}`}
            data-testid={`${testIdPrefix}-search`}
          />
          {search && (
            <Tooltip content="Clear search">
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </Tooltip>
          )}
        </div>

        <div className="relative flex max-w-full min-w-0 shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap rounded-lg border border-[var(--border)] bg-slate-100/80 p-0.5 text-xs select-none order-2 sm:order-none dark:bg-black/30">
          {filterOptions.map((pill) => {
            const active = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveFilter(pill.id)}
                data-testid={`${testIdPrefix}-filter-${pill.id}`}
                className={cn(
                  "relative z-10 px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                  active
                    ? "text-[var(--foreground)] dark:text-white font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {active && (
                  <motion.div
                    layoutId={`${testIdPrefix}-status-filter-pill`}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    className="absolute inset-0 rounded-md bg-white dark:bg-white/[0.12] shadow-xs border border-[var(--border)]/70 -z-10 motion-reduce:transition-none"
                  />
                )}
                {pill.warn && pill.count > 0 && (
                  <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                )}
                <span>{pill.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono tabular-nums",
                    pill.warn && pill.count > 0
                      ? "text-rose-500 font-semibold"
                      : "text-[var(--muted)]",
                  )}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-2 text-xs text-[var(--muted)] shrink-0 order-3 sm:order-none">
          <span className="font-mono text-[11px]">
            {sortedItems.length} items
          </span>
          <div className="h-3 w-[1px] bg-[var(--border)]" />
          <Tooltip content={`Refresh ${nounPlural}`}>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              aria-label={`Refresh ${nounPlural}`}
              data-testid={`${testIdPrefix}-refresh`}
            >
              <RefreshCw
                className={cn(
                  "w-3.5 h-3.5",
                  isLoading && "animate-spin text-[var(--accent)]",
                )}
              />
            </button>
          </Tooltip>
        </div>
      </div>

      {!hasLoadedOnce || (isLoading && filteredItems.length === 0) ? (
        <TableSkeleton rows={10} columns={columns.length + 4} />
      ) : sortedItems.length === 0 ? (
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
          <EmptyState
            variant={isFiltered ? "search" : "empty"}
            title={
              isFiltered
                ? `No ${nounPlural} match filter "${search || activeFilter}"`
                : currentNamespace !== "all"
                  ? `No ${nounPlural} in "${currentNamespace}"`
                  : `No ${nounPlural} found`
            }
            description={
              isFiltered
                ? `0 of ${scopedCount} ${nounPlural} in ${currentNamespace === "all" ? "all namespaces" : `namespace "${currentNamespace}"`} match your active search or filter criteria.`
                : currentNamespace !== "all"
                  ? `Namespace "${currentNamespace}" currently holds zero ${nounPlural}. ${items.length} ${nounPlural} are active in other namespaces.`
                  : (emptyDescription ??
                    `No ${nounPlural} are present in the connected cluster.`)
            }
            scopeBadge={
              isFiltered
                ? search
                  ? `Query: "${search}"`
                  : `Filter: ${activeFilter}`
                : `Namespace: ${currentNamespace}`
            }
            codeSnippet={
              !isFiltered && codeCommand
                ? codeCommand(
                    currentNamespace === "all" ? "default" : currentNamespace,
                  )
                : undefined
            }
            suggestions={
              !isFiltered && currentNamespace !== "all"
                ? Object.entries(namespaceCounts)
                    .filter(([namespace]) => namespace !== currentNamespace)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([namespace, count]) => ({
                      label: `${namespace} (${count})`,
                      onClick: () => setCurrentNamespace(namespace),
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
                      setActiveFilter("all");
                    },
                  }
                : currentNamespace !== "all"
                  ? {
                      label: `View All Namespaces (${items.length})`,
                      icon: <Globe className="w-3.5 h-3.5" />,
                      onClick: () => setCurrentNamespace("all"),
                    }
                  : {
                      label: `Reload ${nounPlural}`,
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      onClick: onRefresh,
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
                      label: `Reload ${nounPlural}`,
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      onClick: onRefresh,
                    }
                  : undefined
            }
          />
        </div>
      ) : (
        <div
          className="flex-1 overflow-auto min-h-0"
          data-testid="networking-table-scroll"
        >
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)] select-none">
              <tr className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8 whitespace-nowrap">
                <th
                  {...sortableHeaderProps({
                    field: "name",
                    activeField: sortField,
                    ascending: sortAsc,
                    onSort: handleSort,
                  })}
                  className="w-[18%] py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors"
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
                  className="w-[8%] py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors"
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
                  className="w-[12%] py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                {columns.map((column) =>
                  column.sortValue ? (
                    <th
                      key={column.key}
                      {...sortableHeaderProps({
                        field: column.key,
                        activeField: sortField,
                        ascending: sortAsc,
                        onSort: handleSort,
                      })}
                      className={cn(
                        "py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors",
                        column.widthClass,
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <span>{column.label}</span>
                        {renderSortIndicator(column.key)}
                      </div>
                    </th>
                  ) : (
                    <th
                      key={column.key}
                      className={cn("py-1 px-2", column.widthClass)}
                    >
                      {column.label}
                    </th>
                  ),
                )}
                <th
                  {...sortableHeaderProps({
                    field: "age",
                    activeField: sortField,
                    ascending: sortAsc,
                    onSort: handleSort,
                  })}
                  className="w-[5%] py-1 px-2 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Age</span>
                    {renderSortIndicator("age")}
                  </div>
                </th>
                <th
                  className={cn(
                    "sticky right-0 z-30 border-l border-[var(--border)] bg-[var(--surface)] py-1 px-2 text-right",
                    onEdit || onDelete || onDiagnose
                      ? "w-28"
                      : "w-[4%] min-w-[36px]",
                  )}
                  aria-label="Actions"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedItems.map((item) => {
                const key = getKey(item);
                const name = getName(item);
                const status = getStatus(item);
                const copied = copiedKey === key;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick(item)}
                    className="hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group h-9 text-xs"
                    data-testid={`${testIdPrefix}-row`}
                  >
                    <td className="py-1 px-2 font-medium font-mono text-[var(--foreground)] truncate">
                      <div className="relative flex items-center gap-1.5 min-w-0">
                        <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
                        <span className="truncate" title={name}>
                          {name}
                        </span>
                        <Tooltip
                          content={
                            copied
                              ? "Copied!"
                              : `Copy ${nounSingular.toLowerCase()} name`
                          }
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigator.clipboard.writeText(name);
                              setCopiedKey(key);
                              toast.success(`Copied: ${name}`);
                              setTimeout(() => setCopiedKey(null), 1500);
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            aria-label={`Copy ${nounSingular.toLowerCase()} name`}
                          >
                            {copied ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                    <td className="py-1 px-2 font-mono text-[var(--muted)] truncate">
                      {getNamespace(item) || "Cluster Scope"}
                    </td>
                    <td className="py-1 px-2 whitespace-nowrap">
                      <StatusBeacon
                        variant={status.variant}
                        label={status.label}
                        size="xs"
                        pulse={status.pulse}
                      />
                    </td>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="py-1 px-2 text-[var(--foreground)] truncate"
                      >
                        {column.render(item)}
                      </td>
                    ))}
                    <td className="py-1 px-2 font-mono text-[var(--muted)] truncate">
                      {getAge(item)}
                    </td>
                    <td
                      className="sticky right-0 z-10 border-l border-[var(--border)] bg-[var(--surface)] py-1 px-2 text-right group-hover:bg-[var(--surface-hover)]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip content="Copy kubectl describe command">
                          <button
                            type="button"
                            onClick={() => copyDescribe(item)}
                            className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/10 dark:hover:bg-white/10 opacity-60 group-hover:opacity-100 transition-colors cursor-pointer"
                            aria-label={`Copy kubectl describe for ${name}`}
                          >
                            {copiedKey === key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </Tooltip>
                        {onDiagnose && (
                          <Tooltip content="Diagnose connectivity">
                            <button
                              type="button"
                              onClick={() => onDiagnose(item)}
                              className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 opacity-60 group-hover:opacity-100 transition-colors cursor-pointer"
                              aria-label={`Diagnose ${name}`}
                            >
                              <Activity className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        )}
                        {onEdit && (
                          <Tooltip content="Edit resource">
                            <button
                              type="button"
                              onClick={() => onEdit(item)}
                              data-testid={`${testIdPrefix}-edit`}
                              className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/10 dark:hover:bg-white/10 opacity-60 group-hover:opacity-100 transition-colors cursor-pointer"
                              aria-label={`Edit ${name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        )}
                        {onDelete && (
                          <Tooltip content="Delete resource">
                            <button
                              type="button"
                              onClick={() => onDelete(item)}
                              className="p-1 rounded-md text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 opacity-60 group-hover:opacity-100 transition-colors cursor-pointer"
                              aria-label={`Delete ${name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          <div className="inline-flex items-center gap-1">
            <span>namespace:</span>
            <span className="font-mono font-medium text-[var(--foreground)] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[10px]">
              {currentNamespace}
            </span>
          </div>
          {sortedItems.length !== scopedCount && (
            <span className="text-[10px] text-[var(--muted)] opacity-70">
              (filtered from {scopedCount} total)
            </span>
          )}
          {currentNamespace !== "all" && (
            <>
              <span className="text-[var(--muted)]/40">·</span>
              <span className="text-[10px] text-[var(--muted)]">
                {resolvedTotal} total {nounPlural}
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
                const selected = pageSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={selected}
                    data-testid={`${testIdPrefix}-page-size-${size}`}
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "relative px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors cursor-pointer select-none",
                      selected
                        ? "text-[var(--foreground)] font-semibold"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId={`${testIdPrefix}-page-size-indicator`}
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
                <strong className="text-[var(--foreground)] font-semibold">
                  {safeCurrentPage}
                </strong>{" "}
                of{" "}
                <strong className="text-[var(--foreground)] font-semibold">
                  {totalPages}
                </strong>
              </span>
              <div className="flex items-center gap-1">
                <Tooltip content="First page" disabled={safeCurrentPage <= 1}>
                  <button
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="First page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
                <Tooltip
                  content="Previous page"
                  disabled={safeCurrentPage <= 1}
                >
                  <button
                    disabled={safeCurrentPage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
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
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
                <Tooltip
                  content="Last page"
                  disabled={safeCurrentPage >= totalPages}
                >
                  <button
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-6.5 h-6.5 inline-flex items-center justify-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
