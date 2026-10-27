"use client";

import * as React from "react";
import {
  Server,
  Box,
  Layers,
  Repeat,
  Database,
  Cpu,
  Clock,
  Copy,
  Check,
  FileText,
  FileCode,
  FolderLock,
  HardDrive,
  Terminal,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  X,
  Pause,
  Play,
  Zap,
  Network,
  Radio,
  Globe,
  Shield,
  Waypoints,
  Users,
  Boxes,
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
  isStatefulSet?: boolean;
  isDaemonSet?: boolean;
  isJob?: boolean;
  isCronJob?: boolean;
  isNetworkingResource?: boolean;
  isConfigStorageResource?: boolean;
  isAccessResource?: boolean;
  nodeData?: NodeSummary;
  podData?: PodSummary;
  onViewPods?: () => void;
  onViewJobs?: () => void;
  onScaleWorkload?: () => void;
  onRestartWorkload?: () => void;
  onDeleteWorkload?: () => void;
  onToggleCronJobSuspend?: () => void;
  onTriggerCronJob?: () => void;
  cronJobSuspended?: boolean;
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
  isStatefulSet = false,
  isDaemonSet = false,
  isJob = false,
  isCronJob = false,
  isNetworkingResource = false,
  isConfigStorageResource = false,
  isAccessResource = false,
  nodeData,
  podData,
  onViewPods,
  onViewJobs,
  onScaleWorkload,
  onRestartWorkload,
  onDeleteWorkload,
  onToggleCronJobSuspend,
  onTriggerCronJob,
  cronJobSuspended = false,
  onClose,
  onOpenLogsModal,
  onOpenExecModal,
  onOpenRestartConfirm,
  onOpenDeleteConfirm,
}: InspectorHeaderProps) {
  const [copiedTitle, setCopiedTitle] = React.useState(false);
  const isWorkloadController =
    isDeployment || isReplicaSet || isStatefulSet || isDaemonSet || isJob;
  const NetworkingIcon =
    currentResource.kind === "Service"
      ? Network
      : currentResource.kind === "Endpoints"
        ? Radio
        : currentResource.kind === "Ingress"
          ? Globe
          : currentResource.kind === "NetworkPolicy"
            ? Shield
            : Waypoints;

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
      case "Automount on":
      case "Role":
      case "Complete":
      case "Programmed":
      case "Accepted":
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
      case "Suspended":
      case "Not Ready":
      case "No Endpoints":
      case "Immutable":
      case "Released":
      case "Available":
      case "Unknown":
      case "Automount off":
      case "Binding":
      case "Namespaced":
      case "Cluster":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
            {status}
          </span>
        );
      case "Completed":
      case "Succeeded":
      case "Scaled Down":
      case "Idle":
      case "Empty":
      case "Ingress":
      case "Egress":
      case "Ingress + Egress":
      case "ClusterIP":
      case "NodePort":
      case "LoadBalancer":
      case "ExternalName":
      case "Bound":
      case "Default":
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
    <div className="min-h-16 border-b border-[var(--border)] px-3 sm:px-4 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 bg-slate-50/80 dark:bg-black/40">
      <div className="flex flex-1 items-center gap-2 min-w-0 pr-0 sm:gap-3 sm:pr-2">
        <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] shrink-0">
          {isAccessResource ? (
            currentResource.kind === "ServiceAccount" ? (
              <Users className="w-5 h-5 text-[var(--accent)]" />
            ) : currentResource.kind === "CustomResourceDefinition" ? (
              <Boxes className="w-5 h-5 text-[var(--accent)]" />
            ) : (
              <Shield className="w-5 h-5 text-[var(--accent)]" />
            )
          ) : isConfigStorageResource ? (
            currentResource.kind === "ConfigMap" ? (
              <FileCode className="w-5 h-5 text-[var(--accent)]" />
            ) : currentResource.kind === "Secret" ? (
              <FolderLock className="w-5 h-5 text-[var(--accent)]" />
            ) : currentResource.kind === "PersistentVolume" ? (
              <HardDrive className="w-5 h-5 text-[var(--accent)]" />
            ) : (
              <Database className="w-5 h-5 text-[var(--accent)]" />
            )
          ) : isNetworkingResource ? (
            <NetworkingIcon className="w-5 h-5 text-[var(--accent)]" />
          ) : isNode ? (
            <Server className="w-5 h-5 text-[var(--accent)]" />
          ) : isDeployment ? (
            <Layers className="w-5 h-5 text-[var(--accent)]" />
          ) : isReplicaSet ? (
            <Repeat className="w-5 h-5 text-[var(--accent)]" />
          ) : isStatefulSet ? (
            <Database className="w-5 h-5 text-[var(--accent)]" />
          ) : isDaemonSet ? (
            <Cpu className="w-5 h-5 text-[var(--accent)]" />
          ) : isJob || isCronJob ? (
            <Clock className="w-5 h-5 text-[var(--accent)]" />
          ) : (
            <Box className="w-5 h-5 text-[var(--accent)]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTitle}
              title={`Click to copy: ${currentResource.name}`}
              aria-label={`Copy resource name ${currentResource.name}`}
              className="max-w-[140px] truncate bg-transparent p-0 text-left font-mono text-xs font-bold text-[var(--foreground)] transition-colors hover:text-[var(--accent)] cursor-pointer sm:max-w-[280px] md:max-w-[340px]"
            >
              {currentResource.name}
            </button>
            <Tooltip
              content={
                copiedTitle ? "Copied to clipboard" : "Copy resource name"
              }
            >
              <button
                onClick={handleCopyTitle}
                className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
                aria-label="Copy resource name"
              >
                {copiedTitle ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </Tooltip>
            {renderStatusBadge(currentResource.status)}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--muted)] mt-1 font-mono">
            <span className="px-1.5 py-0.2 rounded font-semibold bg-black/5 dark:bg-white/5 text-[var(--foreground)] border border-[var(--border)]">
              {currentResource.kind}
            </span>
            <span>•</span>
            {isNode ? (
              <>
                <span>
                  IP:{" "}
                  <strong className="text-[var(--foreground)]">
                    {nodeData?.internalIP || "-"}
                  </strong>
                </span>
                {nodeData?.architecture && (
                  <>
                    <span>•</span>
                    <span>
                      Arch:{" "}
                      <strong className="text-[var(--foreground)]">
                        {nodeData.architecture}
                      </strong>
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <span>ns:</span>
                  <strong className="text-[var(--foreground)]">
                    {currentResource.namespace || "Cluster Scope"}
                  </strong>
                </div>
                {podData?.nodeName && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <span>node:</span>
                      <strong className="text-[var(--foreground)]">
                        {podData.nodeName}
                      </strong>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-full items-center justify-end gap-1 overflow-x-auto scrollbar-none rounded-xl border border-[var(--border)] bg-black/5 p-1 shrink-0 sm:w-auto dark:bg-white/5">
        {isNetworkingResource || isConfigStorageResource || isAccessResource ? (
          <Tooltip content="Copy Resource Name">
            <button
              onClick={handleCopyTitle}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              aria-label="Copy Resource Name"
            >
              <Copy className="w-4 h-4" />
            </button>
          </Tooltip>
        ) : isCronJob ? (
          <>
            {onViewJobs && (
              <Tooltip content="View Jobs">
                <button
                  onClick={onViewJobs}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  aria-label="View Jobs"
                >
                  <Box className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
            {onTriggerCronJob && (
              <Tooltip content="Trigger Now">
                <button
                  onClick={onTriggerCronJob}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  aria-label="Trigger CronJob Now"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
            {onToggleCronJobSuspend && (
              <Tooltip
                content={
                  cronJobSuspended ? "Resume Schedule" : "Suspend Schedule"
                }
              >
                <button
                  onClick={onToggleCronJobSuspend}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  aria-label={
                    cronJobSuspended ? "Resume Schedule" : "Suspend Schedule"
                  }
                >
                  {cronJobSuspended ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
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
        ) : isWorkloadController ? (
          <>
            {onViewPods && (
              <Tooltip content="View Pods">
                <button
                  onClick={onViewPods}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  aria-label="View Pods"
                >
                  <Box className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
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
            {(isDeployment || isStatefulSet || isDaemonSet) &&
              onRestartWorkload && (
                <Tooltip content="Restart Rollout">
                  <button
                    onClick={onRestartWorkload}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    aria-label="Restart Rollout"
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
                onClick={() =>
                  onOpenLogsModal({
                    name: currentResource.name,
                    namespace: currentResource.namespace,
                  })
                }
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="View Real-Time Logs"
              >
                <FileText className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Interactive Exec Shell">
              <button
                onClick={() =>
                  onOpenExecModal({
                    name: currentResource.name,
                    namespace: currentResource.namespace,
                  })
                }
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Interactive Exec Shell"
              >
                <Terminal className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Restart Pod">
              <button
                onClick={() =>
                  onOpenRestartConfirm({
                    name: currentResource.name,
                    namespace: currentResource.namespace,
                  })
                }
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Restart Pod"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Delete Pod">
              <button
                onClick={() =>
                  onOpenDeleteConfirm({
                    name: currentResource.name,
                    namespace: currentResource.namespace,
                  })
                }
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
