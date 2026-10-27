"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  Plus,
  LayoutDashboard,
  Box,
  Layers,
  Repeat,
  Database,
  Cpu,
  Clock,
  Network,
  FolderLock,
  FileCode,
  HardDrive,
  Boxes,
  Server,
  Settings,
  XCircle,
  ArrowRight,
  Trash2,
  Users,
  Key,
} from "lucide-react";
import { useTabStore, TabItem } from "@/stores/tabStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

interface TabContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

const CONTEXT_MENU_WIDTH = 224;
const CONTEXT_MENU_HEIGHT = 224;

export function TabBar() {
  const {
    openTabs,
    activeTabId,
    setActiveTab,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
  } = useTabStore();
  const { setCommandPaletteOpen } = useLayoutStore();
  const [contextMenu, setContextMenu] =
    React.useState<TabContextMenuState | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const getTabIcon = (id: string) => {
    switch (id) {
      case "overview":
        return LayoutDashboard;
      case "fleet":
        return Server;
      case "pods":
        return Box;
      case "deployments":
        return Layers;
      case "services":
        return Network;
      case "secrets":
        return FolderLock;
      case "configmaps":
        return FileCode;
      case "persistentvolumes":
        return HardDrive;
      case "storageclasses":
        return Database;
      case "serviceaccounts":
        return Users;
      case "rbac":
        return Key;
      case "crds":
        return Boxes;
      case "statefulsets":
        return Database;
      case "daemonsets":
        return Cpu;
      case "jobs":
        return Clock;
      case "settings":
        return Settings;
      default:
        return Boxes;
    }
  };

  const handleTabContextMenu = (event: React.MouseEvent, tab: TabItem) => {
    event.preventDefault();
    event.stopPropagation();

    const x = Math.min(
      event.clientX,
      window.innerWidth - CONTEXT_MENU_WIDTH - 8,
    );
    const y = Math.min(
      event.clientY,
      window.innerHeight - CONTEXT_MENU_HEIGHT - 8,
    );

    setContextMenu({
      tabId: tab.id,
      x: Math.max(8, x),
      y: Math.max(8, y),
    });
  };

  const closeContextMenu = React.useCallback(() => {
    setContextMenu(null);
  }, []);

  React.useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeContextMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeContextMenu();
      }
    };
    const handleViewportChange = () => closeContextMenu();

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [contextMenu, closeContextMenu]);

  React.useEffect(() => {
    if (!contextMenu) return;
    const timer = window.setTimeout(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
        ?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [contextMenu]);

  React.useEffect(() => {
    if (contextMenu && !openTabs.some((tab) => tab.id === contextMenu.tabId)) {
      setContextMenu(null);
    }
  }, [openTabs, contextMenu]);

  const contextTab = contextMenu
    ? openTabs.find((tab) => tab.id === contextMenu.tabId)
    : undefined;
  const contextIndex = contextMenu
    ? openTabs.findIndex((tab) => tab.id === contextMenu.tabId)
    : -1;
  const hasOtherClosableTabs = contextTab
    ? openTabs.some((tab) => tab.id !== contextTab.id && tab.closable)
    : false;
  const hasClosableTabsToRight =
    contextIndex >= 0
      ? openTabs.slice(contextIndex + 1).some((tab) => tab.closable)
      : false;
  const hasClosableTabs = openTabs.some((tab) => tab.closable);

  const runAction = (action: () => void) => {
    action();
    closeContextMenu();
  };

  return (
    <>
      <div
        className="h-10 w-full border-b border-[var(--border)] bg-[var(--surface)] flex items-center px-3 overflow-x-auto select-none shrink-0 scrollbar-none"
        role="tablist"
        aria-label="Open tabs"
      >
        <div className="flex items-center gap-1.5 flex-1">
          {openTabs.map((tab: TabItem) => {
            const isActive = activeTabId === tab.id;
            const Icon = getTabIcon(tab.id);

            return (
              <div
                key={tab.id}
                role="tab"
                tabIndex={0}
                aria-selected={isActive}
                aria-label={`${tab.title} tab`}
                onClick={() => setActiveTab(tab.id)}
                onContextMenu={(event) => handleTabContextMenu(event, tab)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveTab(tab.id);
                  }
                }}
                className={cn(
                  "group relative h-7 px-3 flex items-center gap-2 text-xs rounded-md cursor-pointer transition-colors shrink-0 select-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                  isActive
                    ? "text-[var(--foreground)] font-medium"
                    : "bg-transparent text-[var(--muted)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-[var(--foreground)]",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="tabbar-active-pill"
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 35,
                    }}
                    className="absolute inset-0 rounded-md bg-black/[0.06] dark:bg-white/[0.08] border border-[var(--border)] shadow-xs -z-10 motion-reduce:transition-none"
                  />
                )}

                <Icon
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-colors",
                    isActive ? "text-[var(--accent)]" : "text-[var(--muted)]",
                  )}
                  aria-hidden="true"
                />
                <span className="truncate max-w-[130px] font-sans text-xs">
                  {tab.title}
                </span>

                {tab.closable && (
                  <Tooltip
                    content={`Close ${tab.title}`}
                    shortcut="⌘W"
                    side="bottom"
                  >
                    <button
                      type="button"
                      aria-label={`Close ${tab.title} tab`}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-50 group-hover:opacity-100 transition-opacity ml-0.5 focus-visible:ring-1 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </Tooltip>
                )}
              </div>
            );
          })}

          <Tooltip content="Open New Tab" shortcut="⌘K" side="bottom">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Open new tab (Command K)"
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors ml-0.5 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {contextMenu && contextTab && (
              <motion.div
                ref={menuRef}
                role="menu"
                aria-label={`Actions for ${contextTab.title} tab`}
                data-testid="tab-context-menu"
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.12 }}
                className="fixed z-[100] w-56 p-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.preventDefault()}
              >
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border)]/60 px-2.5 py-1.5 mb-1">
                  <span
                    className="truncate text-[11px] font-semibold text-[var(--foreground)]"
                    title={contextTab.title}
                  >
                    {contextTab.title}
                  </span>
                  <span className="shrink-0 rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)] dark:bg-white/5">
                    Tab
                  </span>
                </div>

                <TabContextMenuItem
                  icon={X}
                  label="Close"
                  shortcut="⌘W"
                  testId="tab-context-close"
                  disabled={!contextTab.closable}
                  onClick={() => runAction(() => closeTab(contextTab.id))}
                />

                <div className="my-1 border-t border-[var(--border)]/60" />

                <TabContextMenuItem
                  icon={XCircle}
                  label="Close Other Tabs"
                  testId="tab-context-close-others"
                  disabled={!hasOtherClosableTabs}
                  onClick={() => runAction(() => closeOtherTabs(contextTab.id))}
                />
                <TabContextMenuItem
                  icon={ArrowRight}
                  label="Close Tabs to the Right"
                  testId="tab-context-close-right"
                  disabled={!hasClosableTabsToRight}
                  onClick={() =>
                    runAction(() => closeTabsToRight(contextTab.id))
                  }
                />

                <div className="my-1 border-t border-[var(--border)]/60" />

                <TabContextMenuItem
                  icon={Trash2}
                  label="Close All Tabs"
                  testId="tab-context-close-all"
                  disabled={!hasClosableTabs}
                  danger
                  onClick={() => runAction(closeAllTabs)}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function TabContextMenuItem({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  shortcut,
  danger = false,
  testId,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  danger?: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-35",
        danger
          ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
          : "text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/[0.06]",
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          danger ? "text-rose-500" : "text-[var(--muted)]",
        )}
        aria-hidden="true"
      />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="rounded border border-[var(--border)] bg-black/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)] dark:bg-white/[0.04]">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
