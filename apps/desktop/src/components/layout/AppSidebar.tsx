"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Box,
  Layers,
  Repeat,
  Database,
  Cpu,
  Clock,
  Network,
  Radio,
  Shield,
  FileCode,
  HardDrive,
  Users,
  Key,
  FolderLock,
  Boxes,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { useTabStore } from "@/stores/tabStore";
import { useClusterStore } from "@/stores/clusterStore";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: "default" | "warning" | "accent" | "soon";
  disabled?: boolean;
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore();
  const { activeTabId, openTab } = useTabStore();
  const { clusterOverview, totalPodsCount, pods, setCurrentNamespace, loadPods } = useClusterStore();
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const realPodsCount = clusterOverview?.totalPods ?? (totalPodsCount > 0 ? totalPodsCount : pods.length);

  const navigationGroups: NavGroup[] = React.useMemo(() => [
    {
      category: "Overview",
      items: [
        { id: "overview", title: "Cluster Overview", icon: LayoutDashboard },
      ],
    },
    {
      category: "Workloads",
      items: [
        {
          id: "pods",
          title: "Pods",
          icon: Box,
          badge: realPodsCount > 0 ? realPodsCount : undefined,
          badgeVariant: "accent",
        },
        { id: "deployments", title: "Deployments", icon: Layers, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "replicasets", title: "ReplicaSets", icon: Repeat, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "statefulsets", title: "StatefulSets", icon: Database, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "daemonsets", title: "DaemonSets", icon: Cpu, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "jobs", title: "Jobs & CronJobs", icon: Clock, badge: "Soon", badgeVariant: "soon", disabled: true },
      ],
    },
    {
      category: "Networking",
      items: [
        { id: "services", title: "Services", icon: Network, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "endpoints", title: "Endpoints", icon: Radio, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "ingresses", title: "Ingresses & Gateways", icon: Network, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "networkpolicies", title: "Network Policies", icon: Shield, badge: "Soon", badgeVariant: "soon", disabled: true },
      ],
    },
    {
      category: "Config & Storage",
      items: [
        { id: "configmaps", title: "ConfigMaps", icon: FileCode, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "secrets", title: "Secrets", icon: FolderLock, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "persistentvolumes", title: "Persistent Volumes", icon: HardDrive, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "storageclasses", title: "Storage Classes", icon: HardDrive, badge: "Soon", badgeVariant: "soon", disabled: true },
      ],
    },
    {
      category: "Access & Custom",
      items: [
        { id: "serviceaccounts", title: "Service Accounts", icon: Users, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "rbac", title: "Roles & Bindings", icon: Key, badge: "Soon", badgeVariant: "soon", disabled: true },
        { id: "crds", title: "Custom Resources", icon: Boxes, badge: "Soon", badgeVariant: "soon", disabled: true },
      ],
    },
  ], [realPodsCount]);

  const toggleGroup = (category: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleItemClick = (item: NavItem) => {
    if (item.disabled) {
      return;
    }

    if (item.id === "pods") {
      setCurrentNamespace("all");
      loadPods("all");
    }

    openTab({
      id: item.id,
      title: item.title,
      closable: item.id !== "overview",
    });
  };

  return (
    <aside
      className={cn(
        "h-full border-r border-[var(--border)] bg-[var(--surface)] flex flex-col select-none transition-all duration-200 shrink-0",
        sidebarCollapsed ? "w-14" : "w-56"
      )}
    >
      {/* Sidebar Header / Collapse Toggle */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[var(--border)] shrink-0">
        {!sidebarCollapsed && (
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
            Resources
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors ml-auto"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-3">
        {navigationGroups.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.category];

          return (
            <div key={group.category} className="space-y-0.5">
              {!sidebarCollapsed ? (
                <button
                  onClick={() => toggleGroup(group.category)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)] rounded transition-colors"
                >
                  <span className="uppercase tracking-wider">{group.category}</span>
                  {isGroupCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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
                      <button
                        key={item.id}
                        data-testid={`nav-item-${item.id}`}
                        disabled={item.disabled}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-all text-left group relative",
                          item.disabled
                            ? "opacity-35 cursor-not-allowed select-none hover:bg-transparent text-[var(--muted)]"
                            : isActive
                            ? "bg-[var(--accent)]/10 dark:bg-white/[0.08] text-[var(--accent)] font-semibold shadow-inner cursor-pointer"
                            : "text-[var(--foreground)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer"
                        )}
                        title={
                          item.disabled
                            ? `${item.title} (Scheduled for upcoming Phase 4)`
                            : sidebarCollapsed
                            ? item.title
                            : undefined
                        }
                      >
                        {isActive && !item.disabled && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_rgba(240,138,66,0.8)]" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-[var(--accent)]" : "text-[var(--muted)] group-hover:text-[var(--foreground)]")} />
                          {!sidebarCollapsed && <span className="truncate">{item.title}</span>}
                        </div>

                        {!sidebarCollapsed && item.badge !== undefined && (
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded text-[9px] font-mono font-medium shrink-0 ml-1.5 border tracking-tight",
                              item.badgeVariant === "soon"
                                ? "bg-black/[0.03] dark:bg-white/[0.03] text-[var(--muted)] border-black/[0.06] dark:border-white/[0.06] opacity-75"
                                : item.badgeVariant === "warning"
                                ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/25"
                                : item.badgeVariant === "accent"
                                ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/25"
                                : "text-[var(--muted)] bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Mini Cluster Card */}
      {!sidebarCollapsed ? (
        <div className="p-2 border-t border-[var(--border)] shrink-0 bg-slate-50/50 dark:bg-black/20">
          <div className="p-2 rounded-lg bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <div className="min-w-0">
                <div className="font-mono text-[11px] font-semibold text-[var(--foreground)] truncate">
                  Cluster Live
                </div>
                <div className="text-[9px] text-[var(--muted)] font-mono">
                  Supervised Engine
                </div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20">
              v1.0.0
            </span>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-[var(--border)] flex justify-center shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" title="Cluster Active" />
        </div>
      )}
    </aside>
  );
}
