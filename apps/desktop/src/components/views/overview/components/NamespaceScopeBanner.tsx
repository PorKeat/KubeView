"use client";

import * as React from "react";
import { Filter, X } from "lucide-react";
import { motion } from "motion/react";

export interface NamespaceScopeBannerProps {
  currentNamespace: string;
  totalPods: number;
  hostingNodesCount: number;
  totalNodesCount: number;
  onViewPods: () => void;
  onClearFilter: () => void;
}

export function NamespaceScopeBanner({
  currentNamespace,
  totalPods,
  hostingNodesCount,
  totalNodesCount,
  onViewPods,
  onClearFilter,
}: NamespaceScopeBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#f08a42]/[0.08] dark:bg-[#f08a42]/[0.12] border border-[#f08a42]/30 text-xs text-[var(--foreground)] shadow-xs"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
        <div className="w-6 h-6 rounded-lg bg-[#f08a42]/20 flex items-center justify-center shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#f08a42]" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[var(--muted)] font-medium">Overview Filtered by Namespace:</span>
          <span className="px-2.5 py-0.5 rounded-md font-mono font-bold text-xs bg-[#f08a42]/20 text-[#f08a42] border border-[#f08a42]/30">
            {currentNamespace}
          </span>
          <span className="text-[var(--muted)] font-mono text-xs">
            &bull; <strong className="text-[var(--foreground)] font-semibold tabular-nums">{totalPods}</strong>{" "}
            {totalPods === 1 ? "pod" : "pods"}
            &bull; <strong className="text-[var(--foreground)] font-semibold tabular-nums">{hostingNodesCount}</strong>{" "}
            of {totalNodesCount} nodes hosting
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onViewPods}
          className="px-2.5 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)] hover:text-[#f08a42] transition-colors cursor-pointer"
        >
          View {currentNamespace} Pods &rarr;
        </button>

        <button
          type="button"
          onClick={onClearFilter}
          className="px-2.5 py-1 rounded-lg bg-[#f08a42]/15 hover:bg-[#f08a42]/25 text-[#f08a42] font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>Clear Filter</span>
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
