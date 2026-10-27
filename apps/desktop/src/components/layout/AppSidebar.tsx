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
  Globe,
  ArrowLeftRight,
  Radar,
  FileCode,
  HardDrive,
  Users,
  Key,
  FolderLock,
  Boxes,
  Server,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Settings,
  ArrowLeft,
  Keyboard,
  Monitor,
  Timer,
} from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { useTabStore } from "@/stores/tabStore";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore, type SettingsSection } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

interface NavItem {
  id: string;
  title: string;
  shortTitle?: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: "default" | "warning" | "accent" | "soon";
  disabled?: boolean;
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

interface SettingsNavItem {
  id: string;
  testId: string;
  section: SettingsSection;
  title: string;
  description: string;
  icon: React.ElementType;
}

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: "settings-appearance",
    testId: "appearance",
    section: "appearance",
    title: "Appearance",
    description: "Theme, text, motion",
    icon: Monitor,
  },
  {
    id: "settings-data-refresh",
    testId: "data-refresh",
    section: "data-refresh",
    title: "Data & Refresh",
    description: "Polling and table rows",
    icon: Timer,
  },
  {
    id: "settings-shortcuts",
    testId: "shortcuts",
    section: "shortcuts",
    title: "Shortcuts",
    description: "Keyboard reference",
    icon: Keyboard,
  },
];

export function AppSidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useLayoutStore();
  const { activeTabId, previousTabId, openTabs, openTab, setActiveTab } =
    useTabStore();
  const { activeSection, setActiveSection } = useSettingsStore();
  const {
    availableContexts,
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
    networkingCounts,
    loadPods,
    loadDeployments,
    loadReplicaSets,
    loadStatefulSets,
    loadDaemonSets,
    loadJobs,
    loadCronJobs,
    loadServices,
    loadEndpoints,
    loadIngresses,
    loadGatewayResources,
    loadNetworkPolicies,
    loadPortForwards,
    loadCiliumResources,
    loadNetworkObservability,
    loadServiceAccounts,
    loadRBACResources,
    loadCRDs,
    setJobOwnerFilter,
    setJobsViewMode,
    setCurrentNamespace,
    setPodNodeFilter,
    setPodLabelFilter,
  } = useClusterStore();
  const [collapsedGroups, setCollapsedGroups] = React.useState<
    Record<string, boolean>
  >({});
  const isSettingsActive = activeTabId === "settings";
  const settingsReturnTab = React.useMemo(
    () =>
      openTabs.find(
        (tab) => tab.id === previousTabId && tab.id !== "settings",
      ) ?? openTabs.find((tab) => tab.id !== "settings"),
    [openTabs, previousTabId],
  );

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

  const realPodsCount =
    clusterOverview?.totalPods ??
    (totalPodsCount > 0 ? totalPodsCount : pods.length);
  const deploymentCount =
    clusterOverview?.workloads?.deployments?.total ?? deployments.length;
  const replicaSetCount =
    clusterOverview?.workloads?.replicaSets?.total ?? replicaSets.length;
  const statefulSetCount =
    clusterOverview?.workloads?.statefulSets?.total ?? statefulSets.length;
  const daemonSetCount =
    clusterOverview?.workloads?.daemonSets?.total ?? daemonSets.length;
  const jobsCount =
    clusterOverview?.workloads?.jobs?.total ?? (totalJobsCount || jobs.length);
  const cronJobsCount =
    clusterOverview?.workloads?.cronJobs?.total ??
    (totalCronJobsCount || cronJobs.length);
  const jobsAndCronJobsCount = jobsCount + cronJobsCount;
  const serviceCount = networkingCounts?.services ?? 0;
  const endpointCount = networkingCounts?.endpoints ?? 0;
  const ingressGatewayCount =
    (networkingCounts?.ingresses ?? 0) +
    (networkingCounts?.gatewayResources ?? 0);
  const networkPolicyCount = networkingCounts?.networkPolicies ?? 0;
  const activePortForwardCount = networkingCounts?.activePortForwards ?? 0;
  const configMapCount = networkingCounts?.configMaps ?? 0;
  const secretCount = networkingCounts?.secrets ?? 0;
  const persistentVolumeCount = networkingCounts?.persistentVolumes ?? 0;
  const storageClassCount = networkingCounts?.storageClasses ?? 0;
  const serviceAccountCount = networkingCounts?.serviceAccounts ?? 0;
  const rbacCount =
    (networkingCounts?.roles ?? 0) +
    (networkingCounts?.clusterRoles ?? 0) +
    (networkingCounts?.roleBindings ?? 0) +
    (networkingCounts?.clusterRoleBindings ?? 0);
  const crdCount = networkingCounts?.crds ?? 0;

  const navigationGroups: NavGroup[] = React.useMemo(
    () => [
      {
        category: "Overview",
        items: [
          {
            id: "fleet",
            title: "All Clusters",
            icon: Server,
            badge:
              availableContexts.length > 0
                ? availableContexts.length
                : undefined,
            badgeVariant: "accent",
          },
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
          {
            id: "deployments",
            title: "Deployments",
            icon: Layers,
            badge: deploymentCount > 0 ? deploymentCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "replicasets",
            title: "ReplicaSets",
            icon: Repeat,
            badge: replicaSetCount > 0 ? replicaSetCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "statefulsets",
            title: "StatefulSets",
            icon: Database,
            badge: statefulSetCount > 0 ? statefulSetCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "daemonsets",
            title: "DaemonSets",
            icon: Cpu,
            badge: daemonSetCount > 0 ? daemonSetCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "jobs",
            title: "Jobs & CronJobs",
            icon: Clock,
            badge: jobsAndCronJobsCount > 0 ? jobsAndCronJobsCount : undefined,
            badgeVariant: "accent",
          },
        ],
      },
      {
        category: "Networking",
        items: [
          {
            id: "services",
            title: "Services",
            icon: Network,
            badge: serviceCount > 0 ? serviceCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "endpoints",
            title: "Endpoints",
            icon: Radio,
            badge: endpointCount > 0 ? endpointCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "ingresses",
            title: "Ingresses & Gateways",
            icon: Globe,
            badge: ingressGatewayCount > 0 ? ingressGatewayCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "networkpolicies",
            title: "Network Policies",
            icon: Shield,
            badge: networkPolicyCount > 0 ? networkPolicyCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "portforwards",
            title: "Port Forwards",
            icon: ArrowLeftRight,
            badge:
              activePortForwardCount > 0 ? activePortForwardCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "cilium",
            title: "Network Observability",
            shortTitle: "CNI Observability",
            icon: Radar,
          },
        ],
      },
      {
        category: "Config & Storage",
        items: [
          {
            id: "configmaps",
            title: "ConfigMaps",
            icon: FileCode,
            badge: configMapCount > 0 ? configMapCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "secrets",
            title: "Secrets",
            icon: FolderLock,
            badge: secretCount > 0 ? secretCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "persistentvolumes",
            title: "Persistent Volumes",
            icon: HardDrive,
            badge:
              persistentVolumeCount > 0 ? persistentVolumeCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "storageclasses",
            title: "Storage Classes",
            icon: HardDrive,
            badge: storageClassCount > 0 ? storageClassCount : undefined,
            badgeVariant: "accent",
          },
        ],
      },
      {
        category: "Access & Custom",
        items: [
          {
            id: "serviceaccounts",
            title: "Service Accounts",
            icon: Users,
            badge: serviceAccountCount > 0 ? serviceAccountCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "rbac",
            title: "Roles & Bindings",
            icon: Key,
            badge: rbacCount > 0 ? rbacCount : undefined,
            badgeVariant: "accent",
          },
          {
            id: "crds",
            title: "Custom Resources",
            icon: Boxes,
            badge: crdCount > 0 ? crdCount : undefined,
            badgeVariant: "accent",
          },
        ],
      },
    ],
    [
      availableContexts.length,
      realPodsCount,
      deploymentCount,
      replicaSetCount,
      statefulSetCount,
      daemonSetCount,
      jobsAndCronJobsCount,
      serviceCount,
      endpointCount,
      ingressGatewayCount,
      networkPolicyCount,
      activePortForwardCount,
      configMapCount,
      secretCount,
      persistentVolumeCount,
      storageClassCount,
      serviceAccountCount,
      rbacCount,
      crdCount,
    ],
  );

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

    if (item.id === "services") {
      setCurrentNamespace("all");
      loadServices("all");
    }

    if (item.id === "endpoints") {
      setCurrentNamespace("all");
      loadEndpoints("all");
    }

    if (item.id === "ingresses") {
      setCurrentNamespace("all");
      loadIngresses("all");
      loadGatewayResources("all");
    }

    if (item.id === "networkpolicies") {
      setCurrentNamespace("all");
      loadNetworkPolicies("all");
    }

    if (item.id === "portforwards") {
      setCurrentNamespace("all");
      loadPortForwards();
    }

    if (item.id === "cilium") {
      setCurrentNamespace("all");
      loadNetworkObservability();
      loadCiliumResources("all");
    }

    if (item.id === "configmaps") {
      setCurrentNamespace("all");
    }

    if (item.id === "secrets") {
      setCurrentNamespace("all");
    }

    if (item.id === "persistentvolumes") {
      setCurrentNamespace("all");
    }

    if (item.id === "storageclasses") {
      setCurrentNamespace("all");
    }

    if (item.id === "serviceaccounts") {
      setCurrentNamespace("all");
      loadServiceAccounts("all");
    }

    if (item.id === "rbac") {
      setCurrentNamespace("all");
      loadRBACResources("all");
    }

    if (item.id === "crds") {
      loadCRDs();
    }

    openTab({
      id: item.id,
      title: item.title,
      closable: item.id !== "overview",
    });
    setMobileSidebarOpen(false);
  };

  const handleSettingsSectionClick = (section: SettingsSection) => {
    setActiveSection(section);
    setMobileSidebarOpen(false);
  };

  const handleBackFromSettings = () => {
    if (settingsReturnTab) {
      setActiveTab(settingsReturnTab.id);
    } else {
      openTab({ id: "overview", title: "Cluster Overview", closable: false });
    }
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
          !mobileSidebarOpen && (sidebarCollapsed ? "w-14" : "w-56"),
        )}
      >
        {/* Sidebar Header / Collapse Toggle */}
        <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--border)] shrink-0">
          {!sidebarCollapsed && (
            <span className="text-xs font-medium text-[var(--muted)]">
              {isSettingsActive ? "Settings" : "Resources"}
            </span>
          )}
          <div className="ml-auto flex items-center gap-0.5">
            <Tooltip content="Close navigation" side="right">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip
              content={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              side="right"
            >
              <button
                onClick={toggleSidebar}
                className="hidden md:inline-flex p-1.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label={
                  sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"
                }
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Navigation Tree */}
        <div className="flex-1 overflow-y-auto py-2.5 px-3 space-y-3">
          {isSettingsActive && (
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
                      onClick={() =>
                        handleSettingsSectionClick(section.section)
                      }
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
          )}
          {!isSettingsActive &&
            navigationGroups.map((group) => {
              const isGroupCollapsed = collapsedGroups[group.category];

              return (
                <div key={group.category} className="space-y-0.5">
                  {!sidebarCollapsed ? (
                    <button
                      onClick={() => toggleGroup(group.category)}
                      className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] rounded transition-colors cursor-pointer"
                    >
                      <span>{group.category}</span>
                      {isGroupCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
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
                              onClick={() => handleItemClick(item)}
                              className={cn(
                                "w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left group relative",
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

                              {!sidebarCollapsed &&
                                item.badge !== undefined && (
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.2 rounded text-[11px] font-mono font-medium shrink-0 ml-1.5 border tracking-tight tabular-nums",
                                      item.badgeVariant === "soon"
                                        ? "bg-black/[0.03] dark:bg-white/[0.03] text-[var(--muted)] border-black/[0.06] dark:border-white/[0.06] opacity-75"
                                        : item.badgeVariant === "warning"
                                          ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/25"
                                          : item.badgeVariant === "accent"
                                            ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/25"
                                            : "text-[var(--muted)] bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10",
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
        </div>

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
                onClick={handleBackFromSettings}
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
                onClick={() =>
                  handleItemClick({
                    id: "settings",
                    title: "Settings",
                    icon: Settings,
                  })
                }
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
      </aside>
    </>
  );
}
