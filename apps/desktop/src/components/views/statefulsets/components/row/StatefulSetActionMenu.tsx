"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Box,
  Check,
  ChevronRight,
  Code2,
  Copy,
  RotateCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatefulSetSummary } from "@kubeview/contracts";
import { RowAction } from "./rowPrimitives";

export function StatefulSetActionMenu({
  open,
  item,
  openUpwards,
  showKubectlSubmenu,
  onToggleKubectlSubmenu,
  copiedCommand,
  onCopyKubectl,
  kubectlCommands,
  onViewPods,
  onScale,
  onRestart,
  onDelete,
}: {
  open: boolean;
  item: StatefulSetSummary;
  openUpwards: boolean;
  showKubectlSubmenu: boolean;
  onToggleKubectlSubmenu: () => void;
  copiedCommand: string | null;
  onCopyKubectl: (command: string, label: string) => void;
  kubectlCommands: { label: string; command: string }[];
  onViewPods: () => void;
  onScale: () => void;
  onRestart: () => void;
  onDelete: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
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
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "absolute z-50 w-72 p-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl backdrop-blur-md text-left",
            openUpwards
              ? "bottom-full mb-1.5 right-0 origin-bottom-right"
              : "top-full mt-1.5 right-0 origin-top-right",
          )}
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border)]/60 mb-1">
            <span className="text-[11px] font-semibold text-[var(--foreground)] truncate max-w-[150px]">
              {item.name}
            </span>
            <span className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[90px]">
              {item.namespace}
            </span>
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={onViewPods}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group/act"
            >
              <Box className="w-3.5 h-3.5 text-[var(--muted)] group-hover/act:text-[var(--foreground)]" />
              <span>View Pods</span>
            </button>
          </div>

          <div className="my-1 border-t border-[var(--border)]/60" />

          <div className="space-y-0.5">
            <RowAction
              icon={SlidersHorizontal}
              title="Scale Replicas"
              detail={
                item.persistentVolumeClaimRetentionWhenScaled === "Delete"
                  ? "Set replicas; PVCs for removed pods are deleted"
                  : `Set replicas; pods follow ${item.podManagementPolicy}`
              }
              onClick={onScale}
            />
            <RowAction
              icon={RotateCw}
              title="Restart Rollout"
              detail={
                item.updateStrategy === "OnDelete"
                  ? "Patch template; update pods manually (OnDelete)"
                  : item.partition > 0
                    ? `Rolling update; partition ${item.partition}`
                    : "Patch pod template and roll pods by strategy"
              }
              onClick={onRestart}
            />
            <RowAction
              icon={Trash2}
              title="Delete StatefulSet"
              detail={
                item.persistentVolumeClaimRetentionWhenDeleted === "Delete"
                  ? "Delete pods and volume claim templates"
                  : "Delete pods; persistent volume claims are retained"
              }
              onClick={onDelete}
              danger
            />
          </div>

          <div className="my-1 border-t border-[var(--border)]/60" />

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={onToggleKubectlSubmenu}
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
                {kubectlCommands.map((command) => {
                  const isCopied = copiedCommand === command.label;
                  return (
                    <button
                      key={command.label}
                      type="button"
                      onClick={() =>
                        onCopyKubectl(command.command, command.label)
                      }
                      className="w-full text-left p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group/kcmd flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-[var(--foreground)]">
                          {command.label}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--muted)] truncate max-w-[190px]">
                          {command.command}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
