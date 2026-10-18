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
                "group h-7 px-2.5 flex items-center gap-2 text-xs rounded-t-md cursor-pointer border-t-2 transition-all shrink-0",
                isActive
                  ? "bg-[var(--background)] border-[var(--accent)] text-[var(--foreground)] font-semibold shadow-xs"
                  : "bg-transparent border-transparent text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isActive ? "text-[var(--accent)]" : "text-[var(--muted)]")} />
              <span className="truncate max-w-[130px] font-mono text-[11px]">{tab.title}</span>

              {tab.closable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 rounded hover:bg-[var(--surface-active)] text-[var(--muted)] hover:text-[var(--foreground)] opacity-50 group-hover:opacity-100 transition-opacity ml-1"
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
