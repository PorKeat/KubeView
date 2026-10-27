"use client";

import { ArrowLeft, Settings } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

export function SidebarFooter({
  isSettingsActive,
  sidebarCollapsed,
  settingsReturnTab,
  onBack,
  onSettingsClick,
}: {
  isSettingsActive: boolean;
  sidebarCollapsed: boolean;
  settingsReturnTab?: { id: string; title: string };
  onBack: () => void;
  onSettingsClick: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-[var(--border)] p-2">
      {isSettingsActive ? (
        <Tooltip
          content={
            settingsReturnTab
              ? `Back to ${settingsReturnTab.title}`
              : "Back to overview"
          }
          side="right"
          disabled={!sidebarCollapsed}
        >
          <button
            type="button"
            data-testid="nav-back"
            onClick={onBack}
            aria-label={
              settingsReturnTab
                ? `Back to ${settingsReturnTab.title}`
                : "Back to overview"
            }
            className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <ArrowLeft
              className="h-4 w-4 shrink-0 text-[var(--muted)] group-hover:text-[var(--foreground)]"
              aria-hidden="true"
            />
            {!sidebarCollapsed && (
              <>
                <span className="truncate">Back</span>
                <span
                  className="ml-auto max-w-[72px] truncate font-mono text-[9px] text-[var(--muted)]"
                  title={settingsReturnTab?.title}
                >
                  {settingsReturnTab?.title ?? "Overview"}
                </span>
              </>
            )}
          </button>
        </Tooltip>
      ) : (
        <Tooltip
          content="Settings"
          shortcut="⌘,"
          side="right"
          disabled={!sidebarCollapsed}
        >
          <button
            type="button"
            data-testid="nav-item-settings"
            onClick={onSettingsClick}
            aria-label="Settings"
            className="group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <Settings
              className="h-4 w-4 shrink-0 text-[var(--muted)] group-hover:text-[var(--foreground)]"
              aria-hidden="true"
            />
            {!sidebarCollapsed && (
              <>
                <span className="truncate">Settings</span>
                <kbd className="ml-auto rounded border border-[var(--border)] bg-black/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)] dark:bg-white/[0.04]">
                  ⌘,
                </kbd>
              </>
            )}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
