"use client";

import { LayoutDashboard, Server } from "lucide-react";
import { useTabStore } from "@/stores/tabStore";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    scope: "single",
    label: "This cluster",
    icon: LayoutDashboard,
    tabId: "overview",
    title: "Cluster Overview",
    testId: "overview-view-single",
  },
  {
    scope: "fleet",
    label: "All clusters",
    icon: Server,
    tabId: "fleet",
    title: "All Clusters",
    testId: "overview-view-fleet",
  },
] as const;

export function OverviewViewSwitch({ active }: { active: "single" | "fleet" }) {
  const openTab = useTabStore((state) => state.openTab);

  return (
    <div
      role="group"
      aria-label="Overview scope"
      className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[11px] font-mono"
    >
      {OPTIONS.map((option) => {
        const isActive = option.scope === active;
        const Icon = option.icon;
        return (
          <button
            key={option.scope}
            type="button"
            onClick={() => {
              if (isActive) return;
              openTab({
                id: option.tabId,
                title: option.title,
                icon: option.tabId === "fleet" ? "Server" : "LayoutDashboard",
                closable: option.tabId !== "overview",
              });
            }}
            aria-pressed={isActive}
            data-testid={option.testId}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
              isActive
                ? "bg-[var(--surface-active)] text-[var(--foreground)] font-semibold shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
