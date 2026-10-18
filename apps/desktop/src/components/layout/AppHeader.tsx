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
  const [mounted, setMounted] = React.useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const { setCommandPaletteOpen } = useLayoutStore();
  const { currentContext, currentNamespace, connectionStatus, latencyMs } = useClusterStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleRefresh = () => {
    toast.info("Refreshing cluster state...", { duration: 1500 });
  };

  return (
    <header
      data-tauri-drag-region
      className="h-11 w-full border-b border-white/[0.08] glass-panel flex items-center justify-between px-3 select-none shrink-0 z-30"
    >
      {/* Left: Window Controls Inset & Brand */}
      <div className="flex items-center gap-3 pl-16">
        <Logo size="sm" />

        <div className="h-4 w-[1px] bg-white/10" />

        {/* Interactive Cluster Context Switcher */}
        <ContextSwitcherDropdown />

        {/* Interactive Namespace Selector */}
        <NamespaceSelectorDropdown />
      </div>

      {/* Center: Search Trigger (Cmd+K) */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1 text-xs rounded-lg bg-black/30 border border-white/10 text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)] transition-all shadow-inner group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 group-hover:text-[var(--accent)] transition-colors" />
            <span>Search resources, pods, logs...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-white/[0.06] border border-white/10 rounded text-[var(--muted)] group-hover:text-[var(--accent)] font-mono transition-colors">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Actions & Utilities */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="Refresh Resources"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="Toggle Theme"
        >
          {mounted ? (
            resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={() => toast.info("Settings panel coming in Phase 1")}
          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
