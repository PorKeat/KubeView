"use client";

import * as React from "react";
import { Menu, Search, Sun, Moon, Settings, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";
import { useLayoutStore } from "@/stores/layoutStore";
import { useClusterStore } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import { toast } from "sonner";

import { Logo } from "@/components/brand/Logo";
import { ContextSwitcherDropdown } from "./ContextSwitcherDropdown";
import { NamespaceSelectorDropdown } from "./NamespaceSelectorDropdown";
import { NotificationCenterDropdown } from "./NotificationCenterDropdown";
import { Tooltip } from "@/components/ui/Tooltip";

export function AppHeader() {
  const [mounted, setMounted] = React.useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const {
    setCommandPaletteOpen,
    setMobileSidebarOpen,
    setSidebarCollapsed,
    mobileSidebarOpen,
  } = useLayoutStore();
  const { openTab } = useTabStore();
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

  const openMobileNavigation = () => {
    setSidebarCollapsed(false);
    setMobileSidebarOpen(true);
  };

  const openSettings = () =>
    openTab({ id: "settings", title: "Settings", closable: true });

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
      className="h-14 w-full border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-2 sm:px-4 lg:px-6 select-none shrink-0 z-30 gap-2 sm:gap-4"
    >
      {/* Left: Window Controls Inset & Brand & Integrated Scope Control */}
      <div className="flex min-w-0 items-center gap-2 pl-2 sm:gap-3.5 md:pl-16">
        <Tooltip content="Open navigation" side="bottom">
          <button
            type="button"
            onClick={openMobileNavigation}
            aria-label="Open navigation"
            aria-expanded={mobileSidebarOpen}
            aria-controls="resource-navigation"
            className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-black/[0.05] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden cursor-pointer dark:hover:bg-white/[0.06]"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>

        <div className="hidden sm:block shrink-0">
          <Logo size="sm" />
        </div>

        {connectionStatus !== "offline" && (
          <div className="hidden min-w-0 items-center rounded-lg border border-[var(--border)] bg-black/[0.03] p-0.5 shrink-0 dark:bg-white/[0.04] md:flex">
            <NamespaceSelectorDropdown variant="unified" />
          </div>
        )}
      </div>

      {/* Center: Search Trigger (Cmd+K) - 36px High-Craft Command Pill */}
      <div className="hidden lg:block flex-1 max-w-md mx-2 lg:mx-4 min-w-0">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search resources, pods, logs (Press Command K or Control K to open)"
          className="w-full h-9 flex items-center justify-between px-3 text-xs rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--border)] hover:border-[var(--muted)]/40 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search
              className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors shrink-0"
              aria-hidden="true"
            />
            <span className="truncate hidden sm:inline">
              Search resources, pods, logs...
            </span>
            <span className="truncate sm:hidden">Search...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[11px] bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--border)] rounded text-[var(--muted)] font-mono tabular-nums transition-colors shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Actions & Utilities - 36px Tactile Buttons */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <div className="flex items-center">
          <ContextSwitcherDropdown variant="compact" />
          <div className="mx-1 h-4 w-[1px] bg-[var(--border)]" />
        </div>

        <Tooltip content="Search resources (⌘K)" side="bottom">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Search resources"
            className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
          </button>
        </Tooltip>

        <NotificationCenterDropdown />

        <Tooltip content="Refresh Resources" side="bottom">
          <button
            onClick={handleRefresh}
            aria-label="Refresh Resources"
            className="hidden sm:flex h-9 w-9 rounded-lg items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
        </Tooltip>

        <Tooltip
          content={
            mounted
              ? resolvedTheme === "dark"
                ? "Switch to Light Mode"
                : "Switch to Dark Mode"
              : "Toggle Theme"
          }
          side="bottom"
        >
          <button
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label={
              mounted
                ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`
                : "Toggle Theme"
            }
            suppressHydrationWarning
            className="hidden sm:flex h-9 w-9 rounded-lg items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden transition-colors cursor-pointer"
          >
            {mounted ? (
              resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>
        </Tooltip>

        <Tooltip content="Settings & Preferences (⌘,)" side="bottom">
          <button
            type="button"
            onClick={openSettings}
            data-testid="open-settings"
            aria-label="Open settings and preferences"
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
