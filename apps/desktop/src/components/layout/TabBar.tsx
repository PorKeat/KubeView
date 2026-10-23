"use client";

import * as React from "react";
import { motion } from "motion/react";
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
  Settings,
} from "lucide-react";
import { useTabStore, TabItem } from "@/stores/tabStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

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
      case "daemonsets":
        return Cpu;
      case "jobs":
        return Clock;
      case "settings":
        return Settings;
      default:
        return Boxes;
    }
  };

  return (
    <div
      className="h-10 w-full border-b border-[var(--border)] bg-[var(--surface)] flex items-center px-3 overflow-x-auto select-none shrink-0 scrollbar-none"
      role="tablist"
      aria-label="Open tabs"
    >
      <div className="flex items-center gap-1.5 flex-1">
        {openTabs.map((tab: TabItem) => {
          const isActive = activeTabId === tab.id;
          const Icon = getTabIcon(tab.id);

          return (
            <div
              key={tab.id}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              aria-label={`${tab.title} tab`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveTab(tab.id);
                }
              }}
              className={cn(
                "group relative h-7 px-3 flex items-center gap-2 text-xs rounded-md cursor-pointer transition-colors shrink-0 select-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                isActive
                  ? "text-[var(--foreground)] font-medium"
                  : "bg-transparent text-[var(--muted)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-[var(--foreground)]",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="tabbar-active-pill"
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 35,
                  }}
                  className="absolute inset-0 rounded-md bg-black/[0.06] dark:bg-white/[0.08] border border-[var(--border)] shadow-xs -z-10 motion-reduce:transition-none"
                />
              )}

              <Icon
                className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-colors",
                  isActive ? "text-[var(--accent)]" : "text-[var(--muted)]",
                )}
                aria-hidden="true"
              />
              <span className="truncate max-w-[130px] font-sans text-xs">
                {tab.title}
              </span>

              {tab.closable && (
                <Tooltip
                  content={`Close ${tab.title}`}
                  shortcut="⌘W"
                  side="bottom"
                >
                  <button
                    type="button"
                    aria-label={`Close ${tab.title} tab`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-50 group-hover:opacity-100 transition-opacity ml-0.5 focus-visible:ring-1 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
            </div>
          );
        })}

        {/* New Tab Quick-Open Trigger */}
        <Tooltip content="Open New Tab" shortcut="⌘K" side="bottom">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Open new tab (Command K)"
            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors ml-0.5 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
