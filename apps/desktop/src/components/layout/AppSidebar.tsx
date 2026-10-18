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
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    category: "Overview",
    items: [
      { id: "overview", title: "Cluster Overview", icon: LayoutDashboard },
    ],
  },
  {
    category: "Workloads",
    items: [
      { id: "pods", title: "Pods", icon: Box },
      { id: "deployments", title: "Deployments", icon: Layers },
      { id: "replicasets", title: "ReplicaSets", icon: Repeat },
      { id: "statefulsets", title: "StatefulSets", icon: Database },
      { id: "daemonsets", title: "DaemonSets", icon: Cpu },
      { id: "jobs", title: "Jobs & CronJobs", icon: Clock },
    ],
  },
  {
    category: "Networking",
    items: [
      { id: "services", title: "Services", icon: Network },
      { id: "endpoints", title: "Endpoints", icon: Radio },
      { id: "ingresses", title: "Ingresses & Gateways", icon: Network },
      { id: "networkpolicies", title: "Network Policies", icon: Shield },
    ],
  },
  {
    category: "Config & Storage",
    items: [
      { id: "configmaps", title: "ConfigMaps", icon: FileCode },
      { id: "secrets", title: "Secrets", icon: FolderLock },
      { id: "persistentvolumes", title: "Persistent Volumes", icon: HardDrive },
      { id: "storageclasses", title: "Storage Classes", icon: HardDrive },
    ],
  },
  {
    category: "Access & Custom",
    items: [
      { id: "serviceaccounts", title: "Service Accounts", icon: Users },
      { id: "rbac", title: "Roles & Bindings", icon: Key },
      { id: "crds", title: "Custom Resources", icon: Boxes },
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
                          "w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-md transition-colors text-left",
                          isActive
                            ? "bg-[var(--surface-active)] text-[var(--accent)] font-medium border-l-2 border-[var(--accent)]"
                            : "text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                        )}
                        title={sidebarCollapsed ? item.title : undefined}
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[var(--accent)]" : "text-[var(--muted)]")} />
                        {!sidebarCollapsed && <span className="truncate">{item.title}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
