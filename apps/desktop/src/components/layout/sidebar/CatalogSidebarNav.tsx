"use client";

import * as React from "react";
import {
  Activity,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  Link2,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import type { FleetCatalogSection } from "@/stores/layoutStore";

interface CatalogItemProps {
  id: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
  count?: number;
  collapsed: boolean;
  onClick: () => void;
}

function CatalogItem({
  id,
  label,
  icon: Icon,
  active = false,
  count,
  collapsed,
  onClick,
}: CatalogItemProps) {
  return (
    <Tooltip content={label} side="right" disabled={!collapsed}>
      <button
        type="button"
        data-testid={`catalog-nav-${id}`}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-left transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
          active
            ? "border border-[var(--border)] bg-[var(--surface-active)] font-semibold text-[var(--foreground)]"
            : "text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
        )}
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            active
              ? "text-[var(--accent)]"
              : "text-[var(--muted)] group-hover:text-[var(--foreground)]",
          )}
          aria-hidden="true"
        />
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && count !== undefined && (
          <span className="ml-auto rounded border border-[var(--border)] bg-black/[0.03] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-[var(--muted)] dark:bg-white/[0.04]">
            {count}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

export function CatalogSidebarNav({
  sidebarCollapsed,
  activeSection,
  fleetActive,
  activeLearning,
  contextCount,
  onSelectSection,
  onSelectLearning,
}: {
  sidebarCollapsed: boolean;
  activeSection: FleetCatalogSection;
  fleetActive: boolean;
  activeLearning: boolean;
  contextCount: number;
  onSelectSection: (section: FleetCatalogSection) => void;
  onSelectLearning: () => void;
}) {
  const isSectionActive = (section: FleetCatalogSection) =>
    fleetActive && activeSection === section;
  return (
    <div className="space-y-4">
      {!sidebarCollapsed && (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-2 pb-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Browse
          </span>
          <span className="font-mono text-[9px] text-[var(--muted)]/70">
            kubeconfig
          </span>
        </div>
      )}

      <div className="space-y-0.5">
        {!sidebarCollapsed && (
          <p className="px-2 pb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            General
          </p>
        )}
        <CatalogItem
          id="clusters"
          label="Clusters"
          icon={LayoutGrid}
          active={isSectionActive("clusters")}
          count={contextCount}
          collapsed={sidebarCollapsed}
          onClick={() => onSelectSection("clusters")}
        />
        <CatalogItem
          id="kubeconfigs"
          label="Kubeconfigs"
          icon={KeyRound}
          active={isSectionActive("kubeconfigs")}
          collapsed={sidebarCollapsed}
          onClick={() => onSelectSection("kubeconfigs")}
        />
        <CatalogItem
          id="links"
          label="Web Links"
          icon={Link2}
          active={isSectionActive("links")}
          collapsed={sidebarCollapsed}
          onClick={() => onSelectSection("links")}
        />
        <CatalogItem
          id="learning"
          label="Learning Center"
          icon={GraduationCap}
          active={activeLearning}
          collapsed={sidebarCollapsed}
          onClick={onSelectLearning}
        />
      </div>

      <div className="space-y-0.5">
        {!sidebarCollapsed && (
          <p className="px-2 pb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Fleet
          </p>
        )}
        <CatalogItem
          id="health"
          label="Fleet Health"
          icon={Activity}
          active={isSectionActive("health")}
          collapsed={sidebarCollapsed}
          onClick={() => onSelectSection("health")}
        />
      </div>
    </div>
  );
}
