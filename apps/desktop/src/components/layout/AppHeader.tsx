"use client";

import * as React from "react";
import {
  Search,
  Server,
  Layers,
  Sun,
  Moon,
  Laptop,
  Settings,
  Bell,
  RefreshCw,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useLayoutStore } from "@/stores/layoutStore";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";

import { Logo } from "@/components/brand/Logo";
import { ContextSwitcherDropdown } from "./ContextSwitcherDropdown";
import { NamespaceSelectorDropdown } from "./NamespaceSelectorDropdown";

export function AppHeader() {
  const { setTheme, theme } = useTheme();
  const { setCommandPaletteOpen } = useLayoutStore();
  const { currentContext, currentNamespace, connectionStatus, latencyMs } = useClusterStore();

  const handleRefresh = () => {
    toast.info("Refreshing cluster state...", { duration: 1500 });
  };

  return (
    <header
      data-tauri-drag-region
      className="h-11 w-full border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-3 select-none shrink-0"
    >
      {/* Left: Window Controls Inset & Brand */}
      <div className="flex items-center gap-3 pl-16">
        <Logo size="sm" />

        <div className="h-4 w-[1px] bg-[var(--border)]" />

        {/* Interactive Cluster Context Switcher */}
        <ContextSwitcherDropdown />

        {/* Interactive Namespace Selector */}
        <NamespaceSelectorDropdown />
      </div>

      {/* Center: Search Trigger (Cmd+K) */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1 text-xs rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search resources, pods, logs...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--muted)] font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Actions & Utilities */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          title="Refresh Resources"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => toast.info("Settings panel coming in Phase 1")}
          className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
