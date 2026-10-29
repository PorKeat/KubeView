"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { NavGroup, NavItem } from "./navConfig";

export function SidebarNavList({
  groups,
  collapsedGroups,
  sidebarCollapsed,
  activeTabId,
  onToggleGroup,
  onItemClick,
}: {
  groups: NavGroup[];
  collapsedGroups: Record<string, boolean>;
  sidebarCollapsed: boolean;
  activeTabId: string;
  onToggleGroup: (category: string) => void;
  onItemClick: (item: NavItem) => void;
}) {
  return (
    <>
      {groups.map((group) => {
        const isGroupCollapsed = collapsedGroups[group.category];

        return (
          <div key={group.category} className="space-y-0.5">
            {!sidebarCollapsed ? (
              <button
                onClick={() => onToggleGroup(group.category)}
                className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] rounded transition-colors cursor-pointer"
              >
                <span>{group.category}</span>
                {isGroupCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="h-[1px] bg-[var(--border)] my-1" />
            )}

            {(!isGroupCollapsed || sidebarCollapsed) && (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTabId === item.id;

                  return (
                    <Tooltip
                      key={item.id}
                      content={item.title}
                      side="right"
                      disabled={!sidebarCollapsed || item.disabled}
                    >
                      <button
                        data-testid={`nav-item-${item.id}`}
                        disabled={item.disabled}
                        onClick={() => onItemClick(item)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left group relative",
                          item.desktopHidden && "lg:hidden",
                          item.disabled
                            ? "opacity-35 cursor-not-allowed select-none hover:bg-transparent text-[var(--muted)]"
                            : isActive
                              ? "bg-[var(--surface-active)] text-[var(--foreground)] font-semibold border border-[var(--border)] cursor-pointer"
                              : "text-[var(--foreground)] hover:bg-[var(--surface-hover)] cursor-pointer",
                        )}
                        aria-label={item.title}
                        title={
                          item.disabled
                            ? `${item.title} (Scheduled for upcoming Phase 4)`
                            : undefined
                        }
                      >
                        {isActive && !item.disabled && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-[var(--accent)]" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isActive
                                ? "text-[var(--accent)]"
                                : "text-[var(--muted)] group-hover:text-[var(--foreground)]",
                            )}
                          />
                          {!sidebarCollapsed && (
                            <span className="truncate">
                              {item.shortTitle ?? item.title}
                            </span>
                          )}
                        </div>

                        {!sidebarCollapsed && item.badge !== undefined && (
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded text-[11px] font-mono font-medium shrink-0 ml-1.5 border tracking-tight tabular-nums",
                              item.badgeVariant === "soon"
                                ? "bg-black/[0.03] dark:bg-white/[0.03] text-[var(--muted)] border-black/[0.06] dark:border-white/[0.06] opacity-75"
                                : item.badgeVariant === "warning"
                                  ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/25"
                                  : item.badgeVariant === "accent"
                                    ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/25"
                                    : "text-[var(--muted)] bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
