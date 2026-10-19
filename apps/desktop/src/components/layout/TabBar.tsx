"use client";

import * as React from "react";
import {
  X,
  Plus,
  LayoutDashboard,
  Box,
  Layers,
  Repeat,
  Database,
  Cpu,
  Clock,
  Network,
  FolderLock,
  FileCode,
  HardDrive,
  Boxes,
} from "lucide-react";
import { useTabStore, TabItem } from "@/stores/tabStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { cn } from "@/lib/utils";

export function TabBar() {
  const { openTabs, activeTabId, setActiveTab, closeTab } = useTabStore();
  const { setCommandPaletteOpen } = useLayoutStore();

  const getTabIcon = (id: string) => {
    switch (id) {
      case "overview":
        return LayoutDashboard;
      case "pods":
        return Box;
      case "deployments":
        return Layers;
      case "services":
        return Network;
      case "secrets":
        return FolderLock;
      case "configmaps":
        return FileCode;
      case "statefulsets":
        return Database;
      default:
        return Boxes;
    }
  };

  return (
    <div className="h-9 w-full border-b border-[var(--border)] bg-[var(--surface)] flex items-center px-1 overflow-x-auto select-none shrink-0 scrollbar-none">
      <div className="flex items-center gap-1 flex-1">
        {openTabs.map((tab: TabItem) => {
          const isActive = activeTabId === tab.id;
          const Icon = getTabIcon(tab.id);

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "group h-7 px-3 flex items-center gap-2 text-xs rounded-t-lg cursor-pointer transition-all shrink-0 relative",
                isActive
                  ? "bg-[var(--background)] text-[var(--foreground)] font-semibold shadow-xs border-t border-x border-[var(--border)]"
                  : "bg-transparent text-[var(--muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-[var(--foreground)]"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--accent)] to-amber-400 rounded-t-lg shadow-[0_0_8px_rgba(240,138,66,0.6)]" />
              )}
              <Icon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isActive ? "text-[var(--accent)]" : "text-[var(--muted)]")} />
              <span className="truncate max-w-[130px] font-mono text-[11px]">{tab.title}</span>

              {tab.closable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-40 group-hover:opacity-100 transition-opacity ml-1"
                  title="Close tab (Cmd+W)"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* New Tab Quick-Open Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors ml-1"
          title="Open New Tab (Cmd+K)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
