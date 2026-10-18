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
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: "default" | "warning" | "accent";
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    category: "Overview",
    items: [
      { id: "overview", title: "Cluster Overview", icon: LayoutDashboard, badge: "2", badgeVariant: "warning" },
    ],
  },
  {
    category: "Workloads",
    items: [
      { id: "pods", title: "Pods", icon: Box, badge: 42 },
      { id: "deployments", title: "Deployments", icon: Layers, badge: 12 },
      { id: "replicasets", title: "ReplicaSets", icon: Repeat },
      { id: "statefulsets", title: "StatefulSets", icon: Database, badge: 2 },
      { id: "daemonsets", title: "DaemonSets", icon: Cpu, badge: 1 },
      { id: "jobs", title: "Jobs & CronJobs", icon: Clock },
    ],
  },
  {
    category: "Networking",
    items: [
      { id: "services", title: "Services", icon: Network, badge: 8 },
      { id: "endpoints", title: "Endpoints", icon: Radio },
      { id: "ingresses", title: "Ingresses & Gateways", icon: Network, badge: 3 },
      { id: "networkpolicies", title: "Network Policies", icon: Shield },
    ],
  },
  {
    category: "Config & Storage",
    items: [
      { id: "configmaps", title: "ConfigMaps", icon: FileCode, badge: 9 },
      { id: "secrets", title: "Secrets", icon: FolderLock, badge: 14 },
      { id: "persistentvolumes", title: "Persistent Volumes", icon: HardDrive, badge: 4 },
      { id: "storageclasses", title: "Storage Classes", icon: HardDrive },
    ],
  },
  {
    category: "Access & Custom",
    items: [
      { id: "serviceaccounts", title: "Service Accounts", icon: Users },
      { id: "rbac", title: "Roles & Bindings", icon: Key },
      { id: "crds", title: "Custom Resources", icon: Boxes, badge: 6 },
    ],
  },
];

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore();
  const { activeTabId, openTab } = useTabStore();
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroup = (category: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleItemClick = (item: NavItem) => {
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
        {NAVIGATION_GROUPS.map((group) => {
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
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-all text-left group relative",
                          isActive
                            ? "bg-white/[0.08] text-[var(--accent)] font-semibold shadow-inner"
                            : "text-[var(--foreground)] hover:bg-white/[0.04]"
                        )}
                        title={sidebarCollapsed ? item.title : undefined}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_rgba(240,138,66,0.8)]" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-[var(--accent)]" : "text-[var(--muted)] group-hover:text-[var(--foreground)]")} />
                          {!sidebarCollapsed && <span className="truncate">{item.title}</span>}
                        </div>

                        {!sidebarCollapsed && item.badge !== undefined && (
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded text-[10px] font-mono font-medium shrink-0 ml-1.5 border",
                              item.badgeVariant === "warning"
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                                : item.badgeVariant === "accent"
                                ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/25"
                                : "text-[var(--muted)] bg-white/[0.06] border-white/10"
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
        <div className="p-2 border-t border-[var(--border)] shrink-0 bg-black/20">
          <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-between text-xs">
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
