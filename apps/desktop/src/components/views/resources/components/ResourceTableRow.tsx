"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckSquare,
  Square,
  FileText,
  Terminal,
  RotateCw,
  Trash2,
  Copy,
  Check,
  Server,
  ChevronRight,
  Layers,
  Tag,
  Code2,
  MoreHorizontal,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PodSummary } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";

export interface ResourceTableRowProps {
  item: PodSummary;
  isSelected: boolean;
  density?: "comfortable" | "compact";
  isFailingView?: boolean;
  isPendingView?: boolean;
  onToggleSelect: (key: string) => void;
  onRowClick: (item: PodSummary) => void;
  onLogsClick: (item: PodSummary, containerName?: string) => void;
  onExecClick: (item: PodSummary, containerName?: string) => void;
  onRestartClick: (item: PodSummary) => void;
  onDeleteClick: (item: PodSummary) => void;
  onFilterNode?: (nodeName: string) => void;
  onFilterLabel?: (label: string) => void;
}

export function ResourceTableRow({
  item,
  isSelected,
  density = "comfortable",
  isFailingView = false,
  isPendingView = false,
  onToggleSelect,
  onRowClick,
  onLogsClick,
  onExecClick,
  onRestartClick,
  onDeleteClick,
  onFilterNode,
  onFilterLabel,
}: ResourceTableRowProps) {
  const itemKey = `${item.namespace}/${item.name}`;
  const [copiedName, setCopiedName] = React.useState(false);
  const [copiedIp, setCopiedIp] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
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

  const handleCopyName = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.name);
    setCopiedName(true);
    toast.success(`Copied pod name: ${item.name}`);
    setTimeout(() => setCopiedName(false), 1500);
  };

  const handleCopyIp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.ip) return;
    navigator.clipboard.writeText(item.ip);
    setCopiedIp(true);
    toast.success(`Copied IP: ${item.ip}`);
    setTimeout(() => setCopiedIp(false), 1500);
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

  const renderStatus = (pod: PodSummary) => {
    const [readyCount, totalCount] = pod.ready
      ? pod.ready.split("/").map(Number)
      : [1, 1];

    // If Running but 0 of 1 (or 0 of N) containers ready, pod is completely unready / failing
    if (pod.status === "Running" && totalCount > 0 && readyCount === 0) {
      return (
        <StatusBeacon
          variant="critical"
          label={`Unready (${pod.ready})`}
          size="xs"
          pulse={true}
        />
      );
    }

    // If Running but partially ready (e.g. 1/2)
    if (pod.status === "Running" && totalCount > 0 && readyCount < totalCount) {
      return (
        <StatusBeacon
          variant="warning"
          label={`Degraded (${pod.ready})`}
          size="xs"
          pulse={false}
        />
      );
    }

    switch (pod.status) {
      case "Running":
        return (
          <StatusBeacon
            variant="healthy"
            label={pod.status}
            size="xs"
            pulse={false}
          />
        );
      case "Pending":
      case "ContainerCreating":
      case "PodInitializing":
        return (
          <StatusBeacon
            variant="pending"
            label={pod.status}
            size="xs"
            pulse={true}
          />
        );
      case "Completed":
      case "Succeeded":
        return (
          <StatusBeacon
            variant="muted"
            label={pod.status}
            size="xs"
            pulse={false}
          />
        );
      case "Terminating":
        return (
          <StatusBeacon
            variant="warning"
            label={pod.status}
            size="xs"
            pulse={true}
          />
        );
      default:
        return (
          <StatusBeacon
            variant="critical"
            label={pod.status}
            size="xs"
            pulse={true}
          />
        );
    }
  };

  const isCompact = density === "compact";

  return (
    <React.Fragment>
      <tr
        onClick={() => onRowClick(item)}
        className={cn(
          "hover:bg-[var(--surface-hover)] cursor-pointer transition-colors group",
          isCompact ? "h-7 text-[11px]" : "h-9 text-xs",
          isSelected && "bg-[var(--accent)]/5 dark:bg-[var(--accent)]/10",
          isExpanded && "bg-[var(--surface-hover)]/70",
        )}
      >
        <td className="px-3 text-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggleSelect(itemKey)}
            className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center justify-center cursor-pointer"
          >
            {isSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
            ) : (
              <Square className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            )}
          </button>
        </td>

        {/* Name with Expand Chevron & Quick Copy */}
        <td className="py-1 px-3 font-medium font-mono text-[var(--foreground)] truncate max-w-[340px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              className="p-0.5 -ml-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
              title={
                isExpanded ? "Collapse containers" : "Expand containers & sidecars"
              }
              aria-label={
                isExpanded ? "Collapse containers" : "Expand containers & sidecars"
              }
            >
              <ChevronRight
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  isExpanded && "rotate-90 text-[var(--accent)]",
                )}
              />
            </button>
            <span className="truncate" title={item.name}>
              {item.name}
            </span>
            <button
              type="button"
              onClick={handleCopyName}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
              title="Copy pod name"
            >
              {copiedName ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </td>

        {/* Namespace */}
        <td className="py-1 px-3 font-mono text-[var(--muted)] truncate max-w-[130px]">
          {item.namespace}
        </td>

        {/* Status */}
        <td className="py-1 px-3">{renderStatus(item)}</td>

        {/* Ready */}
        <td className="py-1 px-3 font-mono text-[var(--foreground)]">
          {item.ready}
        </td>

        {/* Restarts */}
        <td className="py-1 px-3 font-mono text-[var(--muted)]">
          <span
            className={cn(
              "tabular-nums text-xs",
              item.restarts === 0 && "opacity-40",
              item.restarts > 0 && item.restarts < 10 && "text-amber-500 font-medium",
              item.restarts >= 10 && "text-rose-500 font-semibold",
            )}
            title={
              item.restarts > 0
                ? `${item.restarts} container restart${item.restarts > 1 ? "s" : ""}`
                : "0 restarts"
            }
          >
            {item.restarts}
          </span>
        </td>

        {/* Node (Clickable Filter Pill) */}
        <td className="py-1 px-3" onClick={(e) => e.stopPropagation()}>
          {item.nodeName ? (
            <button
              type="button"
              onClick={() => onFilterNode && onFilterNode(item.nodeName!)}
              title={`Filter pods on node '${item.nodeName}'`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 hover:bg-[var(--accent)]/15 hover:text-[var(--accent)] border border-[var(--border)] transition-colors cursor-pointer truncate max-w-[140px]"
            >
              <Server className="w-2.5 h-2.5 shrink-0 opacity-60" />
              <span className="truncate">{item.nodeName}</span>
            </button>
          ) : (
            <span className="text-[10px] text-[var(--muted)] font-mono italic">
              unassigned
            </span>
          )}
        </td>

        {/* IP with Click-to-Copy */}
        <td
          className="py-1 px-3 font-mono text-[var(--muted)] text-[11px]"
          onClick={(e) => e.stopPropagation()}
        >
          {item.ip ? (
            <button
              type="button"
              onClick={handleCopyIp}
              className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer group/ip"
              title="Click to copy IP"
            >
              <span>{item.ip}</span>
              {copiedIp ? (
                <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
              ) : (
                <Copy className="w-2.5 h-2.5 opacity-0 group-hover/ip:opacity-100 transition-opacity shrink-0" />
              )}
            </button>
          ) : (
            <span className="opacity-40">-</span>
          )}
        </td>

        {/* CPU */}
        <td className="py-1 px-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[var(--foreground)] text-[11px] w-9">
              {item.cpu}
            </span>
            {!isCompact && item.cpuPercent > 0 && (
              <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden w-10">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${item.cpuPercent}%` }}
                />
              </div>
            )}
          </div>
        </td>

        {/* Memory */}
        <td className="py-1 px-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[var(--foreground)] text-[11px] w-12">
              {item.memory}
            </span>
            {!isCompact && item.memoryPercent > 0 && (
              <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden w-10">
                <div
                  className={cn(
                    "h-full rounded-full",
                    item.memoryPercent > 70
                      ? "bg-rose-500"
                      : "bg-cyan-500 dark:bg-cyan-400",
                  )}
                  style={{ width: `${item.memoryPercent}%` }}
                />
              </div>
            )}
          </div>
        </td>

        {/* Age */}
        <td className="py-1 px-3 font-mono text-[var(--muted)]">{item.age}</td>

        {/* Action Buttons: Clean '...' Dropdown */}
        <td
          className="py-1 px-3 text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative inline-flex items-center justify-end" ref={actionMenuRef}>
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
              title="Actions"
              aria-label={`Actions for ${item.name}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

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
        </td>
      </tr>

      {/* Expanded Container and Sidecars Sub-row */}
      {isExpanded && (
        <tr className="bg-[var(--surface-active)]/15 dark:bg-white/[0.012] border-b border-[var(--border)]">
          <td
            colSpan={12}
            className="py-3 px-4 pl-10 pr-6"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-2.5"
            >
              {/* Top Header: Meta and Labels */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border)]/60 text-xs">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="font-semibold text-[var(--foreground)]">
                    Containers &amp; Sidecars ({item.containers?.length || 0})
                  </span>
                  {item.controlledBy && (
                    <span className="text-[11px] text-[var(--muted)] font-mono">
                      Controlled by:{" "}
                      <strong className="text-[var(--foreground)] font-medium">
                        {item.controlledBy}
                      </strong>
                    </span>
                  )}
                  {item.qosClass && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
                      QoS: {item.qosClass}
                    </span>
                  )}
                </div>

                {/* Labels: Sleek neutral pills */}
                {item.labels && Object.keys(item.labels).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 max-w-xl">
                    <span className="text-[10px] font-medium text-[var(--muted)] flex items-center gap-1">
                      <Tag className="w-3 h-3 opacity-60" /> Labels:
                    </span>
                    {Object.entries(item.labels)
                      .slice(0, 8)
                      .map(([k, v]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() =>
                            onFilterLabel && onFilterLabel(`${k}=${v}`)
                          }
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
                          title={`Filter pods by label ${k}=${v}`}
                        >
                          <span className="text-[var(--muted)]">{k}</span>
                          <span className="opacity-40">=</span>
                          <span className="text-[var(--foreground)] font-medium truncate max-w-[140px]">
                            {v}
                          </span>
                        </button>
                      ))}
                    {Object.keys(item.labels).length > 8 && (
                      <span className="text-[10px] text-[var(--muted)] font-mono">
                        +{Object.keys(item.labels).length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Containers Flat List (No nested card boxes, no dots) */}
              <div className="divide-y divide-[var(--border)]/50">
                {!item.containers || item.containers.length === 0 ? (
                  <div className="text-xs text-[var(--muted)] italic py-2">
                    No container telemetry available for this pod.
                  </div>
                ) : (
                  item.containers.map((c) => {
                    const isReady = c.ready;
                    const stateStr =
                      c.state || (isReady ? "Running" : "Pending");
                    return (
                      <div
                        key={c.name}
                        className="flex flex-wrap items-center justify-between gap-3 py-2 px-1 rounded hover:bg-black/[0.02] dark:hover:bg-white/[0.02] text-xs transition-colors group/c"
                      >
                        {/* Left: Container Identity & Status (No status dot) */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-[var(--foreground)] truncate">
                                {c.name}
                              </span>
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold",
                                  isReady
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                                )}
                              >
                                {c.stateReason || stateStr}
                              </span>
                              {c.restartCount > 0 && (
                                <span className="text-[10px] font-mono text-amber-500 font-medium">
                                  {c.restartCount} restart
                                  {c.restartCount > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--muted)] font-mono truncate max-w-xl">
                              <span className="truncate" title={c.image}>
                                {c.image}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Center: Ports if present */}
                        <div className="flex items-center gap-2">
                          {c.ports && c.ports.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {c.ports.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                                  title={
                                    p.name
                                      ? `${p.name}: ${p.containerPort}/${p.protocol || "TCP"}`
                                      : `${p.containerPort}/${p.protocol || "TCP"}`
                                  }
                                >
                                  {p.containerPort}/{p.protocol || "TCP"}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Right: Container-specific Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onLogsClick(item, c.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors cursor-pointer"
                            title={`View logs for container '${c.name}'`}
                          >
                            <FileText className="w-3 h-3 text-[var(--muted)]" />
                            <span>Logs</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onExecClick(item, c.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors cursor-pointer"
                            title={`Exec shell in container '${c.name}'`}
                          >
                            <Terminal className="w-3 h-3 text-[var(--muted)]" />
                            <span>Exec</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const cmd = `kubectl logs ${item.name} -c ${c.name} -n ${item.namespace} -f`;
                              navigator.clipboard.writeText(cmd);
                              toast.success(`Copied container logs command`);
                            }}
                            className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Copy kubectl logs CLI command for this container"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
