"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Tooltip } from "@/components/ui/Tooltip";
import type { SelectedResource } from "@/stores/clusterStore";
import type { PodSummary, NodeSummary } from "@kubeview/contracts";
import { InspectorHeaderIcon } from "./InspectorHeaderIcon";
import { InspectorStatusBadge } from "./InspectorStatusBadge";
import { InspectorHeaderActions } from "./InspectorHeaderActions";

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
  const isCopyOnlyResource =
    isNetworkingResource || isConfigStorageResource || isAccessResource;
  const canRestartRollout = isDeployment || isStatefulSet || isDaemonSet;

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(currentResource.name);
    setCopiedTitle(true);
    toast.success(`Copied: ${currentResource.name}`);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  return (
    <div className="min-h-16 border-b border-[var(--border)] px-3 sm:px-4 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 bg-slate-50/80 dark:bg-black/40">
      <div className="flex flex-1 items-center gap-2 min-w-0 pr-0 sm:gap-3 sm:pr-2">
        <InspectorHeaderIcon
          currentResource={currentResource}
          isNode={isNode}
          isDeployment={isDeployment}
          isReplicaSet={isReplicaSet}
          isStatefulSet={isStatefulSet}
          isDaemonSet={isDaemonSet}
          isJob={isJob}
          isCronJob={isCronJob}
          isNetworkingResource={isNetworkingResource}
          isConfigStorageResource={isConfigStorageResource}
          isAccessResource={isAccessResource}
        />
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
            <InspectorStatusBadge status={currentResource.status} />
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

      <InspectorHeaderActions
        currentResource={currentResource}
        isNode={isNode}
        isCronJob={isCronJob}
        isCopyOnlyResource={isCopyOnlyResource}
        isWorkloadController={isWorkloadController}
        canRestartRollout={canRestartRollout}
        onViewPods={onViewPods}
        onViewJobs={onViewJobs}
        onScaleWorkload={onScaleWorkload}
        onRestartWorkload={onRestartWorkload}
        onDeleteWorkload={onDeleteWorkload}
        onToggleCronJobSuspend={onToggleCronJobSuspend}
        onTriggerCronJob={onTriggerCronJob}
        cronJobSuspended={cronJobSuspended}
        onClose={onClose}
        onOpenLogsModal={onOpenLogsModal}
        onOpenExecModal={onOpenExecModal}
        onOpenRestartConfirm={onOpenRestartConfirm}
        onOpenDeleteConfirm={onOpenDeleteConfirm}
        onCopyTitle={handleCopyTitle}
      />
    </div>
  );
}
