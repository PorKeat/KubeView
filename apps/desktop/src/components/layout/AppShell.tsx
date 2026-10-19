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

import { useClusterStore } from "@/stores/clusterStore";

export function AppShell() {
  const loadContexts = useClusterStore((s) => s.loadContexts);
  const initEventListener = useClusterStore((s) => s.initEventListener);

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

      {/* 5. Resource Inspector Slide-Over Drawer */}
      <ResourceInspectorDrawer />

      {/* 6. Onboarding & Kubeconfig Management Modal */}
      <KubeconfigModal />

      {/* 7. Pod Action Modals (Logs, Exec, Delete, Restart) */}
      <PodLogsModal />
      <PodExecModal />
      <PodDeleteModal />
      <PodRestartModal />

      {/* 8. Initial High-Tech Splash Screen Overlay */}
      <SplashScreen />
    </div>
  );
}
