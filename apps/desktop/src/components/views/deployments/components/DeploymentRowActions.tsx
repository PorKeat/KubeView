"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronRight,
  MoreHorizontal,
  Box,
  Code2,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import type { DeploymentSummary } from "@kubeview/contracts";
import { Tooltip } from "@/components/ui";

export interface DeploymentRowActionsProps {
  item: DeploymentSummary;
  onViewPods: (item: DeploymentSummary) => void;
}

export function DeploymentRowActions({
  item,
  onViewPods,
}: DeploymentRowActionsProps) {
  const openWorkloadAction = useClusterStore(
    (state) => state.openWorkloadAction,
  );
  const [copiedCommand, setCopiedCommand] = React.useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = React.useState(false);
  const [showKubectlSubmenu, setShowKubectlSubmenu] = React.useState(false);
  const [openUpwards, setOpenUpwards] = React.useState(false);
  const actionMenuRef = React.useRef<HTMLDivElement>(null);
  const actionButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!showActionMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setShowActionMenu(false);
        setShowKubectlSubmenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionMenu]);

  const handleToggleActionMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!showActionMenu && actionButtonRef.current) {
      const rect = actionButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 420);
    }
    setShowActionMenu((prev) => !prev);
    setShowKubectlSubmenu(false);
  };

  const desired = item.desiredReplicas ?? 0;

  const closeRowActionMenu = () => {
    setShowActionMenu(false);
    setShowKubectlSubmenu(false);
  };

  const handleScaleWorkload = () => {
    closeRowActionMenu();
    openWorkloadAction({
      kind: "Deployment",
      action: "scale",
      name: item.name,
      namespace: item.namespace,
      replicas: desired,
    });
  };

  const handleRestartWorkload = () => {
    closeRowActionMenu();
    openWorkloadAction({
      kind: "Deployment",
      action: "restart",
      name: item.name,
      namespace: item.namespace,
    });
  };

  const handleDeleteWorkload = () => {
    closeRowActionMenu();
    openWorkloadAction({
      kind: "Deployment",
      action: "delete",
      name: item.name,
      namespace: item.namespace,
    });
  };

  const kubectlCommands = [
    {
      label: "Describe Deployment",
      command: `kubectl describe deployment ${item.name} -n ${item.namespace}`,
    },
    {
      label: "Rollout Status",
      command: `kubectl rollout status deployment ${item.name} -n ${item.namespace}`,
    },
    {
      label: "Restart Rollout",
      command: `kubectl rollout restart deployment ${item.name} -n ${item.namespace}`,
    },
    {
      label: "Scale Replicas",
      command: `kubectl scale deployment ${item.name} --replicas=${desired} -n ${item.namespace}`,
    },
    {
      label: "Delete Deployment",
      command: `kubectl delete deployment ${item.name} -n ${item.namespace}`,
    },
  ];

  const handleCopyKubectl = (command: string, label: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(label);
    toast.success(`Copied: ${command}`);
    setTimeout(() => setCopiedCommand(null), 1200);
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
                onClick={() => {
                  setShowActionMenu(false);
                  onViewPods(item);
                }}
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
                detail="Set spec.replicas without deleting the Deployment"
                onClick={handleScaleWorkload}
              />
              <RowAction
                icon={RotateCw}
                title="Restart Rollout"
                detail="Patch the pod template and roll pods by strategy"
                onClick={handleRestartWorkload}
              />
              <RowAction
                icon={Trash2}
                title="Delete Deployment"
                detail="Cascade delete its ReplicaSets and Pods"
                onClick={handleDeleteWorkload}
                danger
              />
            </div>

            <div className="my-1 border-t border-[var(--border)]/60" />

            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setShowKubectlSubmenu((value) => !value)}
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
                          handleCopyKubectl(command.command, command.label)
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
    </div>
  );
}

function RowAction({
  icon: Icon,
  title,
  detail,
  onClick,
  danger = false,
}: {
  icon: React.ElementType;
  title: string;
  detail: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group/act",
        danger
          ? "hover:bg-rose-500/10"
          : "hover:bg-black/5 dark:hover:bg-white/[0.06]",
      )}
    >
      <Icon
        className={cn(
          "w-3.5 h-3.5 mt-0.5 shrink-0",
          danger
            ? "text-rose-500"
            : "text-[var(--muted)] group-hover/act:text-[var(--foreground)]",
        )}
      />
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[11px] font-medium",
            danger
              ? "text-rose-600 dark:text-rose-400"
              : "text-[var(--foreground)]",
          )}
        >
          {title}
        </span>
        <span className="block text-[10px] leading-relaxed text-[var(--muted)]">
          {detail}
        </span>
      </span>
    </button>
  );
}
