"use client";

import * as React from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import type { PodSummary } from "@kubeview/contracts";
import { matchesLabelSelector } from "@/lib/labelSelector";
import {
  getPodIssue,
  isPodFailing,
  isPodPending,
  isPodRunning,
} from "../lib/podIssues";

export type PodListSortField =
  "name" | "namespace" | "status" | "age" | "restarts" | "node";

export interface UsePodListModelOptions {
  pods: PodSummary[];
  currentNamespace: string;
  podNodeFilter: string | null;
  podLabelFilter: string | null;
}

export function usePodListModel({
  pods,
  currentNamespace,
  podNodeFilter,
  podLabelFilter,
}: UsePodListModelOptions) {
  // Free-text search with useDeferredValue for 120Hz input responsiveness
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [density, setDensity] = React.useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [sortField, setSortField] = React.useState<PodListSortField>("name");
  const [sortAsc, setSortAsc] = React.useState(true);
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(
    new Set(),
  );

  // Client-side pagination for low memory & fast rendering on 1,000+ pods
  const defaultPageSize = useSettingsStore((s) => s.defaultPageSize);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);
  React.useEffect(() => {
    setPageSize(defaultPageSize);
  }, [defaultPageSize]);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    deferredSearch,
    statusFilter,
    podNodeFilter,
    podLabelFilter,
    currentNamespace,
    pageSize,
  ]);

  const handleSort = (field: PodListSortField) => {
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

  // Compute cluster-wide pod counts by namespace
  const namespaceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pods) {
      counts[p.namespace] = (counts[p.namespace] || 0) + 1;
    }
    return counts;
  }, [pods]);

  // Scoped baseline pods for active namespace & node filter
  const basePods = React.useMemo(() => {
    let list =
      currentNamespace === "all"
        ? pods
        : pods.filter(
            (p) => p.namespace.toLowerCase() === currentNamespace.toLowerCase(),
          );

    if (podNodeFilter) {
      list = list.filter((p) => {
        if (!p.nodeName) return false;
        const pNode = p.nodeName.trim().toLowerCase();
        const fNode = podNodeFilter.trim().toLowerCase();
        return (
          pNode === fNode ||
          pNode.startsWith(fNode + ".") ||
          fNode.startsWith(pNode + ".")
        );
      });
    }

    return list;
  }, [podNodeFilter, pods, currentNamespace]);

  // Filter items (client-side high speed filtering)
  const filteredItems = React.useMemo(() => {
    return pods.filter((pod) => {
      // 1. Pod Node filter
      if (podNodeFilter) {
        if (!pod.nodeName) return false;
        const pNode = pod.nodeName.trim().toLowerCase();
        const fNode = podNodeFilter.trim().toLowerCase();
        if (
          pNode !== fNode &&
          !pNode.startsWith(fNode + ".") &&
          !fNode.startsWith(pNode + ".")
        ) {
          return false;
        }
      }

      // 1.5 Label filter (supports comma-separated deployment selectors)
      if (podLabelFilter && !matchesLabelSelector(pod.labels, podLabelFilter)) {
        return false;
      }

      // 2. Namespace filter
      if (
        currentNamespace !== "all" &&
        pod.namespace.toLowerCase() !== currentNamespace.toLowerCase()
      ) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "running" && !isPodRunning(pod)) return false;
        if (statusFilter === "pending" && !isPodPending(pod)) return false;
        if (statusFilter === "failing" && !isPodFailing(pod)) return false;
      }

      // 4. Free-text search (debounced via useDeferredValue for 120 FPS typing)
      if (deferredSearch.trim()) {
        const query = deferredSearch.toLowerCase();
        const matchesName = pod.name.toLowerCase().includes(query);
        const matchesNs = pod.namespace.toLowerCase().includes(query);
        const matchesNode = pod.nodeName?.toLowerCase().includes(query);
        const matchesIp = pod.ip?.toLowerCase().includes(query);
        return matchesName || matchesNs || matchesNode || matchesIp;
      }

      return true;
    });
  }, [
    pods,
    podNodeFilter,
    podLabelFilter,
    currentNamespace,
    statusFilter,
    deferredSearch,
  ]);

  // Sort items
  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      // In failing view, prioritize critical severity failures first
      if (statusFilter === "failing" && sortField === "name") {
        const issueA = getPodIssue(a);
        const issueB = getPodIssue(b);
        const weightA = issueA?.severity === "critical" ? 2 : 1;
        const weightB = issueB?.severity === "critical" ? 2 : 1;
        if (weightA !== weightB) {
          return weightB - weightA;
        }
      }

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
        case "restarts":
          comparison = a.restarts - b.restarts;
          break;
        case "node":
          comparison = (a.nodeName || "").localeCompare(b.nodeName || "");
          break;
        case "age":
          comparison = a.age.localeCompare(b.age);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [filteredItems, sortField, sortAsc, statusFilter]);

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
    paginatedItems.every((i) => selectedItems.has(`${i.namespace}/${i.name}`));
  const isPageSomeSelected =
    !isPageAllSelected &&
    paginatedItems.some((i) => selectedItems.has(`${i.namespace}/${i.name}`));

  const toggleSelectAll = () => {
    if (isPageAllSelected) {
      const next = new Set(selectedItems);
      paginatedItems.forEach((i) => next.delete(`${i.namespace}/${i.name}`));
      setSelectedItems(next);
    } else {
      const next = new Set(selectedItems);
      paginatedItems.forEach((i) => next.add(`${i.namespace}/${i.name}`));
      setSelectedItems(next);
    }
  };

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    density,
    setDensity,
    sortField,
    sortAsc,
    handleSort,
    selectedItems,
    setSelectedItems,
    toggleSelectItem,
    isPageAllSelected,
    isPageSomeSelected,
    toggleSelectAll,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    namespaceCounts,
    basePods,
    filteredItems,
    sortedItems,
    totalPages,
    safeCurrentPage,
    paginatedItems,
  };
}
