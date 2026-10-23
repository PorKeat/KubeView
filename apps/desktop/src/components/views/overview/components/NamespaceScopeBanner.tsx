"use client";

import * as React from "react";
import { Filter, X, ArrowRight } from "lucide-react";
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
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2 rounded-lg bg-[var(--surface-active)]/80 border border-[var(--border)] text-xs text-[var(--foreground)] shadow-xs select-none"
    >
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <div className="w-5 h-5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0">
          <Filter className="w-3 h-3" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[var(--muted)] font-medium">
            Namespace Scope:
          </span>
          <span className="px-2 py-0.5 rounded font-mono font-semibold text-xs bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
            {currentNamespace}
          </span>
          <span className="text-[var(--muted)] font-mono text-[11px]">
            <strong className="text-[var(--foreground)] font-semibold tabular-nums">
              {totalPods}
            </strong>{" "}
            {totalPods === 1 ? "pod" : "pods"},{" "}
            <strong className="text-[var(--foreground)] font-semibold tabular-nums">
              {hostingNodesCount}
            </strong>{" "}
            of {totalNodesCount} nodes hosting
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onViewPods}
          className="px-2.5 py-1 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-black/20 dark:hover:border-white/20 text-[11px] font-mono text-[var(--foreground)] transition-colors cursor-pointer inline-flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-[var(--accent)] outline-hidden"
        >
          <span>View Pods</span>
          <ArrowRight className="w-3 h-3 text-[var(--muted)]" />
        </button>

        <button
          type="button"
          onClick={onClearFilter}
          className="px-2 py-1 rounded-md bg-transparent hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] font-mono text-[11px] transition-colors cursor-pointer flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-[var(--accent)] outline-hidden"
          title="Reset filter to all namespaces"
        >
          <span>Clear Filter</span>
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
