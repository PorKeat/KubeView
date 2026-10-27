"use client";

import * as React from "react";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { NetworkingColumn, NetworkingStatusDescriptor } from "../types";

export interface UseNetworkingListStateOptions<T> {
  items: T[];
  totalCount: number;
  autoRefresh: boolean;
  onRefresh: () => void;
  matchesSearch: (item: T, query: string) => boolean;
  activeFilter: string;
  matchesFilter: (item: T, filter: string) => boolean;
  columns: NetworkingColumn<T>[];
  getKey: (item: T) => string;
  getName: (item: T) => string;
  getNamespace: (item: T) => string;
  getStatus: (item: T) => NetworkingStatusDescriptor;
  getCreationTimestamp: (item: T) => string;
  describeCommand: (item: T) => string;
  clusterScoped: boolean;
  includeClusterScoped: boolean;
}

export function useNetworkingListState<T>({
  items,
  totalCount,
  autoRefresh,
  onRefresh,
  matchesSearch,
  activeFilter,
  matchesFilter,
  columns,
  getKey,
  getName,
  getNamespace,
  getStatus,
  getCreationTimestamp,
  describeCommand,
  clusterScoped,
  includeClusterScoped,
}: UseNetworkingListStateOptions<T>) {
  const { currentNamespace, setCurrentNamespace, autoRefreshInterval } =
    useClusterStore();
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

  const isFiltered = deferredSearch.trim() !== "" || activeFilter !== "all";
  const scopedCount =
    clusterScoped || currentNamespace === "all"
      ? items.length
      : namespaceCounts[currentNamespace] || 0;
  const resolvedTotal = totalCount || items.length;

  return {
    currentNamespace,
    setCurrentNamespace,
    pageSize,
    setPageSize,
    search,
    setSearch,
    sortField,
    sortAsc,
    currentPage,
    setCurrentPage,
    copiedKey,
    setCopiedKey,
    handleSort,
    copyDescribe,
    namespaceCounts,
    baseItems,
    filteredItems,
    sortedItems,
    totalPages,
    safeCurrentPage,
    paginatedItems,
    isFiltered,
    scopedCount,
    resolvedTotal,
  };
}
