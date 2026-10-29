"use client";

import * as React from "react";
import { PanelLeftClose, PanelLeftOpen, Settings, X } from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { useTabStore } from "@/stores/tabStore";
import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore, type SettingsSection } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import { invokeRpc } from "@/lib/ipc";
import type { SimpleResourceCountsResult } from "@kubeview/contracts";
import { Tooltip } from "@/components/ui/Tooltip";
import { buildNavigationGroups, type NavItem } from "./sidebar/navConfig";
import { SidebarNavList } from "./sidebar/SidebarNavList";
import { SidebarSettingsNav } from "./sidebar/SidebarSettingsNav";
import { SidebarFooter } from "./sidebar/SidebarFooter";
import { CatalogSidebarNav } from "./sidebar/CatalogSidebarNav";

export function AppSidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    fleetCatalogSection,
    setFleetCatalogSection,
    catalogMode,
    setCatalogMode,
  } = useLayoutStore();
  const { activeTabId, previousTabId, openTabs, openTab, setActiveTab } =
    useTabStore();
  const { activeSection, setActiveSection } = useSettingsStore();
  const loadContexts = useClusterStore((state) => state.loadContexts);
  const {
    availableContexts,
    currentContext,
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
  const [simpleResourceCounts, setSimpleResourceCounts] =
    React.useState<SimpleResourceCountsResult | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!currentContext) {
      setSimpleResourceCounts(null);
      return;
    }
    invokeRpc<SimpleResourceCountsResult>("simpleResources.counts", {
      contextName: currentContext,
    })
      .then((counts) => {
        if (!cancelled) setSimpleResourceCounts(counts);
      })
      .catch(() => {
        if (!cancelled) setSimpleResourceCounts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentContext]);
  const isSettingsActive = activeTabId === "settings";
  const isLearningActive = activeTabId === "learning";
  const isCatalogActive =
    !isSettingsActive &&
    (activeTabId === "fleet" || (catalogMode && isLearningActive));
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

  const navigationGroups = React.useMemo(
    () =>
      buildNavigationGroups({
        contextCount: availableContexts.length,
        pods: realPodsCount,
        deployments: deploymentCount,
        replicaSets: replicaSetCount,
        statefulSets: statefulSetCount,
        daemonSets: daemonSetCount,
        jobsAndCronJobs: jobsAndCronJobsCount,
        services: serviceCount,
        endpoints: endpointCount,
        ingressGateway: ingressGatewayCount,
        networkPolicies: networkPolicyCount,
        activePortForwards: activePortForwardCount,
        configMaps: configMapCount,
        secrets: secretCount,
        persistentVolumes: persistentVolumeCount,
        storageClasses: storageClassCount,
        serviceAccounts: serviceAccountCount,
        rbac: rbacCount,
        crds: crdCount,
        namespaces: simpleResourceCounts?.namespaces ?? 0,
        events: simpleResourceCounts?.events ?? 0,
        replicationControllers:
          simpleResourceCounts?.replicationControllers ?? 0,
        endpointSlices: simpleResourceCounts?.endpointSlices ?? 0,
        ingressClasses: simpleResourceCounts?.ingressClasses ?? 0,
        persistentVolumeClaims:
          simpleResourceCounts?.persistentVolumeClaims ?? 0,
      }),
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
      simpleResourceCounts,
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

    if (
      item.id === "events" ||
      item.id === "replicationcontrollers" ||
      item.id === "endpointslices" ||
      item.id === "persistentvolumeclaims"
    ) {
      setCurrentNamespace("all");
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

  const handleOpenSettings = () => {
    handleItemClick({
      id: "settings",
      title: "Settings",
      icon: Settings,
    });
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
              {isSettingsActive
                ? "Settings"
                : isCatalogActive
                  ? "Catalog"
                  : "Resources"}
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
            <SidebarSettingsNav
              sidebarCollapsed={sidebarCollapsed}
              activeSection={activeSection}
              onSectionClick={handleSettingsSectionClick}
            />
          )}
          {!isSettingsActive && isCatalogActive && (
            <CatalogSidebarNav
              sidebarCollapsed={sidebarCollapsed}
              activeSection={fleetCatalogSection}
              fleetActive={activeTabId === "fleet"}
              activeLearning={isLearningActive}
              contextCount={availableContexts.length}
              onSelectSection={(section) => {
                setCatalogMode(true);
                setFleetCatalogSection(section);
                openTab({
                  id: "fleet",
                  title: "All Clusters",
                  icon: "Server",
                  closable: true,
                });
                if (
                  section === "kubeconfigs" &&
                  availableContexts.length === 0
                ) {
                  void loadContexts();
                }
              }}
              onSelectLearning={() => {
                setCatalogMode(true);
                openTab({
                  id: "learning",
                  title: "Learning Center",
                  closable: true,
                });
              }}
            />
          )}
          {!isSettingsActive && !isCatalogActive && (
            <SidebarNavList
              groups={navigationGroups}
              collapsedGroups={collapsedGroups}
              sidebarCollapsed={sidebarCollapsed}
              activeTabId={activeTabId}
              onToggleGroup={toggleGroup}
              onItemClick={handleItemClick}
            />
          )}
        </div>

        <SidebarFooter
          isSettingsActive={isSettingsActive}
          sidebarCollapsed={sidebarCollapsed}
          settingsReturnTab={settingsReturnTab}
          onBack={handleBackFromSettings}
          onSettingsClick={handleOpenSettings}
        />
      </aside>
    </>
  );
}
