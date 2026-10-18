"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { useTabStore, TabItem } from "@/stores/tabStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { cn } from "@/lib/utils";

export function TabBar() {
  const { openTabs, activeTabId, setActiveTab, closeTab } = useTabStore();
  const { setCommandPaletteOpen } = useLayoutStore();

  return (
    <div className="h-9 w-full border-b border-[var(--border)] bg-[var(--surface)] flex items-center px-1 overflow-x-auto select-none shrink-0">
      <div className="flex items-center gap-1 flex-1">
        {openTabs.map((tab: TabItem) => {
          const isActive = activeTabId === tab.id;

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "group h-7 px-3 flex items-center gap-2 text-xs rounded-t-md cursor-pointer border-t-2 transition-colors",
                isActive
                  ? "bg-[var(--background)] border-[var(--accent)] text-[var(--foreground)] font-medium shadow-xs"
                  : "bg-transparent border-transparent text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              )}
            >
              <span className="truncate max-w-[130px]">{tab.title}</span>

              {tab.closable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] opacity-70 group-hover:opacity-100 transition-opacity"
                  title="Close tab (Cmd+W)"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* New Tab Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors ml-1"
          title="Open Resource (Cmd+K)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
