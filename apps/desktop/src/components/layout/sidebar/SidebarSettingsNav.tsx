"use client";

import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { SettingsSection } from "@/stores/settingsStore";
import { SETTINGS_NAV_ITEMS } from "./navConfig";

export function SidebarSettingsNav({
  sidebarCollapsed,
  activeSection,
  onSectionClick,
}: {
  sidebarCollapsed: boolean;
  activeSection: SettingsSection;
  onSectionClick: (section: SettingsSection) => void;
}) {
  return (
    <div className="space-y-0.5">
      {!sidebarCollapsed && (
        <div className="px-2 py-1 text-xs font-medium text-[var(--muted)]">
          Preferences
        </div>
      )}
      {SETTINGS_NAV_ITEMS.map((section) => {
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
              className={cn(
                "relative w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg transition-colors text-left group",
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
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {section.title}
                  </span>
                  <span className="block truncate text-[9px] text-[var(--muted)]">
                    {section.description}
                  </span>
                </span>
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
