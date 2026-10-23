"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  Check,
  ChevronRight,
  MoreHorizontal,
  Box,
  Code2,
  Repeat,
  SlidersHorizontal,
  Tag,
  Layers,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import type { ReplicaSetSummary } from "@kubeview/contracts";
import { StatusBeacon, Tooltip } from "@/components/ui";
import {
  getReplicaSetBeaconVariant,
  getReplicaSetStatusPulse,
} from "../lib/replicaSetStatus";

export interface ReplicaSetTableRowProps {
  item: ReplicaSetSummary;
  onViewPods: (replicaSet: ReplicaSetSummary) => void;
  onRowClick?: (replicaSet: ReplicaSetSummary) => void;
}

export function ReplicaSetTableRow({
  item,
  onViewPods,
  onRowClick,
}: ReplicaSetTableRowProps) {
  const openWorkloadAction = useClusterStore(
    (state) => state.openWorkloadAction,
  );
  const [copiedName, setCopiedName] = React.useState(false);
  const [copiedCommand, setCopiedCommand] = React.useState<string | null>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
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

  const handleCopyName = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(item.name);
    setCopiedName(true);
    toast.success(`Copied replicaset name: ${item.name}`);
    setTimeout(() => setCopiedName(false), 1500);
  };

  const desired = item.desiredReplicas ?? 0;
  const current = item.currentReplicas ?? 0;
  const ready = item.readyReplicas ?? 0;
  const available = item.availableReplicas ?? 0;
  const readyRatio = desired === 0 ? 1 : ready / desired;
  const readyTone =
    readyRatio >= 1
      ? "text-[var(--foreground)]"
      : readyRatio === 0
        ? "text-rose-500 font-semibold"
        : "text-amber-500 font-medium";

  const closeRowActionMenu = () => {
    setShowActionMenu(false);
    setShowKubectlSubmenu(false);
  };

  const handleScaleWorkload = () => {
    closeRowActionMenu();
    openWorkloadAction({
      kind: "ReplicaSet",
      action: "scale",
      name: item.name,
      namespace: item.namespace,
      replicas: desired,
      ownerDeployment: item.ownerDeployment,
    });
  };

  const handleDeleteWorkload = () => {
    closeRowActionMenu();
    openWorkloadAction({
      kind: "ReplicaSet",
      action: "delete",
      name: item.name,
      namespace: item.namespace,
      ownerDeployment: item.ownerDeployment,
    });
  };

  const kubectlCommands = [
    {
      label: "Describe ReplicaSet",
      command: `kubectl describe replicaset ${item.name} -n ${item.namespace}`,
    },
    {
      label: "Scale Replicas",
      command: `kubectl scale replicaset ${item.name} --replicas=${desired} -n ${item.namespace}`,
    },
    {
      label: "Delete ReplicaSet",
      command: `kubectl delete replicaset ${item.name} -n ${item.namespace}`,
    },
  ];

  const handleCopyKubectl = (command: string, label: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(label);
    toast.success(`Copied: ${command}`);
    setTimeout(() => setCopiedCommand(null), 1200);
  };

  const conditions = item.conditions ?? [];
  const selector = item.selector ?? {};
  const images = item.images ?? [];
  const labels = item.labels ?? {};

  return (
    <React.Fragment>
      <tr
        onClick={() => {
          if (onRowClick) {
            onRowClick(item);
          } else {
            setIsExpanded((prev) => !prev);
          }
        }}
        className={cn(
          "hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group h-9 text-xs",
          isExpanded && "bg-[var(--surface-hover)]/70",
        )}
      >
        <td className="py-1 px-3 font-medium font-mono text-[var(--foreground)] truncate">
          <div className="flex items-center gap-1 min-w-0">
            <Tooltip content={isExpanded ? "Collapse details" : "Expand details"}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsExpanded((prev) => !prev);
                }}
                className="p-0.5 -ml-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
                aria-label={isExpanded ? "Collapse details" : "Expand details"}
              >
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isExpanded && "rotate-90 text-[var(--accent)]",
                  )}
                />
              </button>
            </Tooltip>
            <span className="truncate" title={item.name}>
              {item.name}
            </span>
            <Tooltip content={copiedName ? "Copied!" : "Copy replicaset name"}>
              <button
                type="button"
                onClick={handleCopyName}
                className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                aria-label="Copy replicaset name"
              >
                {copiedName ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </Tooltip>
          </div>
        </td>

        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">
          {item.namespace}
        </td>

        <td className="py-1 px-3 truncate">
          <StatusBeacon
            variant={getReplicaSetBeaconVariant(item)}
            label={item.status}
            size="xs"
            pulse={getReplicaSetStatusPulse(item)}
          />
        </td>

        <td className="py-1 px-3 font-mono text-[var(--foreground)] text-[11px] truncate">
          <span className="tabular-nums" title={`${desired} desired replicas`}>
            {desired}
          </span>
        </td>

        <td className="py-1 px-3 font-mono text-[var(--muted)] text-[11px] truncate">
          <span
            className={cn(
              "tabular-nums",
              current !== desired && "text-amber-500",
            )}
            title={`${current} current replicas`}
          >
            {current}
          </span>
        </td>

        <td className="py-1 px-3 font-mono text-[11px] truncate">
          <span
            className={cn("tabular-nums text-xs", readyTone)}
            title={`${ready} of ${desired} replicas ready`}
          >
            {ready}
          </span>
        </td>

        <td className="py-1 px-3 truncate">
          {item.ownerDeployment ? (
            <span
              title={item.ownerDeployment}
              className="inline-flex max-w-full min-w-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
            >
              <Layers className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[120px]">{item.ownerDeployment}</span>
            </span>
          ) : (
            <span className="text-[10px] text-[var(--muted)] font-mono italic">
              standalone
            </span>
          )}
        </td>

        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate">
          {item.age}
        </td>

        <td className="py-1 px-2 text-right" onClick={(event) => event.stopPropagation()}>
          <div className="relative inline-flex items-center justify-end" ref={actionMenuRef}>
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
                  transition={{ type: "spring", stiffness: 450, damping: 30, mass: 0.8 }}
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
                      detail={
                        item.ownerDeployment
                          ? "Set replicas; the owner Deployment may reconcile it back"
                          : "Set replicas; the controller adds or removes pods"
                      }
                      onClick={handleScaleWorkload}
                    />
                    <RowAction
                      icon={Trash2}
                      title="Delete ReplicaSet"
                      detail={
                        item.ownerDeployment
                          ? "Delete its pods; the owner Deployment may recreate it"
                          : "Delete this ReplicaSet and its pods"
                      }
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
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-[var(--surface-active)]/15 dark:bg-white/[0.012] border-b border-[var(--border)]">
          <td
            className="py-3 px-4 pl-10 pr-6"
            colSpan={9}
            onClick={(event) => event.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border)]/60 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Repeat className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="font-semibold text-[var(--foreground)]">
                    ReplicaSet Details
                  </span>
                  {item.revision && (
                    <span className="text-[11px] text-[var(--muted)] font-mono">
                      Revision{" "}
                      <strong className="text-[var(--foreground)] font-medium">
                        {item.revision}
                      </strong>
                    </span>
                  )}
                  {item.ownerDeployment && (
                    <span
                      title={item.ownerDeployment}
                      className="inline-flex max-w-full min-w-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    >
                      <span className="shrink-0">Deployment:</span>
                      <span className="truncate max-w-[200px]">
                        {item.ownerDeployment}
                      </span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onViewPods(item)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors cursor-pointer"
                >
                  <Box className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>View Pods</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <ReplicaTile label="Desired" value={desired} />
                <ReplicaTile
                  label="Current"
                  value={current}
                  tone={current !== desired ? "warning" : "healthy"}
                />
                <ReplicaTile
                  label="Ready"
                  value={ready}
                  tone={ready < desired ? "warning" : "healthy"}
                />
                <ReplicaTile
                  label="Available"
                  value={available}
                  tone={available < desired ? "warning" : "healthy"}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-1">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1">
                    Conditions
                  </div>
                  {conditions.length === 0 ? (
                    <div className="text-[11px] text-[var(--muted)] italic py-1">
                      No ReplicaSet conditions reported.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border)]/40">
                      {conditions.map((condition) => (
                        <div
                          key={`${condition.type}-${condition.reason}`}
                          className="py-1.5 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-semibold text-[var(--foreground)]">
                              {condition.type}
                            </span>
                            <StatusBeacon
                              variant={condition.status === "True" ? "critical" : "healthy"}
                              label={condition.status}
                              size="xs"
                            />
                          </div>
                          {condition.reason && (
                            <div className="text-[10px] font-mono text-[var(--muted)] mt-0.5">
                              {condition.reason}
                            </div>
                          )}
                          {condition.message && (
                            <div className="text-[10px] text-[var(--muted)] mt-0.5 leading-relaxed line-clamp-2">
                              {condition.message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 opacity-60" /> Selector
                    </div>
                    {Object.keys(selector).length === 0 ? (
                      <div className="text-[11px] text-[var(--muted)] italic">
                        No label selector.
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {Object.entries(selector).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                          >
                            <span>{key}</span>
                            <span className="opacity-40">=</span>
                            <span className="text-[var(--foreground)] font-medium truncate max-w-[140px]">
                              {value}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1 flex items-center gap-1">
                      <Box className="w-3 h-3 opacity-60" /> Images
                    </div>
                    {images.length === 0 ? (
                      <div className="text-[11px] text-[var(--muted)] italic">
                        No container images.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {images.map((image) => (
                          <div
                            key={image}
                            className="text-[11px] font-mono text-[var(--foreground)] bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]/70 rounded-md px-2 py-1 truncate"
                            title={image}
                          >
                            {image}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {Object.keys(labels).length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1">
                        Labels
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {Object.entries(labels)
                          .slice(0, 8)
                          .map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                            >
                              <span>{key}</span>
                              <span className="opacity-40">=</span>
                              <span className="text-[var(--foreground)] font-medium truncate max-w-[120px]">
                                {value}
                              </span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

function ReplicaTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "healthy" | "warning";
}) {
  return (
    <div className="rounded-lg border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">
        {label}
      </div>
      <div
        className={cn(
          "text-sm font-mono font-semibold tabular-nums mt-0.5",
          tone === "healthy" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-500",
          tone === "default" && "text-[var(--foreground)]",
        )}
      >
        {value}
      </div>
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
