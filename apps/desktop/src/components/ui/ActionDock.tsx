"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface DockActionItem {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: "default" | "primary" | "warning" | "accent";
  badge?: string | number;
  shortcut?: string;
}

export interface ActionDockProps {
  items: DockActionItem[];
  className?: string;
  size?: "sm" | "md";
}

export function ActionDock({ items, className, size = "md" }: ActionDockProps) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  return (
    <div
      role="toolbar"
      aria-label="Cluster Quick Actions Dock"
      className={cn(
        "relative flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs select-none",
        size === "sm" ? "h-9" : "h-10",
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isHovered = hoveredId === item.id;
        const isPrimary = item.variant === "primary";
        const isAccent = item.variant === "accent";

        return (
          <div key={item.id} className="relative flex items-center justify-center">
            <motion.button
              type="button"
              onClick={item.onClick}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(item.id)}
              onBlur={() => setHoveredId(null)}
              aria-label={item.label}
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className={cn(
                "relative flex items-center justify-center rounded-lg transition-colors cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                size === "sm" ? "w-7 h-7" : "w-8 h-8",
                isPrimary
                  ? "bg-[#f08a42] text-zinc-950 hover:bg-[#ff9d5c] font-semibold"
                  : isAccent
                  ? "bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30"
                  : "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon
                className={cn(
                  size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4",
                  isPrimary ? "text-zinc-950" : isAccent ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
                aria-hidden="true"
              />

              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-1 px-1 rounded-full text-[9px] font-mono font-bold bg-[var(--accent)] text-white leading-tight">
                  {item.badge}
                </span>
              )}
            </motion.button>

            {/* Micro-Tooltip on Hover */}
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 2, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none absolute -bottom-8 px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-[10px] font-mono text-[var(--foreground)] shadow-md flex items-center gap-1.5 whitespace-nowrap z-40"
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <kbd className="px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 text-[9px] text-[var(--muted)]">
                    {item.shortcut}
                  </kbd>
                )}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}
