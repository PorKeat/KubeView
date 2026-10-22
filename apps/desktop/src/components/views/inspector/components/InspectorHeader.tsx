"use client";

import * as React from "react";
import {
  Server,
  Box,
  Layers,
  Repeat,
  Copy,
  Check,
  FileText,
  Terminal,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { SelectedResource } from "@/stores/clusterStore";
import type { PodSummary, NodeSummary } from "@kubeview/contracts";

export interface InspectorHeaderProps {
  currentResource: SelectedResource;
  isNode: boolean;
  isDeployment?: boolean;
  isReplicaSet?: boolean;
  nodeData?: NodeSummary;
  podData?: PodSummary;
  onViewPods?: () => void;
  onScaleWorkload?: () => void;
  onRestartWorkload?: () => void;
  onDeleteWorkload?: () => void;
  onClose: () => void;
  onOpenLogsModal: (pod: { name: string; namespace: string }) => void;
  onOpenExecModal: (pod: { name: string; namespace: string }) => void;
  onOpenRestartConfirm: (pod: { name: string; namespace: string }) => void;
  onOpenDeleteConfirm: (pod: { name: string; namespace: string }) => void;
}

export function InspectorHeader({
  currentResource,
  isNode,
  isDeployment = false,
  isReplicaSet = false,
  nodeData,
  podData,
  onViewPods,
  onScaleWorkload,
  onRestartWorkload,
  onDeleteWorkload,
  onClose,
  onOpenLogsModal,
  onOpenExecModal,
  onOpenRestartConfirm,
  onOpenDeleteConfirm,
}: InspectorHeaderProps) {
  const [copiedTitle, setCopiedTitle] = React.useState(false);

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(currentResource.name);
    setCopiedTitle(true);
    toast.success(`Copied: ${currentResource.name}`);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Running":
      case "Active":
      case "Ready":
      case "Healthy":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            {status}
          </span>
        );
      case "Pending":
      case "ContainerCreating":
      case "Terminating":
      case "Progressing":
      case "Paused":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
            {status}
          </span>
        );
      case "Completed":
      case "Succeeded":
      case "Scaled Down":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-black/[0.04] dark:bg-white/[0.06] text-[var(--muted)] border border-[var(--border)] shrink-0">
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 shrink-0">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="h-16 border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-black/40">
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="p-2.5 rounded-xl bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] shrink-0">
          {isNode ? (
            <Server className="w-5 h-5 text-[var(--accent)]" />
          ) : isDeployment ? (
            <Layers className="w-5 h-5 text-[var(--accent)]" />
          ) : isReplicaSet ? (
            <Repeat className="w-5 h-5 text-[var(--accent)]" />
          ) : (
            <Box className="w-5 h-5 text-[var(--accent)]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              onClick={handleCopyTitle}
              title={`Click to copy: ${currentResource.name}`}
              className="text-xs font-bold text-[var(--foreground)] truncate font-mono hover:text-[var(--accent)] cursor-pointer transition-colors max-w-[280px] sm:max-w-[340px]"
            >
              {currentResource.name}
            </span>
            <button
              onClick={handleCopyTitle}
              className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
              title="Copy Full Name"
            >
              {copiedTitle ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
            {renderStatusBadge(currentResource.status)}
          </div>

          {/* Micro-Badges Subheader */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--muted)] mt-1 font-mono">
            <span className="px-1.5 py-0.2 rounded font-semibold bg-black/5 dark:bg-white/5 text-[var(--foreground)] border border-[var(--border)]">
              {currentResource.kind}
            </span>
            <span>•</span>
            {isNode ? (
              <>
                <span>
                  IP: <strong className="text-[var(--foreground)]">{nodeData?.internalIP || "-"}</strong>
                </span>
                {nodeData?.architecture && (
                  <>
                    <span>•</span>
                    <span>
                      Arch: <strong className="text-[var(--foreground)]">{nodeData.architecture}</strong>
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <span>ns:</span>
                  <strong className="text-[var(--foreground)]">{currentResource.namespace}</strong>
                </div>
                {podData?.nodeName && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <span>node:</span>
                      <strong className="text-[var(--foreground)]">{podData.nodeName}</strong>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Controls Toolbar */}
      <div className="flex items-center gap-1 shrink-0 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-[var(--border)]">
        {isDeployment || isReplicaSet ? (
          <>
            <Tooltip content="View Pods">
              <button
                onClick={onViewPods}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="View Pods"
              >
                <Box className="w-4 h-4" />
              </button>
            </Tooltip>

            {onScaleWorkload && (
              <Tooltip content="Scale Replicas">
                <button
                  onClick={onScaleWorkload}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  aria-label="Scale Replicas"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </Tooltip>
            )}

            {onRestartWorkload && (
              <Tooltip content={isReplicaSet ? "Restart Owner Deployment" : "Restart Rollout"}>
                <button
                  onClick={onRestartWorkload}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  aria-label={isReplicaSet ? "Restart Owner Deployment" : "Restart Rollout"}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </Tooltip>
            )}

            {onDeleteWorkload && (
              <Tooltip content="Delete Workload">
                <button
                  onClick={onDeleteWorkload}
                  className="p-1.5 rounded-lg hover:bg-rose-500/15 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
                  aria-label="Delete Workload"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            )}

            <Tooltip content="Copy Resource Name">
              <button
                onClick={handleCopyTitle}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Copy Resource Name"
              >
                <Copy className="w-4 h-4" />
              </button>
            </Tooltip>
          </>
        ) : !isNode ? (
          <>
            <Tooltip content="View Real-Time Logs">
              <button
                onClick={() => onOpenLogsModal({ name: currentResource.name, namespace: currentResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="View Real-Time Logs"
              >
                <FileText className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Interactive Exec Shell">
              <button
                onClick={() => onOpenExecModal({ name: currentResource.name, namespace: currentResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Interactive Exec Shell"
              >
                <Terminal className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Restart Pod">
              <button
                onClick={() => onOpenRestartConfirm({ name: currentResource.name, namespace: currentResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Restart Pod"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Delete Pod">
              <button
                onClick={() => onOpenDeleteConfirm({ name: currentResource.name, namespace: currentResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-rose-500/15 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
                aria-label="Delete Pod"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Tooltip>
          </>
        ) : (
          <Tooltip content="Copy Node Name">
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentResource.name);
                toast.success(`Node name copied: ${currentResource.name}`);
              }}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              aria-label="Copy Node Name"
            >
              <Copy className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        <div className="h-4 w-[1px] bg-[var(--border)] mx-0.5" />

        <Tooltip content="Close drawer" shortcut="Esc">
          <button
            onClick={onClose}
            data-testid="inspector-close-btn"
            aria-label="Close drawer (Escape)"
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
