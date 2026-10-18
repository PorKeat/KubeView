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
  const { setCurrentContext } = useClusterStore();
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-24 select-none"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full">
          <div className="flex items-center border-b border-[var(--border)] px-3 gap-2.5">
            <Logo variant="mark" size="sm" />
            <Command.Input
              autoFocus
              placeholder="Type a command or search resources..."
              className="w-full py-3 text-xs bg-transparent text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)]"
            />
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-1.5 space-y-1 text-xs">
            <Command.Empty className="py-6 text-center text-xs text-[var(--muted)]">
              No matching resources or commands.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider">
              <Command.Item
                onSelect={() => navigateTo("overview", "Cluster Overview")}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Cluster Overview</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("pods", "Pods")}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
              >
                <Box className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Pods</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("deployments", "Deployments")}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
              >
                <Layers className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Deployments</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("services", "Services")}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
              >
                <Network className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Services</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo("secrets", "Secrets")}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
              >
                <FolderLock className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Secrets</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Clusters & Contexts" className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider">
              <Command.Item
                onSelect={() => {
                  setCurrentContext("kind-kubeview");
                  toast.success("Switched to context: kind-kubeview");
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
              >
                <Server className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Switch to: kind-kubeview</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCurrentContext("minikube");
                  toast.success("Switched to context: minikube");
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
              >
                <Server className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Switch to: minikube</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Actions & Preferences" className="text-[10px] font-semibold text-[var(--muted)] px-2 py-1 uppercase tracking-wider">
              <Command.Item
                onSelect={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
              >
                {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-[var(--muted)]" /> : <Moon className="w-3.5 h-3.5 text-[var(--muted)]" />}
                <span>Toggle Theme (Dark / Light)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  toggleSidebar();
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
              >
                <PanelLeftClose className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Toggle Sidebar</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  toast.info("Refreshed cluster discovery cache");
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Refresh Cluster State</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
