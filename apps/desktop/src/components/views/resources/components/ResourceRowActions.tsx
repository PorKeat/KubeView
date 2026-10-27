"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Terminal,
  RotateCw,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Code2,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PodSummary } from "@kubeview/contracts";
import { Tooltip } from "@/components/ui";

export interface ResourceRowActionsProps {
  item: PodSummary;
  onLogsClick: (item: PodSummary, containerName?: string) => void;
  onExecClick: (item: PodSummary, containerName?: string) => void;
  onRestartClick: (item: PodSummary) => void;
  onDeleteClick: (item: PodSummary) => void;
}

export function ResourceRowActions({
  item,
  onLogsClick,
  onExecClick,
  onRestartClick,
  onDeleteClick,
}: ResourceRowActionsProps) {
  const [showActionMenu, setShowActionMenu] = React.useState(false);
  const [showKubectlSubmenu, setShowKubectlSubmenu] = React.useState(false);
  const [openUpwards, setOpenUpwards] = React.useState(false);
  const [copiedCommand, setCopiedCommand] = React.useState<string | null>(null);
  const actionMenuRef = React.useRef<HTMLDivElement>(null);
  const actionButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close action menu on outside click
  React.useEffect(() => {
    if (!showActionMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node)
      ) {
        setShowActionMenu(false);
        setShowKubectlSubmenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionMenu]);

  const handleToggleActionMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showActionMenu && actionButtonRef.current) {
      const rect = actionButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 280);
    }
    setShowActionMenu((prev) => !prev);
    setShowKubectlSubmenu(false);
  };

  const defaultPort = item.containers?.[0]?.ports?.[0]?.containerPort || 8080;
  const kubectlCommands = [
    {
      label: "Logs (Follow)",
      command: `kubectl logs ${item.name} -n ${item.namespace} -f`,
    },
    {
      label: "Interactive Shell",
      command: `kubectl exec -it ${item.name} -n ${item.namespace} -- /bin/sh`,
    },
    {
      label: "Describe Pod",
      command: `kubectl describe pod ${item.name} -n ${item.namespace}`,
    },
    {
      label: "Port Forward",
      command: `kubectl port-forward pod/${item.name} ${defaultPort}:${defaultPort} -n ${item.namespace}`,
    },
    {
      label: "Delete Pod",
      command: `kubectl delete pod ${item.name} -n ${item.namespace}`,
    },
  ];

  const handleCopyKubectl = (cmd: string, label: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(label);
    toast.success(`Copied: ${cmd}`);
    setTimeout(() => {
      setCopiedCommand(null);
    }, 1200);
  };

  return (
    <div
      className="relative inline-flex items-center justify-end"
      ref={actionMenuRef}
    >
      <Tooltip content="Actions menu" disabled={showActionMenu} side="left">
        <button
          ref={actionButtonRef}
          type="button"
          onClick={handleToggleActionMenu}
          className={cn(
            "p-1 rounded-md transition-colors cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]",
            showActionMenu
              ? "bg-[var(--surface-active)] text-[var(--foreground)] opacity-100"
              : "hover:bg-black/10 dark:hover:bg-white/10 opacity-60 group-hover:opacity-100",
          )}
          aria-label={`Actions for ${item.name}`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </Tooltip>

      <AnimatePresence>
        {showActionMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: openUpwards ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: openUpwards ? 4 : -4 }}
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 30,
              mass: 0.8,
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute z-50 w-64 p-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl backdrop-blur-md text-left",
              openUpwards
                ? "bottom-full mb-1.5 right-0 origin-bottom-right"
                : "top-full mt-1.5 right-0 origin-top-right",
            )}
          >
            {/* Header: Pod Name & Namespace */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border)]/60 mb-1">
              <span className="text-[11px] font-semibold text-[var(--foreground)] truncate max-w-[150px]">
                {item.name}
              </span>
              <span className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[90px]">
                {item.namespace}
              </span>
            </div>

            {/* Primary Workload Actions */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setShowActionMenu(false);
                  onLogsClick(item);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group/act"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--muted)] group-hover/act:text-[var(--foreground)]" />
                <span>View Logs</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowActionMenu(false);
                  onExecClick(item);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group/act"
              >
                <Terminal className="w-3.5 h-3.5 text-[var(--muted)] group-hover/act:text-[var(--foreground)]" />
                <span>Exec Shell</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowActionMenu(false);
                  onRestartClick(item);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group/act"
              >
                <RotateCw className="w-3.5 h-3.5 text-[var(--muted)] group-hover/act:text-[var(--foreground)]" />
                <span>Restart Pod</span>
              </button>
            </div>

            <div className="my-1 border-t border-[var(--border)]/60" />

            {/* Quick kubectl CLI Commands */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setShowKubectlSubmenu((v) => !v)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group/act"
              >
                <div className="flex items-center gap-2.5">
                  <Code2 className="w-3.5 h-3.5 text-[var(--muted)] group-hover/act:text-[var(--foreground)]" />
                  <span>Quick kubectl CLI</span>
                </div>
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 text-[var(--muted)] transition-transform duration-150",
                    showKubectlSubmenu && "rotate-90 text-[var(--accent)]",
                  )}
                />
              </button>

              {showKubectlSubmenu && (
                <div className="pl-2 pr-1 py-1 space-y-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-lg">
                  {kubectlCommands.map((kc) => {
                    const isCopied = copiedCommand === kc.label;
                    return (
                      <button
                        key={kc.label}
                        type="button"
                        onClick={() => handleCopyKubectl(kc.command, kc.label)}
                        className="w-full text-left p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group/kcmd flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-[var(--foreground)]">
                            {kc.label}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--muted)] truncate max-w-[190px]">
                            {kc.command}
                          </div>
                        </div>
                        <div className="p-1 shrink-0 text-[var(--muted)] group-hover/kcmd:text-[var(--foreground)]">
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60 group-hover/kcmd:opacity-100" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="my-1 border-t border-[var(--border)]/60" />

            {/* Destructive Action */}
            <button
              type="button"
              onClick={() => {
                setShowActionMenu(false);
                onDeleteClick(item);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer group/act"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500/80 group-hover/act:text-rose-500" />
              <span>Delete Pod</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
