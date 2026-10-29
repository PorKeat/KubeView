"use client";

import * as React from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { ClusterRail } from "./ClusterRail";
import { TabBar } from "./TabBar";
import { StatusBar } from "./StatusBar";
import { ActiveViewRenderer } from "@/components/views/ActiveViewRenderer";
import { CommandPalette } from "@/components/command/CommandPalette";
import { ResourceInspectorDrawer } from "@/components/views/ResourceInspectorDrawer";
import { SplashScreen } from "@/components/onboarding/SplashScreen";
import { KubeconfigModal } from "@/components/onboarding/KubeconfigModal";
import { PodLogsModal } from "@/components/modals/PodLogsModal";
import { PodExecModal } from "@/components/modals/PodExecModal";
import { PodDeleteModal } from "@/components/modals/PodDeleteModal";
import { PodRestartModal } from "@/components/modals/PodRestartModal";
import { WorkloadActionModal } from "@/components/modals/WorkloadActionModal";
import { BulkWorkloadActionModal } from "@/components/modals/BulkWorkloadActionModal";
import { EndpointEditModal } from "@/components/modals/EndpointEditModal";
import { ResourceEditorModal } from "@/components/modals/ResourceEditorModal";
import { DeleteResourceModal } from "@/components/modals/DeleteResourceModal";
import { ServiceDiagnosticsModal } from "@/components/modals/ServiceDiagnosticsModal";
import { RbacForbiddenBridge } from "@/components/permissions/RbacForbiddenBridge";
import { LearningContextStrip } from "@/components/learning/LearningContextStrip";
import { GuidedTour } from "@/components/learning/GuidedTour";

import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabStore } from "@/stores/tabStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { useHelmStore } from "@/stores/helmStore";
import { useLayoutStore } from "@/stores/layoutStore";

export function AppShell() {
  const loadContexts = useClusterStore((s) => s.loadContexts);
  const initEventListener = useClusterStore((s) => s.initEventListener);
  const setAutoRefreshInterval = useClusterStore(
    (s) => s.setAutoRefreshInterval,
  );
  const fontSize = useSettingsStore((s) => s.fontSize);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const autoRefreshSeconds = useSettingsStore((s) => s.autoRefreshSeconds);
  const density = useSettingsStore((s) => s.density);
  const accent = useSettingsStore((s) => s.accent);
  const statusPalette = useSettingsStore((s) => s.statusPalette);
  const highContrast = useSettingsStore((s) => s.highContrast);
  const monoFontSize = useSettingsStore((s) => s.monoFontSize);
  const showClusterRail = useSettingsStore((s) => s.showClusterRail);
  const sidebarDefaultCollapsed = useSettingsStore(
    (s) => s.sidebarDefaultCollapsed,
  );
  const startupPage = useSettingsStore((s) => s.startupPage);
  const pauseWhenHidden = useSettingsStore((s) => s.pauseWhenHidden);
  const refreshOnFocus = useSettingsStore((s) => s.refreshOnFocus);
  const openTab = useTabStore((s) => s.openTab);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);
  const startupApplied = React.useRef(false);
  const sidebarApplied = React.useRef(false);
  const [isHidden, setIsHidden] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.dataset.density = density;
    document.documentElement.dataset.statusPalette = statusPalette;
    document.documentElement.dataset.highContrast = String(highContrast);
    document.documentElement.dataset.monoSize = monoFontSize;
  }, [density, highContrast, monoFontSize, statusPalette]);

  React.useEffect(() => {
    const accents: Record<string, { base: string; hover: string }> = {
      orange: { base: "#f08a42", hover: "#ff9d5c" },
      blue: { base: "#4f8ff7", hover: "#70a7ff" },
      emerald: { base: "#34b981", hover: "#51d39a" },
      violet: { base: "#a78bfa", hover: "#bda7ff" },
    };
    const selected = accents[accent] ?? accents.orange;
    document.documentElement.style.setProperty("--accent", selected.base);
    document.documentElement.style.setProperty(
      "--accent-hover",
      selected.hover,
    );
  }, [accent]);

  React.useEffect(() => {
    if (sidebarApplied.current) return;
    sidebarApplied.current = true;
    if (sidebarDefaultCollapsed) setSidebarCollapsed(true);
  }, [setSidebarCollapsed, sidebarDefaultCollapsed]);

  React.useEffect(() => {
    if (startupApplied.current) return;
    startupApplied.current = true;
    if (startupPage === "fleet") {
      openTab({
        id: "fleet",
        title: "All Clusters",
        icon: "Server",
        closable: true,
      });
    } else if (startupPage === "learning") {
      openTab({
        id: "learning",
        title: "Learning Center",
        closable: true,
      });
    }
  }, [openTab, startupPage]);

  React.useEffect(() => {
    const handleVisibility = () => setIsHidden(document.hidden);
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  React.useEffect(() => {
    if (!refreshOnFocus) return;
    const handleFocus = () => {
      if (document.hidden) return;
      const store = useClusterStore.getState();
      void store.loadClusterOverview();
      void store.loadPods();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshOnFocus]);

  React.useEffect(() => {
    void useCatalogStore.persist.rehydrate();
    void useHelmStore.persist.rehydrate();
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  React.useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion
      ? "true"
      : "false";
  }, [reducedMotion]);

  React.useEffect(() => {
    const interval =
      pauseWhenHidden && isHidden ? 0 : autoRefreshSeconds * 1000;
    setAutoRefreshInterval(interval);
  }, [autoRefreshSeconds, isHidden, pauseWhenHidden, setAutoRefreshInterval]);

  React.useEffect(() => {
    const handleSettingsShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        openTab({ id: "settings", title: "Settings", closable: true });
      }
    };
    window.addEventListener("keydown", handleSettingsShortcut);
    return () => window.removeEventListener("keydown", handleSettingsShortcut);
  }, [openTab]);

  React.useEffect(() => {
    loadContexts();
    const cleanupPromise = initEventListener();
    return () => {
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [loadContexts, initEventListener]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      {/* 1. Frameless Window Titlebar */}
      <AppHeader />

      {/* 2. Main Middle Workspace (Sidebar + Tabbed Content) */}
      <div className="flex-1 flex overflow-hidden">
        {showClusterRail && <ClusterRail />}
        <AppSidebar />

        <main className="flex-1 flex flex-col min-w-0 bg-[var(--background)] overflow-hidden">
          <TabBar />
          <LearningContextStrip />
          <ActiveViewRenderer />
        </main>
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar />

      {/* 4. Global Command Palette Modal (Cmd+K) */}
      <CommandPalette />

      {/* 6. Resource Inspector Slide-Over Drawer */}
      <ResourceInspectorDrawer />

      {/* 6. Onboarding & Kubeconfig Management Modal */}
      <KubeconfigModal />

      {/* 7. Pod Action Modals (Logs, Exec, Delete, Restart) */}
      <PodLogsModal />
      <PodExecModal />
      <PodDeleteModal />
      <PodRestartModal />
      <WorkloadActionModal />
      <BulkWorkloadActionModal />
      <EndpointEditModal />
      <ResourceEditorModal />
      <DeleteResourceModal />
      <ServiceDiagnosticsModal />
      <RbacForbiddenBridge />
      <GuidedTour />

      {/* 8. Initial High-Tech Splash Screen Overlay */}
      <SplashScreen />
    </div>
  );
}
