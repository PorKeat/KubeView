"use client";

import * as React from "react";
import {
  Search,
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
  const [mounted, setMounted] = React.useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const { setCommandPaletteOpen } = useLayoutStore();
  const {
    currentContext,
    currentNamespace,
    connectionStatus,
    latencyMs,
    diagnoseContext,
    loadClusterOverview,
    loadPods,
    loadNamespaces,
  } = useClusterStore();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info("Refreshing cluster telemetry...", { duration: 1500 });
    try {
      await Promise.all([
        diagnoseContext(),
        loadClusterOverview(),
        loadPods(),
        loadNamespaces(),
      ]);
      toast.success("Cluster state updated!");
    } catch {
      toast.error("Failed to refresh cluster state");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="h-14 w-full border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-4 sm:px-6 select-none shrink-0 z-30 gap-4"
    >
      {/* Left: Window Controls Inset & Brand & Integrated Scope Control */}
      <div className="flex items-center gap-3.5 pl-16 shrink-0">
        <Logo size="sm" />

        {/* Integrated Cluster & Namespace Scope Bar (Single Quiet Border, No Line Clutter) */}
        <div className="flex items-center rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--border)] p-0.5 shrink-0">
          <ContextSwitcherDropdown variant="unified" />
          {connectionStatus !== "offline" && (
            <>
              <div className="h-3.5 w-[1px] bg-[var(--border)] opacity-60 shrink-0 mx-0.5" />
              <div className="hidden md:block">
                <NamespaceSelectorDropdown variant="unified" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center: Search Trigger (Cmd+K) - 36px High-Craft Command Pill */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4 min-w-0">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search resources, pods, logs (Press Command K or Control K to open)"
          className="w-full h-9 flex items-center justify-between px-3 text-xs rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--border)] hover:border-[var(--muted)]/40 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors shrink-0" aria-hidden="true" />
            <span className="truncate hidden sm:inline">Search resources, pods, logs...</span>
            <span className="truncate sm:hidden">Search...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[11px] bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--border)] rounded text-[var(--muted)] font-mono tabular-nums transition-colors shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Actions & Utilities - 36px Tactile Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleRefresh}
          aria-label="Refresh Resources"
          className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden transition-colors cursor-pointer"
          title="Refresh Resources"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label={mounted ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme` : "Toggle Theme"}
          suppressHydrationWarning
          className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden transition-colors cursor-pointer"
          title="Toggle Theme"
        >
          {mounted ? (
            resolvedTheme === "dark" ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        <button
          disabled
          aria-label="Settings and global preferences (coming soon)"
          className="h-9 w-9 rounded-lg flex items-center justify-center opacity-30 cursor-not-allowed text-[var(--muted)]"
          title="Settings & Global Preferences (Coming Soon)"
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
