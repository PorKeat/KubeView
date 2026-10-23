"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";

export function WorkloadActionModal() {
  const {
    workloadAction,
    closeWorkloadAction,
    closeInspector,
    openWorkloadAction,
    restartDeployment,
    scaleDeployment,
    deleteDeployment,
    scaleReplicaSet,
    deleteReplicaSet,
  } = useClusterStore();

  const [replicas, setReplicas] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [copiedCommand, setCopiedCommand] = React.useState(false);

  React.useEffect(() => {
    setCopiedCommand(false);
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

  const { kind, action, name, namespace } = workloadAction;
  const ownerDeployment =
    workloadAction.kind === "ReplicaSet"
      ? workloadAction.ownerDeployment
      : undefined;
  const isScale = action === "scale";
  const isRestart = action === "restart";
  const isDelete = action === "delete";

  const title = isScale
    ? `Scale ${kind}`
    : isRestart
      ? "Restart Deployment Rollout"
      : `Delete ${kind}`;

  const resourceRef = `${kind.toLowerCase()}/${name}`;
  const kubectlCommand = isScale
    ? `kubectl scale ${resourceRef} --replicas=${replicas} -n ${namespace}`
    : isRestart
      ? `kubectl rollout restart deployment/${name} -n ${namespace}`
      : `kubectl delete ${resourceRef} -n ${namespace}`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(kubectlCommand);
    setCopiedCommand(true);
    toast.success("kubectl command copied");
    setTimeout(() => setCopiedCommand(false), 1500);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (workloadAction.kind === "Deployment") {
        const base = { namespace, name };
        if (workloadAction.action === "scale") {
          await scaleDeployment({ ...base, replicas });
        } else if (workloadAction.action === "restart") {
          await restartDeployment(base);
        } else {
          await deleteDeployment(base);
        }
      } else if (workloadAction.action === "scale") {
        await scaleReplicaSet({ namespace, name, replicas });
      } else {
        await deleteReplicaSet({ namespace, name });
      }

      toast.success(
        isScale
          ? `${kind} ${name} scaled to ${replicas} replica${replicas === 1 ? "" : "s"}`
          : isRestart
            ? `Restart triggered for Deployment ${name}`
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
              <strong className="text-[var(--foreground)] font-mono">
                {name}
              </strong>{" "}
              in namespace{" "}
              <strong className="text-[var(--foreground)] font-mono">
                {namespace}
              </strong>
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
              step={1}
              value={replicas}
              onChange={(event) => {
                const next = Number(event.target.value);
                setReplicas(
                  Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0,
                );
              }}
              className="w-full px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--border)] text-sm font-mono text-[var(--foreground)] outline-hidden focus:border-[var(--accent)] transition-colors"
            />
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              {kind === "Deployment"
                ? "Updates spec.replicas on the Deployment. Set 0 to scale down without deleting the Deployment or its rollout history."
                : "Updates spec.replicas on the ReplicaSet. Its controller creates or removes pods to match the requested count."}
            </p>
            {kind === "ReplicaSet" && ownerDeployment && (
              <div
                data-testid="workload-owner-warning"
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    This ReplicaSet is owned by Deployment{" "}
                    <strong className="font-mono">{ownerDeployment}</strong>.
                    The Deployment controller manages replicas and may reconcile
                    a direct change back. Scale the Deployment instead if you
                    need the change to persist.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    openWorkloadAction({
                      kind: "Deployment",
                      action: "scale",
                      name: ownerDeployment,
                      namespace,
                      replicas,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-40"
                >
                  Scale Deployment Instead
                </button>
              </div>
            )}
          </div>
        )}

        {isRestart && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-[11px] leading-relaxed">
            Patches the pod template annotation{" "}
            <code className="font-mono">kubectl.kubernetes.io/restartedAt</code>
            . Kubernetes creates a new ReplicaSet and replaces pods according to
            the Deployment rollout strategy. Running pods are replaced gradually
            unless the strategy is Recreate.
          </div>
        )}

        {isDelete && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {kind === "Deployment"
                ? "Deleting this Deployment also removes its ReplicaSets and Pods. This action cannot be undone."
                : ownerDeployment
                  ? `Deleting this ReplicaSet also removes its pods. The owning Deployment '${ownerDeployment}' is not deleted and may create a replacement ReplicaSet.`
                  : "This standalone ReplicaSet and its pods will be permanently removed. This action cannot be undone."}
            </span>
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-black/[0.03] dark:bg-white/[0.04] p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">
              kubectl equivalent
            </span>
            <button
              type="button"
              onClick={handleCopyCommand}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              {copiedCommand ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{copiedCommand ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <code
            data-testid="workload-kubectl-command"
            className="block text-[11px] font-mono text-[var(--foreground)] break-all leading-relaxed"
          >
            {kubectlCommand}
          </code>
        </div>

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
                <span>
                  {isScale
                    ? "Apply Scale"
                    : isRestart
                      ? "Restart Rollout"
                      : "Delete"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
