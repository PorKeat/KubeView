"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";

export function BulkWorkloadActionModal() {
  const {
    bulkWorkloadAction,
    closeBulkWorkloadAction,
    executeBulkWorkloadAction,
  } = useClusterStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [copiedCommand, setCopiedCommand] = React.useState(false);

  React.useEffect(() => {
    if (!bulkWorkloadAction) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        closeBulkWorkloadAction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bulkWorkloadAction, closeBulkWorkloadAction, isSubmitting]);

  if (!bulkWorkloadAction || bulkWorkloadAction.targets.length === 0) {
    return null;
  }

  const { kind, action, targets } = bulkWorkloadAction;
  const isDelete = action === "delete";
  const count = targets.length;
  const singular = kind;
  const plural = `${kind}s`;
  const resource =
    kind === "ReplicaSet"
      ? "replicaset"
      : kind === "StatefulSet"
        ? "statefulset"
        : kind === "DaemonSet"
          ? "daemonset"
          : "job";
  const title = isDelete
    ? `Delete ${count} ${count === 1 ? singular : plural}`
    : `Restart ${count} ${count === 1 ? singular : plural}`;
  const submitLabel = isDelete ? `Delete ${count}` : `Restart ${count}`;

  const groupedByNamespace: Record<string, string[]> = {};
  for (const target of targets) {
    if (!groupedByNamespace[target.namespace]) {
      groupedByNamespace[target.namespace] = [];
    }
    groupedByNamespace[target.namespace].push(target.name);
  }

  const commands = isDelete
    ? Object.entries(groupedByNamespace)
        .map(
          ([namespace, names]) =>
            `kubectl delete ${resource} ${names.join(" ")} -n ${namespace}`,
        )
        .join("\n")
    : targets
        .map(
          (target) =>
            `kubectl rollout restart ${resource}/${target.name} -n ${target.namespace}`,
        )
        .join("\n");

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText(commands);
    setCopiedCommand(true);
    toast.success("Copied bulk kubectl command");
    setTimeout(() => setCopiedCommand(false), 1800);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await executeBulkWorkloadAction(bulkWorkloadAction);
      const verb = isDelete ? "Deleted" : "Restarted";
      if (result.failed === 0) {
        toast.success(`${verb} ${result.succeeded} ${result.succeeded === 1 ? singular : plural}`);
      } else if (result.succeeded === 0) {
        toast.error(`Could not ${action} the selected ${plural.toLowerCase()}`);
      } else {
        toast.warning(
          `${verb} ${result.succeeded}; ${result.failed} failed. Check cluster events for details.`,
        );
      }
      if (result.succeeded > 0) {
        bulkWorkloadAction.onCompleted?.();
        closeBulkWorkloadAction();
      }
    } catch {
      toast.error(`Bulk ${action} failed before any resource was changed`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const warning = isDelete
    ? kind === "ReplicaSet"
      ? "Deletes the selected ReplicaSets and their pods. ReplicaSets owned by Deployments may be recreated by the Deployment controller."
      : kind === "StatefulSet"
        ? "Deletes the selected StatefulSets and their pods. PVC retention follows each StatefulSet's whenDeleted policy."
        : kind === "DaemonSet"
          ? "Deletes the selected DaemonSets and removes their pods from every matching node."
          : "Deletes the selected Jobs and their retained pod history. Owning CronJobs remain unchanged."
    : "Patches the kubectl.kubernetes.io/restartedAt annotation on each pod template. OnDelete controllers update pods only when they are deleted; RollingUpdate controllers replace pods according to their strategy.";

  return (
    <div
      data-testid="bulk-workload-action-modal"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl sm:p-6">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 border ${
              isDelete
                ? "bg-rose-500/15 text-rose-500 border-rose-500/25"
                : "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/25"
            }`}
          >
            {isDelete ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <RotateCw className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
              {title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              {isDelete
                ? `Permanently remove ${count} selected ${count === 1 ? singular : plural}.`
                : `Trigger a rolling restart for ${count} selected ${count === 1 ? singular : plural}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={closeBulkWorkloadAction}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close bulk action dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold">
              Selected resources
            </span>
            <span className="text-[10px] font-mono text-[var(--muted)]">
              {Object.keys(groupedByNamespace).length} namespace
              {Object.keys(groupedByNamespace).length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-xl border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] divide-y divide-[var(--border)]/60">
            {targets.map((target) => (
              <div
                key={`${target.namespace}/${target.name}`}
                className="flex items-center justify-between gap-3 px-2.5 py-1.5 text-[11px]"
              >
                <span className="truncate font-mono text-[var(--foreground)]">
                  {target.name}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
                  {target.namespace}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 rounded-xl border border-[var(--border)] bg-black/[0.03] p-2.5 dark:bg-white/[0.04]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">
              kubectl equivalent
            </span>
            <button
              type="button"
              onClick={handleCopyCommand}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              {copiedCommand ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{copiedCommand ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <code className="block whitespace-pre-wrap break-all text-[11px] font-mono leading-relaxed text-[var(--foreground)]">
            {commands}
          </code>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-2">
          <button
            type="button"
            onClick={closeBulkWorkloadAction}
            disabled={isSubmitting}
            data-testid="bulk-workload-action-cancel"
            className="rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all hover:bg-[var(--surface-hover)] cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="bulk-workload-action-confirm"
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
              isDelete
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
            }`}
          >
            {isSubmitting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Working...</span>
              </>
            ) : (
              <>
                {isDelete ? (
                  <Trash2 className="w-3.5 h-3.5" />
                ) : (
                  <RotateCw className="w-3.5 h-3.5" />
                )}
                <span>{submitLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
