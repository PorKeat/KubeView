"use client";

import {
  Sparkles,
  FolderOpen,
  FileCode,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KubeconfigModalTab } from "../hooks/useKubeconfigImport";

export function KubeconfigModalTabs({
  activeTab,
  onSelectTab,
  detectedCount,
  discoveredCount,
  availableContextsCount,
}: {
  activeTab: KubeconfigModalTab;
  onSelectTab: (tab: KubeconfigModalTab) => void;
  detectedCount: number;
  discoveredCount: number;
  availableContextsCount: number;
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 md:px-8 pt-3 border-b border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] select-none overflow-x-auto scrollbar-none">
      <button
        onClick={() => onSelectTab("auto")}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-xl transition-all cursor-pointer shrink-0",
          activeTab === "auto"
            ? "border-[#F08A42] text-[#F08A42] bg-[#F08A42]/5"
            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
        )}
      >
        <Sparkles className="w-4 h-4" />
        <span>Auto-Detected (~/.kube)</span>
        {detectedCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[#F08A42]/20 text-[#F08A42] font-mono font-medium">
            {detectedCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onSelectTab("browse")}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-xl transition-all cursor-pointer shrink-0",
          activeTab === "browse"
            ? "border-[#F08A42] text-[#F08A42] bg-[#F08A42]/5"
            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
        )}
      >
        <FolderOpen className="w-4 h-4" />
        <span>Add via File / Folder</span>
        {discoveredCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[#F08A42]/20 text-[#F08A42] font-mono font-medium">
            {discoveredCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onSelectTab("paste")}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-xl transition-all cursor-pointer shrink-0",
          activeTab === "paste"
            ? "border-[#F08A42] text-[#F08A42] bg-[#F08A42]/5"
            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
        )}
      >
        <FileCode className="w-4 h-4" />
        <span>Paste Raw YAML</span>
      </button>

      <button
        onClick={() => onSelectTab("manage")}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-xl transition-all cursor-pointer shrink-0",
          activeTab === "manage"
            ? "border-[#F08A42] text-[#F08A42] bg-[#F08A42]/5"
            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>Manage Clusters</span>
        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/10 dark:bg-white/10 text-[var(--foreground)] font-mono font-medium">
          {availableContextsCount}
        </span>
      </button>
    </div>
  );
}
