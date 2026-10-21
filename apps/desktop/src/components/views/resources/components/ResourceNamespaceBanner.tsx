"use client";

import * as React from "react";

export interface ResourceNamespaceBannerProps {
  podNodeFilter: string | null;
  currentNamespace: string;
  filteredItemsCount: number;
  totalPodsCount: number;
  search: string;
  namespaceCounts: Record<string, number>;
  setCurrentNamespace: (ns: string) => void;
}

export function ResourceNamespaceBanner({
  podNodeFilter,
  currentNamespace,
  filteredItemsCount,
  totalPodsCount,
  search,
  namespaceCounts,
  setCurrentNamespace,
}: ResourceNamespaceBannerProps) {
  if (podNodeFilter || currentNamespace === "all" || filteredItemsCount > 0 || totalPodsCount === 0 || search) {
    return null;
  }

  return (
    <div className="mx-4 mt-3 p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/10 dark:bg-amber-500/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono shrink-0 shadow-xs animate-in fade-in duration-150">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <div>
          <span className="text-[var(--foreground)] font-bold">
            No workloads running in namespace &quot;{currentNamespace}&quot;
          </span>
          <span className="text-[var(--muted)] ml-2 hidden sm:inline">
            ({totalPodsCount} active pods available in cluster)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-[var(--muted)]">Active namespaces:</span>
        {Object.entries(namespaceCounts)
          .filter(([ns]) => ns !== currentNamespace && ns !== "all")
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([ns, count]) => (
            <button
              key={ns}
              type="button"
              onClick={() => setCurrentNamespace(ns)}
              className="px-2 py-0.5 rounded-md bg-white/70 dark:bg-white/10 hover:bg-[#F08A42] hover:text-white border border-[var(--border)] text-[11px] font-medium transition-colors cursor-pointer"
            >
              {ns} <span className="opacity-70 tabular-nums">({count})</span>
            </button>
          ))}
        <button
          type="button"
          onClick={() => setCurrentNamespace("all")}
          className="px-2.5 py-0.5 rounded-md bg-[#F08A42] text-white hover:opacity-90 text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
        >
          View All ({totalPodsCount}) &rarr;
        </button>
      </div>
    </div>
  );
}
