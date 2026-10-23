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
  X,
  Settings,
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
  const {
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useLayoutStore();
  const { activeTabId, openTab } = useTabStore();
  const {
    clusterOverview,
    totalPodsCount,
    pods,
    deployments,
    replicaSets,
    statefulSets,
    daemonSets,
    jobs,
    cronJobs,
    totalJobsCount,
    totalCronJobsCount,
    loadPods,
    loadDeployments,
    loadReplicaSets,
    loadStatefulSets,
    loadDaemonSets,
    loadJobs,
    loadCronJobs,
    setJobOwnerFilter,
    setJobsViewMode,
    setCurrentNamespace,
    setPodNodeFilter,
    setPodLabelFilter,
  } = useClusterStore();
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (mobileSidebarOpen && sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
  }, [mobileSidebarOpen, setSidebarCollapsed, sidebarCollapsed]);

  React.useEffect(() => {
    if (!mobileSidebarOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  const realPodsCount = clusterOverview?.totalPods ?? (totalPodsCount > 0 ? totalPodsCount : pods.length);
  const deploymentCount = clusterOverview?.workloads?.deployments?.total ?? deployments.length;
  const replicaSetCount = clusterOverview?.workloads?.replicaSets?.total ?? replicaSets.length;
  const statefulSetCount = clusterOverview?.workloads?.statefulSets?.total ?? statefulSets.length;
  const daemonSetCount = clusterOverview?.workloads?.daemonSets?.total ?? daemonSets.length;
  const jobsCount = clusterOverview?.workloads?.jobs?.total ?? (totalJobsCount || jobs.length);
  const cronJobsCount = clusterOverview?.workloads?.cronJobs?.total ?? (totalCronJobsCount || cronJobs.length);
  const jobsAndCronJobsCount = jobsCount + cronJobsCount;

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
        { id: "deployments", title: "Deployments", icon: Layers, badge: deploymentCount > 0 ? deploymentCount : undefined, badgeVariant: "accent" },
        { id: "replicasets", title: "ReplicaSets", icon: Repeat, badge: replicaSetCount > 0 ? replicaSetCount : undefined, badgeVariant: "accent" },
        { id: "statefulsets", title: "StatefulSets", icon: Database, badge: statefulSetCount > 0 ? statefulSetCount : undefined, badgeVariant: "accent" },
        { id: "daemonsets", title: "DaemonSets", icon: Cpu, badge: daemonSetCount > 0 ? daemonSetCount : undefined, badgeVariant: "accent" },
        { id: "jobs", title: "Jobs & CronJobs", icon: Clock, badge: jobsAndCronJobsCount > 0 ? jobsAndCronJobsCount : undefined, badgeVariant: "accent" },
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
  ], [realPodsCount, deploymentCount, replicaSetCount, statefulSetCount, daemonSetCount, jobsAndCronJobsCount]);

  const toggleGroup = (category: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleItemClick = (item: NavItem) => {
    if (item.disabled) {
      return;
    }

    if (item.id === "pods") {
      setCurrentNamespace("all");
      setPodNodeFilter(null);
      setPodLabelFilter(null, null);
      loadPods("all");
    }

    if (item.id === "deployments") {
      setCurrentNamespace("all");
      loadDeployments("all");
    }

    if (item.id === "replicasets") {
      setCurrentNamespace("all");
      loadReplicaSets("all");
    }

    if (item.id === "statefulsets") {
      setCurrentNamespace("all");
      loadStatefulSets("all");
    }

    if (item.id === "daemonsets") {
      setCurrentNamespace("all");
      loadDaemonSets("all");
    }

    if (item.id === "jobs") {
      setCurrentNamespace("all");
      setJobOwnerFilter(null);
      setJobsViewMode("jobs");
      loadJobs("all");
      loadCronJobs("all");
    }

    openTab({
      id: item.id,
      title: item.title,
      closable: item.id !== "overview",
    });
    setMobileSidebarOpen(false);
  };

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        id="resource-navigation"
        aria-label="Resource navigation"
        className={cn(
          "h-full border-r border-[var(--border)] bg-[var(--surface)] flex-col select-none transition-all duration-200 shrink-0",
          mobileSidebarOpen
            ? "fixed inset-y-0 left-0 z-50 flex w-64 md:static md:z-auto md:w-56"
            : "hidden md:flex",
          !mobileSidebarOpen && (sidebarCollapsed ? "w-14" : "w-56")
        )}
      >
      {/* Sidebar Header / Collapse Toggle */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--border)] shrink-0">
        {!sidebarCollapsed && (
          <span className="text-xs font-medium text-[var(--muted)]">
            Resources
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={toggleSidebar}
            className="hidden md:inline-flex p-1.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto py-2.5 px-3 space-y-3">
        {navigationGroups.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.category];

          return (
            <div key={group.category} className="space-y-0.5">
              {!sidebarCollapsed ? (
                <button
                  onClick={() => toggleGroup(group.category)}
                  className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] rounded transition-colors cursor-pointer"
                >
                  <span>{group.category}</span>
                  {isGroupCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
                          "w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left group relative",
                          item.disabled
                            ? "opacity-35 cursor-not-allowed select-none hover:bg-transparent text-[var(--muted)]"
                            : isActive
                            ? "bg-[var(--surface-active)] text-[var(--foreground)] font-semibold border border-[var(--border)] cursor-pointer"
                            : "text-[var(--foreground)] hover:bg-[var(--surface-hover)] cursor-pointer"
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
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-[var(--accent)]" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-[var(--accent)]" : "text-[var(--muted)] group-hover:text-[var(--foreground)]")} />
                          {!sidebarCollapsed && <span className="truncate">{item.title}</span>}
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

      <div className="shrink-0 border-t border-[var(--border)] p-2">
        <button
          type="button"
          data-testid="nav-item-settings"
          onClick={() =>
            handleItemClick({ id: "settings", title: "Settings", icon: Settings })
          }
          aria-label="Settings"
          aria-current={activeTabId === "settings" ? "page" : undefined}
          title={sidebarCollapsed ? "Settings" : undefined}
          className={cn(
            "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer",
            activeTabId === "settings"
              ? "border border-[var(--border)] bg-[var(--surface-active)] font-semibold text-[var(--foreground)]"
              : "text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
          )}
        >
          {activeTabId === "settings" && (
            <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
          )}
          <Settings
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              activeTabId === "settings"
                ? "text-[var(--accent)]"
                : "text-[var(--muted)] group-hover:text-[var(--foreground)]",
            )}
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
      </div>
      </aside>
    </>
  );
}
