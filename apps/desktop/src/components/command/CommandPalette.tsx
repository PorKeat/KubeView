"use client";

import * as React from "react";
import { Command } from "cmdk";
import {
  Box,
  Layers,
  Network,
  Database,
  LayoutDashboard,
  Sun,
  Moon,
  FolderLock,
  RefreshCw,
  Server,
  PanelLeftClose,
  Activity,
  Terminal,
  FileCode,
  Shield,
  Search,
} from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { useTabStore } from "@/stores/tabStore";
import { useClusterStore } from "@/stores/clusterStore";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, toggleSidebar } = useLayoutStore();
  const { openTab } = useTabStore();
  const { setCurrentContext, setCurrentNamespace, openInspector, availableContexts, availableNamespaces } = useClusterStore();
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const navigateTo = (id: string, title: string) => {
    openTab({ id, title, closable: id !== "overview" });
    setCommandPaletteOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-start justify-center pt-20 select-none animate-in fade-in duration-100"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full">
          {/* Header Search Input */}
          <div className="flex items-center border-b border-[var(--border)] px-3.5 gap-2.5">
            <Logo variant="mark" size="sm" />
            <Command.Input
              autoFocus
              placeholder="Type a command, jump to resource, or switch context..."
              className="w-full py-3 text-xs bg-transparent text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] font-mono"
            />
            <kbd className="px-1.5 py-0.5 text-[10px] bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--muted)] font-mono shrink-0">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
            <Command.Empty className="py-8 text-center text-xs text-[var(--muted)]">
              No matching resources, commands, or clusters found.
            </Command.Empty>

            {/* Quick Navigation */}
            <Command.Group heading="Navigation" className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider">
              <Command.Item
                onSelect={() => navigateTo("overview", "Cluster Overview")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-[var(--accent)]" />
                <span>Cluster Overview</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("pods", "Pods")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Box className="w-4 h-4 text-emerald-400" />
                <span>Pods & Containers</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("deployments", "Deployments")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Deployments</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("services", "Services")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Network className="w-4 h-4 text-purple-400" />
                <span>Services & Networking</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("configmaps", "ConfigMaps")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>ConfigMaps</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("secrets", "Secrets")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <FolderLock className="w-4 h-4 text-rose-400" />
                <span>Secrets (Redacted)</span>
              </Command.Item>
            </Command.Group>

            {/* Clusters & Contexts */}
            <Command.Group heading="Clusters & Contexts" className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider">
              {availableContexts.map((ctx) => (
                <Command.Item
                  key={ctx.name}
                  onSelect={() => {
                    setCurrentContext(ctx.name);
                    toast.success(`Switched to context: ${ctx.name}`);
                    setCommandPaletteOpen(false);
                  }}
                  className="flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Server className="w-4 h-4 text-[var(--muted)]" />
                    <span className="font-mono">{ctx.name}</span>
                  </div>
                  <span className="text-[10px] text-[var(--muted)] font-mono">{ctx.latencyMs}ms</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Namespaces */}
            <Command.Group heading="Switch Namespace" className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider">
              {availableNamespaces.map((ns) => (
                <Command.Item
                  key={ns}
                  onSelect={() => {
                    setCurrentNamespace(ns);
                    toast.info(`Active namespace: ${ns}`);
                    setCommandPaletteOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors font-mono"
                >
                  <Layers className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>ns: {ns}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Diagnostics & Operations */}
            <Command.Group heading="Diagnostics & Actions" className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider">
              <Command.Item
                onSelect={() => {
                  toast.success("Running 4-stage automated connection diagnostics...");
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Run Connection Diagnostics (4-Stage Probe)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  openInspector({
                    kind: "Pod",
                    name: "api-gateway-7f8d-x9q",
                    namespace: "production",
                    status: "CrashLoopBackOff",
                  });
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Inspect Problem Pod: api-gateway-7f8d-x9q</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
                <span>Toggle Dark / Light Theme</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  toggleSidebar();
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
              >
                <PanelLeftClose className="w-4 h-4 text-[var(--muted)]" />
                <span>Toggle Sidebar Navigation</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer Hints */}
          <div className="h-8 border-t border-[var(--border)] px-3 flex items-center justify-between text-[10px] text-[var(--muted)] bg-[var(--surface)]">
            <div className="flex items-center gap-3">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> select</span>
              <span><kbd className="font-mono">esc</kbd> close</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span>KubeView IDE</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
