"use client";

import * as React from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
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

import { useClusterStore } from "@/stores/clusterStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTabStore } from "@/stores/tabStore";

export function AppShell() {
  const loadContexts = useClusterStore((s) => s.loadContexts);
  const initEventListener = useClusterStore((s) => s.initEventListener);
  const setAutoRefreshInterval = useClusterStore(
    (s) => s.setAutoRefreshInterval,
  );
  const fontSize = useSettingsStore((s) => s.fontSize);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const autoRefreshSeconds = useSettingsStore((s) => s.autoRefreshSeconds);
  const openTab = useTabStore((s) => s.openTab);

  React.useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  React.useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion
      ? "true"
      : "false";
  }, [reducedMotion]);

  React.useEffect(() => {
    setAutoRefreshInterval(autoRefreshSeconds * 1000);
  }, [autoRefreshSeconds, setAutoRefreshInterval]);

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
        <AppSidebar />

        <main className="flex-1 flex flex-col min-w-0 bg-[var(--background)] overflow-hidden">
          <TabBar />
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

      {/* 8. Initial High-Tech Splash Screen Overlay */}
      <SplashScreen />
    </div>
  );
}
