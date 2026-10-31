"use client";

import {
  Sparkles,
  FolderOpen,
  FileCode,
  SlidersHorizontal,
  type LucideIcon,
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
  const tabs: Array<{
    id: KubeconfigModalTab;
    label: string;
    icon: LucideIcon;
    count?: number;
  }> = [
    {
      id: "auto",
      label: "Auto-Detected (~/.kube)",
      icon: Sparkles,
      count: detectedCount,
    },
    {
      id: "browse",
      label: "Add via File / Folder",
      icon: FolderOpen,
      count: discoveredCount,
    },
    { id: "paste", label: "Paste Raw YAML", icon: FileCode },
    {
      id: "manage",
      label: "Manage Clusters",
      icon: SlidersHorizontal,
      count: availableContextsCount,
    },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] px-2 pt-1 scrollbar-none sm:px-4">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer",
              active
                ? "border-[var(--accent)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5",
                active ? "text-[var(--accent)]" : "text-[var(--muted)]",
              )}
              aria-hidden="true"
            />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[9px] tabular-nums",
                  active
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "bg-[var(--surface-hover)] text-[var(--muted)]",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
