"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { InspectorTabId, InspectorTabItem } from "../lib/inspectorTabs";

export interface InspectorTabBarProps {
  tabs: InspectorTabItem[];
  activeTab: InspectorTabId;
  onSelectTab: (id: InspectorTabId) => void;
}

export function InspectorTabBar({
  tabs,
  activeTab,
  onSelectTab,
}: InspectorTabBarProps) {
  return (
    <div className="h-11 border-b border-[var(--border)] px-2 sm:px-4 flex items-center bg-[var(--surface)] shrink-0 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] border border-[var(--border)] text-xs select-none">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              data-testid={`inspector-tab-${t.id}`}
              onClick={() => onSelectTab(t.id)}
              className={cn(
                "relative px-2.5 py-1 text-xs rounded-md capitalize transition-colors font-medium cursor-pointer flex items-center gap-1.5 outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--accent)]",
                isActive
                  ? "text-[var(--foreground)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="inspector-active-tab-indicator"
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 35,
                  }}
                  className="absolute inset-0 rounded-md bg-[var(--surface-elevated)] dark:bg-white/10 shadow-xs border border-[var(--border)] -z-10 motion-reduce:transition-none"
                />
              )}
              <Icon
                className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  isActive ? "text-[var(--accent)]" : "text-[var(--muted)]",
                )}
              />
              <span>{t.label}</span>
              {t.count !== null && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[9px] font-mono tabular-nums transition-colors",
                    isActive
                      ? "bg-[var(--accent)]/15 text-[var(--accent)] font-bold"
                      : "bg-black/5 dark:bg-white/5 text-[var(--muted)]",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
