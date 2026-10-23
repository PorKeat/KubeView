"use client";

import * as React from "react";

export interface WorkloadSelection<T> {
  selectedItems: Set<string>;
  selectedObjects: T[];
  isPageAllSelected: boolean;
  isPageSomeSelected: boolean;
  toggleSelectItem: (key: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
}

export function useWorkloadSelection<T>(
  allItems: T[],
  pageItems: T[],
  getKey: (item: T) => string,
): WorkloadSelection<T> {
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(
    () => new Set(),
  );

  const toggleSelectItem = React.useCallback((key: string) => {
    setSelectedItems((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isPageAllSelected = React.useMemo(
    () =>
      pageItems.length > 0 &&
      pageItems.every((item) => selectedItems.has(getKey(item))),
    [getKey, pageItems, selectedItems],
  );

  const isPageSomeSelected = React.useMemo(
    () => pageItems.some((item) => selectedItems.has(getKey(item))),
    [getKey, pageItems, selectedItems],
  );

  const toggleSelectAll = React.useCallback(() => {
    setSelectedItems((previous) => {
      const next = new Set(previous);
      if (isPageAllSelected) {
        pageItems.forEach((item) => next.delete(getKey(item)));
      } else {
        pageItems.forEach((item) => next.add(getKey(item)));
      }
      return next;
    });
  }, [getKey, isPageAllSelected, pageItems]);

  const clearSelection = React.useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const selectedObjects = React.useMemo(
    () => allItems.filter((item) => selectedItems.has(getKey(item))),
    [allItems, getKey, selectedItems],
  );

  return {
    selectedItems,
    selectedObjects,
    isPageAllSelected,
    isPageSomeSelected,
    toggleSelectItem,
    toggleSelectAll,
    clearSelection,
  };
}
