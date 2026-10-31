"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { NavGroup, NavItem } from "./navConfig";

function groupTestId(category: string) {
  return category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
        const isGroupCollapsed = collapsedGroups[group.category] ?? true;
        const hasActiveItem = group.items.some(
          (item) => item.id === activeTabId,
        );

        return (
          <div key={group.category} className="space-y-0.5">
            {!sidebarCollapsed ? (
              <button
                type="button"
                data-nav-group={group.category}
                data-testid={`nav-group-${groupTestId(group.category)}`}
                aria-expanded={!isGroupCollapsed}
                onClick={() => onToggleGroup(group.category)}
                className={cn(
                  "relative w-full flex items-center justify-between px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                  isGroupCollapsed && hasActiveItem
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {isGroupCollapsed && hasActiveItem && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--accent)]"
                    />
                    <span className="sr-only">Current section</span>
                  </>
                )}
                <span className="flex items-center gap-1.5">
                  {group.category}
                </span>
                {isGroupCollapsed ? (
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 transition-colors",
                      hasActiveItem ? "text-[var(--accent)]" : undefined,
                    )}
                  />
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
                            data-testid={`nav-badge-${item.id}`}
                            className={cn(
                              "ml-1.5 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-black/[0.05] px-1 font-mono text-[10px] font-medium leading-none tracking-tight tabular-nums dark:bg-white/[0.06]",
                              item.badgeVariant === "soon"
                                ? "text-[var(--muted)] opacity-60"
                                : item.badgeVariant === "warning"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : item.badgeVariant === "accent"
                                    ? "text-[var(--accent)]"
                                    : "text-[var(--muted)]",
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
