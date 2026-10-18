"use client";

import * as React from "react";
import {
  FileQuestion,
  Search,
  ArrowLeft,
  Compass,
  Layers,
  Box,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/stores/tabStore";
import { useClusterStore } from "@/stores/clusterStore";

interface NotFoundStateProps {
  title?: string;
  resourceName?: string;
  resourceKind?: string;
  message?: string;
  searchQuery?: string;
  onResetSearch?: () => void;
  className?: string;
}

export function NotFoundState({
  title,
  resourceName,
  resourceKind = "Resource",
  message,
  searchQuery,
  onResetSearch,
  className,
}: NotFoundStateProps) {
  const { openTab } = useTabStore();
  const { currentNamespace, setCurrentNamespace } = useClusterStore();

  const displayTitle = title || (
    resourceName
      ? `${resourceKind} "${resourceName}" Not Found`
      : `${resourceKind} Not Found`
  );

  const displayMessage = message || (
    searchQuery
      ? `No ${resourceKind.toLowerCase()} matching "${searchQuery}" was found in namespace "${currentNamespace}".`
      : `The requested ${resourceKind.toLowerCase()} does not exist in the active cluster context or may have been deleted.`
  );

  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center p-8 select-none relative overflow-hidden",
        className
      )}
    >
      {/* Ambient Cyber Grid & Glow */}
      <div className="absolute w-80 h-80 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none -top-20" />
      <div className="absolute w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -bottom-20" />

      <div className="relative z-10 max-w-md w-full p-6 rounded-2xl glass-panel border border-white/10 shadow-2xl space-y-5 text-center">
        {/* Visual 404 / Compass Graphic */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 flex items-center justify-center text-[var(--accent)] shadow-[0_0_30px_rgba(240,138,66,0.18)]">
          <FileQuestion className="w-8 h-8 stroke-[1.75]" />
          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--accent)] text-white shadow-sm">
            404
          </span>
        </div>

        {/* Title & Info */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {resourceKind && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.06] text-white border border-white/10">
                {resourceKind}
              </span>
            )}
            {resourceName && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 truncate max-w-[200px]">
                {resourceName}
              </span>
            )}
          </div>

          <h2 className="text-base font-bold text-[var(--foreground)] tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            {displayMessage}
          </p>
        </div>

        {/* Helpful Diagnostics / Suggestions */}
        <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] text-[11px] text-left text-[var(--muted)] space-y-1.5 font-mono">
          <div className="text-[10px] text-[var(--foreground)] font-semibold uppercase tracking-wider font-sans">
            Troubleshooting Tips:
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">•</span>
            <span>Check namespace filter (current: <strong className="text-[var(--foreground)]">{currentNamespace}</strong>)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400">•</span>
            <span>Resource may have terminated or moved nodes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400">•</span>
            <span>Use Cmd+K to jump to any known resource</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
          {searchQuery && onResetSearch && (
            <button
              onClick={onResetSearch}
              className="px-3.5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          )}

          {currentNamespace !== "all" && (
            <button
              onClick={() => setCurrentNamespace("all")}
              className="px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[var(--foreground)] border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Switch to All Namespaces</span>
            </button>
          )}

          <button
            onClick={() => openTab({ id: "overview", title: "Cluster Overview", closable: false })}
            className="px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[var(--foreground)] border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => openTab({ id: "pods", title: "Pods", closable: true })}
            className="px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[var(--foreground)] border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Box className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Pods</span>
          </button>
        </div>
      </div>
    </div>
  );
}
