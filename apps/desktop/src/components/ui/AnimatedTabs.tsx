"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
  badgeVariant?: "default" | "warning" | "accent";
}

export interface AnimatedTabsProps<T extends string = string> {
  tabs: TabOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  pillClassName?: string;
  layoutId?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}

export function AnimatedTabs<T extends string = string>({
  tabs,
  activeId,
  onChange,
  className,
  pillClassName,
  layoutId = "animated-tab-pill",
  size = "md",
  ariaLabel = "Navigation tabs",
}: AnimatedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative flex items-center p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs select-none",
        size === "sm" ? "h-8" : "h-9",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => {
              const currentIndex = tabs.findIndex((t) => t.id === activeId);
              if (e.key === "ArrowRight") {
                e.preventDefault();
                const next = tabs[(currentIndex + 1) % tabs.length];
                onChange(next.id);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                const prev =
                  tabs[(currentIndex - 1 + tabs.length) % tabs.length];
                onChange(prev.id);
              }
            }}
            className={cn(
              "relative z-10 flex-1 flex items-center justify-center gap-1.5 px-3 rounded-lg font-medium transition-colors cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              size === "sm" ? "h-6 text-[11px]" : "h-7 text-xs",
              isActive
                ? "text-[var(--foreground)] font-semibold"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {/* Sliding Pill Indicator */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 35,
                }}
                className={cn(
                  "absolute inset-0 rounded-lg bg-[var(--surface-active)] shadow-xs border border-[var(--border)]/80 -z-10",
                  "motion-reduce:transition-none",
                  pillClassName,
                )}
              />
            )}

            {Icon && (
              <Icon
                className={cn(
                  "shrink-0 transition-colors",
                  size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5",
                  isActive ? "text-[var(--accent)]" : "text-[var(--muted)]",
                )}
                aria-hidden="true"
              />
            )}

            <span className="truncate">{tab.label}</span>

            {tab.badge !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums leading-none",
                  tab.badgeVariant === "warning"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    : tab.badgeVariant === "accent"
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20"
                      : "bg-black/[0.05] dark:bg-white/[0.08] text-[var(--muted)]",
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
