"use client";

import * as React from "react";
import { AlertTriangle, RotateCw, SlidersHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";

export function WorkloadActionModal() {
  const {
    workloadAction,
    closeWorkloadAction,
    closeInspector,
    restartDeployment,
    scaleDeployment,
    deleteDeployment,
    scaleReplicaSet,
    deleteReplicaSet,
  } = useClusterStore();

  const [replicas, setReplicas] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (workloadAction?.action === "scale") {
      setReplicas(workloadAction.replicas ?? 1);
    }
  }, [workloadAction]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && workloadAction && !isSubmitting) {
        closeWorkloadAction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [workloadAction, isSubmitting, closeWorkloadAction]);

  if (!workloadAction) return null;

  const { kind, action, name, namespace, ownerDeployment } = workloadAction;
  const isScale = action === "scale";
  const isRestart = action === "restart";
  const isDelete = action === "delete";

  const title = isScale
    ? `Scale ${kind}`
    : isRestart
      ? kind === "ReplicaSet"
        ? "Restart Owner Deployment"
        : "Restart Deployment Rollout"
      : `Delete ${kind}`;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const base = { namespace, name };
      if (kind === "Deployment") {
        if (isScale) await scaleDeployment({ ...base, replicas });
        else if (isRestart) await restartDeployment(base);
        else await deleteDeployment(base);
      } else if (isScale) {
        await scaleReplicaSet({ ...base, replicas });
      } else if (isRestart) {
        if (!ownerDeployment) {
          throw new Error("This ReplicaSet has no owning Deployment to restart.");
        }
        await restartDeployment({ namespace, name: ownerDeployment });
      } else {
        await deleteReplicaSet(base);
      }

      toast.success(
        isScale
          ? `${kind} ${name} scaled to ${replicas} replica${replicas === 1 ? "" : "s"}`
          : isRestart
            ? `Restart triggered for ${kind === "ReplicaSet" ? ownerDeployment : name}`
            : `${kind} ${name} deleted`,
      );
      closeWorkloadAction();
      closeInspector();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Workload action failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="workload-action-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 border ${
              isDelete
                ? "bg-rose-500/15 text-rose-500 border-rose-500/25"
                : "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/25"
            }`}
          >
            {isScale ? (
              <SlidersHorizontal className="w-5 h-5" />
            ) : isRestart ? (
              <RotateCw className="w-5 h-5" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
              <strong className="text-[var(--foreground)] font-mono">{name}</strong>{" "}
              in namespace{" "}
              <strong className="text-[var(--foreground)] font-mono">{namespace}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={closeWorkloadAction}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close action dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isScale && (
          <div className="space-y-2">
            <label
              htmlFor="workload-replicas"
              className="text-[11px] uppercase tracking-wider text-[var(--muted)] font-semibold"
            >
              Desired replicas
            </label>
            <input
              id="workload-replicas"
              type="number"
              min={0}
              value={replicas}
              onChange={(event) =>
                setReplicas(Math.max(0, Number(event.target.value)))
              }
              className="w-full px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--border)] text-sm font-mono text-[var(--foreground)] outline-hidden focus:border-[var(--accent)] transition-colors"
            />
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Kubernetes will reconcile the workload to this replica count. Set 0
              to scale down without deleting the resource.
            </p>
          </div>
        )}

        {isRestart && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-[11px] leading-relaxed">
            {kind === "ReplicaSet"
              ? `This triggers a rolling restart of the owning Deployment '${ownerDeployment}'. Its ReplicaSets and pods will be replaced according to the rollout strategy.`
              : "This triggers a rolling restart by updating the pod template annotation. Pods are replaced according to the Deployment rollout strategy."}
          </div>
        )}

        {isDelete && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {kind === "Deployment"
                ? "Deleting this Deployment also removes its ReplicaSets and Pods. This action cannot be undone."
                : ownerDeployment
                  ? `This ReplicaSet is owned by '${ownerDeployment}'. Kubernetes may recreate it if the owning Deployment is still running.`
                  : "This standalone ReplicaSet and its pods will be permanently removed. This action cannot be undone."}
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={closeWorkloadAction}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 ${
              isDelete
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
            }`}
          >
            {isSubmitting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Working...</span>
              </>
            ) : (
              <>
                {isScale ? (
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                ) : isRestart ? (
                  <RotateCw className="w-3.5 h-3.5" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isScale ? "Apply Scale" : isRestart ? "Restart" : "Delete"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
