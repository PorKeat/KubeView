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
        <div className="flex items-center gap-1.5 font-semibold text-xs tracking-wider uppercase text-[var(--accent)]">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>KubeView</span>
        </div>

        <div className="h-4 w-[1px] bg-[var(--border)]" />

        {/* Cluster Context Picker Pill */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors text-[var(--foreground)]"
          title="Switch Cluster Context (Cmd+K)"
        >
          <Server className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span className="font-medium max-w-[140px] truncate">{currentContext || "Select Cluster"}</span>
          <span className="text-[10px] text-[var(--muted)]">({latencyMs}ms)</span>
        </button>

        {/* Namespace Picker Pill */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors text-[var(--foreground)]"
          title="Change Namespace"
        >
          <Layers className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span className="font-medium text-[var(--muted)]">ns:</span>
          <span className="font-medium">{currentNamespace}</span>
        </button>
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
