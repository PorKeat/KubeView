"use client";

import {
  Box,
  Copy,
  FileText,
  Terminal,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  X,
  Pause,
  Play,
  Pencil,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Tooltip } from "@/components/ui/Tooltip";
import type { SelectedResource } from "@/stores/clusterStore";

export function InspectorHeaderActions({
  currentResource,
  isNode,
  isCronJob,
  isCopyOnlyResource,
  isWorkloadController,
  canRestartRollout,
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
  onCopyTitle,
  onEditYaml,
}: {
  currentResource: SelectedResource;
  isNode: boolean;
  isCronJob: boolean;
  isCopyOnlyResource: boolean;
  isWorkloadController: boolean;
  canRestartRollout: boolean;
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
  onCopyTitle: () => void;
  onEditYaml?: () => void;
}) {
  return (
    <div className="flex w-full max-w-full items-center justify-end gap-1 overflow-x-auto scrollbar-none rounded-xl border border-[var(--border)] bg-black/5 p-1 shrink-0 sm:w-auto dark:bg-white/5">
      {isCopyOnlyResource ? (
        <Tooltip content="Copy Resource Name">
          <button
            onClick={onCopyTitle}
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
              onClick={onCopyTitle}
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
          {canRestartRollout && onRestartWorkload && (
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
              onClick={onCopyTitle}
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
      {onEditYaml && (
        <Tooltip content="Edit YAML">
          <button
            onClick={onEditYaml}
            data-testid="inspector-edit-yaml"
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            aria-label="Edit YAML"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </Tooltip>
      )}
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
  );
}
