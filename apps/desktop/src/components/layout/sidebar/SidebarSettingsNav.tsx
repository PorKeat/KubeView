"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { SettingsSection } from "@/stores/settingsStore";
import { SETTINGS_NAV_GROUPS } from "./navConfig";

function groupTestId(category: string) {
  return category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SidebarSettingsNav({
  sidebarCollapsed,
  activeSection,
  onSectionClick,
}: {
  sidebarCollapsed: boolean;
  activeSection: SettingsSection;
  onSectionClick: (section: SettingsSection) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = React.useState<
    Record<string, boolean>
  >({});

  const toggleGroup = (category: string) => {
    setCollapsedGroups((previous) => ({
      ...previous,
      [category]: !(previous[category] ?? false),
    }));
  };

  return (
    <div className="space-y-0.5">
      {SETTINGS_NAV_GROUPS.map((group) => {
        const isGroupCollapsed = collapsedGroups[group.category] ?? false;
        const hasActiveSection = group.items.some(
          (item) => item.section === activeSection,
        );

        return (
          <div key={group.category} className="space-y-0.5">
            {!sidebarCollapsed ? (
              <button
                type="button"
                data-testid={`settings-group-${groupTestId(group.category)}`}
                aria-expanded={!isGroupCollapsed}
                onClick={() => toggleGroup(group.category)}
                className={cn(
                  "relative w-full flex items-center justify-between px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                  isGroupCollapsed && hasActiveSection
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {isGroupCollapsed && hasActiveSection && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--accent)]"
                  />
                )}
                <span className="flex items-center gap-1.5">
                  {group.category}
                </span>
                {isGroupCollapsed ? (
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 transition-colors",
                      hasActiveSection ? "text-[var(--accent)]" : undefined,
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
                {group.items.map((section) => {
                  const Icon = section.icon;
                  const isActiveSection = activeSection === section.section;
                  return (
                    <Tooltip
                      key={section.id}
                      content={section.title}
                      side="right"
                      disabled={!sidebarCollapsed}
                    >
                      <button
                        type="button"
                        data-testid={`settings-nav-${section.testId}`}
                        aria-current={isActiveSection ? "page" : undefined}
                        onClick={() => onSectionClick(section.section)}
                        title={section.description}
                        className={cn(
                          "relative w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left group",
                          isActiveSection
                            ? "bg-[var(--surface-active)] text-[var(--foreground)] font-semibold border border-[var(--border)] cursor-pointer"
                            : "text-[var(--foreground)] border border-transparent hover:bg-[var(--surface-hover)] cursor-pointer",
                        )}
                        aria-label={section.title}
                      >
                        {isActiveSection && (
                          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
                        )}
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            isActiveSection
                              ? "text-[var(--accent)]"
                              : "text-[var(--muted)] group-hover:text-[var(--foreground)]",
                          )}
                          aria-hidden="true"
                        />
                        {!sidebarCollapsed && (
                          <span className="min-w-0 truncate">
                            {section.title}
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
    </div>
  );
}
