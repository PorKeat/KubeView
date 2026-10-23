"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Pause,
  Play,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";
import { Tooltip } from "@/components/ui/Tooltip";

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
    restartStatefulSet,
    scaleStatefulSet,
    deleteStatefulSet,
    restartDaemonSet,
    deleteDaemonSet,
    deleteJob,
    deleteCronJob,
    suspendCronJob,
    resumeCronJob,
    triggerCronJob,
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
  const statefulSetMeta =
    workloadAction.kind === "StatefulSet" ? workloadAction : undefined;
  const daemonSetMeta =
    workloadAction.kind === "DaemonSet" ? workloadAction : undefined;
  const jobMeta = workloadAction.kind === "Job" ? workloadAction : undefined;
  const cronJobMeta =
    workloadAction.kind === "CronJob" ? workloadAction : undefined;
  const isStatefulSet = workloadAction.kind === "StatefulSet";
  const isDaemonSet = workloadAction.kind === "DaemonSet";
  const isJob = workloadAction.kind === "Job";
  const isCronJob = workloadAction.kind === "CronJob";
  const isScale = action === "scale";
  const isRestart = action === "restart";
  const isDelete = action === "delete";
  const isSuspend = action === "suspend";
  const isResume = action === "resume";
  const isTrigger = action === "trigger";

  const title = isScale
    ? `Scale ${kind}`
    : isRestart
      ? `Restart ${kind} Rollout`
      : isDelete
        ? `Delete ${kind}`
        : isSuspend
          ? "Suspend CronJob"
          : isResume
            ? "Resume CronJob"
            : "Trigger CronJob Now";

  const resourceRef = `${kind.toLowerCase()}/${name}`;
  let kubectlCommand = "";
  if (isScale) {
    kubectlCommand = `kubectl scale ${resourceRef} --replicas=${replicas} -n ${namespace}`;
  } else if (isRestart) {
    kubectlCommand = `kubectl rollout restart ${resourceRef} -n ${namespace}`;
  } else if (isDelete) {
    kubectlCommand = `kubectl delete ${resourceRef} -n ${namespace}`;
  } else if (isSuspend || isResume) {
    kubectlCommand = `kubectl patch cronjob/${name} --type merge -p '{"spec":{"suspend":${isSuspend}}}' -n ${namespace}`;
  } else if (isTrigger) {
    kubectlCommand = `kubectl create job --from=cronjob/${name} ${name}-manual-<timestamp> -n ${namespace}`;
  }

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(kubectlCommand);
    setCopiedCommand(true);
    toast.success("kubectl command copied");
    setTimeout(() => setCopiedCommand(false), 1500);
  };

  const handleSubmit = async () => {
    if (isScale && (!Number.isFinite(replicas) || replicas < 0)) {
      toast.error("Replicas must be zero or greater");
      return;
    }
    setIsSubmitting(true);
    let triggeredJobName = "";
    try {
      if (workloadAction.kind === "Deployment") {
        const base = { namespace, name };
        if (workloadAction.action === "scale")
          await scaleDeployment({ ...base, replicas });
        else if (workloadAction.action === "restart")
          await restartDeployment(base);
        else await deleteDeployment(base);
      } else if (workloadAction.kind === "ReplicaSet") {
        if (workloadAction.action === "scale")
          await scaleReplicaSet({ namespace, name, replicas });
        else await deleteReplicaSet({ namespace, name });
      } else if (workloadAction.kind === "StatefulSet") {
        if (workloadAction.action === "scale")
          await scaleStatefulSet({ namespace, name, replicas });
        else if (workloadAction.action === "restart")
          await restartStatefulSet({ namespace, name });
        else await deleteStatefulSet({ namespace, name });
      } else if (workloadAction.kind === "DaemonSet") {
        if (workloadAction.action === "restart")
          await restartDaemonSet({ namespace, name });
        else await deleteDaemonSet({ namespace, name });
      } else if (workloadAction.kind === "Job") {
        await deleteJob({ namespace, name });
      } else if (workloadAction.action === "suspend") {
        await suspendCronJob({ namespace, name });
      } else if (workloadAction.action === "resume") {
        await resumeCronJob({ namespace, name });
      } else if (workloadAction.action === "trigger") {
        triggeredJobName = await triggerCronJob({ namespace, name });
      } else {
        await deleteCronJob({ namespace, name });
      }

      const message = isScale
        ? `${kind} ${name} scaled to ${replicas} replica${replicas === 1 ? "" : "s"}`
        : isRestart
          ? `Restart triggered for ${kind} ${name}`
          : isSuspend
            ? `Suspended CronJob ${name}`
            : isResume
              ? `Resumed CronJob ${name}`
              : isTrigger
                ? `Created Job ${triggeredJobName} from CronJob ${name}`
                : `${kind} ${name} deleted`;
      toast.success(message);
      closeWorkloadAction();
      closeInspector();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Workload action failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const topIcon = isDelete ? (
    <Trash2 className="w-5 h-5" />
  ) : isTrigger ? (
    <Zap className="w-5 h-5" />
  ) : isSuspend ? (
    <Pause className="w-5 h-5" />
  ) : isResume ? (
    <Play className="w-5 h-5" />
  ) : isRestart ? (
    <RotateCw className="w-5 h-5" />
  ) : (
    <SlidersHorizontal className="w-5 h-5" />
  );
  const submitIcon = isDelete ? (
    <Trash2 className="w-3.5 h-3.5" />
  ) : isTrigger ? (
    <Zap className="w-3.5 h-3.5" />
  ) : isSuspend ? (
    <Pause className="w-3.5 h-3.5" />
  ) : isResume ? (
    <Play className="w-3.5 h-3.5" />
  ) : isRestart ? (
    <RotateCw className="w-3.5 h-3.5" />
  ) : (
    <SlidersHorizontal className="w-3.5 h-3.5" />
  );
  const submitLabel = isScale
    ? "Apply Scale"
    : isRestart
      ? "Restart Rollout"
      : isDelete
        ? "Delete"
        : isSuspend
          ? "Suspend"
          : isResume
            ? "Resume"
            : "Trigger Now";

  return (
    <div
      data-testid="workload-action-modal"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl shrink-0 border ${isDelete ? "bg-rose-500/15 text-rose-500 border-rose-500/25" : "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/25"}`}
            >
              {topIcon}
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
              {isStatefulSet && statefulSetMeta && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[var(--muted)] mt-1.5">
                  <span className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]">
                    service: {statefulSetMeta.serviceName || "none"}
                  </span>
                  <span>
                    {statefulSetMeta.updateStrategy || "RollingUpdate"}
                  </span>
                  {statefulSetMeta.partition ? (
                    <span>· partition {statefulSetMeta.partition}</span>
                  ) : null}
                  <span>
                    · {statefulSetMeta.podManagementPolicy || "OrderedReady"}
                  </span>
                </div>
              )}
              {isDaemonSet && daemonSetMeta && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[var(--muted)] mt-1.5">
                  <span>{daemonSetMeta.updateStrategy || "RollingUpdate"}</span>
                  <span>
                    · max unavailable {daemonSetMeta.maxUnavailable || "1"}
                  </span>
                  <span>· max surge {daemonSetMeta.maxSurge || "0"}</span>
                </div>
              )}
              {isJob && jobMeta && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[var(--muted)] mt-1.5">
                  <span>owner: {jobMeta.ownerCronJob || "manual"}</span>
                  <span>· active pods: {jobMeta.active ?? 0}</span>
                </div>
              )}
              {isCronJob && cronJobMeta && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[var(--muted)] mt-1.5">
                  <span className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]">
                    {cronJobMeta.schedule || "schedule"}
                  </span>
                  <span>{cronJobMeta.concurrencyPolicy || "Allow"}</span>
                  <span>
                    · {cronJobMeta.suspend ? "suspended" : "scheduling"}
                  </span>
                </div>
              )}
            </div>
            <Tooltip content="Close dialog" shortcut="Esc">
              <button
                type="button"
                onClick={closeWorkloadAction}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Close action dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
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
                  : kind === "StatefulSet"
                    ? `Updates spec.replicas. Pods follow the ${statefulSetMeta?.podManagementPolicy || "OrderedReady"} policy.`
                    : "Updates spec.replicas on the ReplicaSet. Its controller creates or removes pods to match the requested count."}
              </p>
              {kind === "StatefulSet" &&
                statefulSetMeta?.pvcRetentionWhenScaled === "Delete" && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      PVCs created from volumeClaimTemplates for removed
                      replicas will be deleted by the whenScaled=Delete policy.
                    </span>
                  </div>
                )}
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
                      The Deployment controller manages replicas and may
                      reconcile a direct change back. Scale the Deployment
                      instead if you need the change to persist.
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
            <div
              className={`p-3 rounded-xl border text-[11px] leading-relaxed ${(isStatefulSet && statefulSetMeta?.updateStrategy === "OnDelete") || (isDaemonSet && daemonSetMeta?.updateStrategy === "OnDelete") ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400"}`}
            >
              Patches the pod template annotation{" "}
              <code className="font-mono">
                kubectl.kubernetes.io/restartedAt
              </code>
              .
              {isDaemonSet
                ? daemonSetMeta?.updateStrategy === "OnDelete"
                  ? " This DaemonSet uses OnDelete, so pods update only when you delete them."
                  : ` This DaemonSet uses RollingUpdate with max unavailable ${daemonSetMeta?.maxUnavailable || "1"} and max surge ${daemonSetMeta?.maxSurge || "0"}; daemon pods are replaced node by node.`
                : isStatefulSet
                  ? statefulSetMeta?.updateStrategy === "OnDelete"
                    ? " This StatefulSet uses OnDelete, so the template changes but pods update only when you delete them."
                    : ` This StatefulSet uses RollingUpdate${statefulSetMeta?.partition ? ` with partition ${statefulSetMeta.partition}` : ""}; pods update in reverse ordinal order.`
                  : " Kubernetes creates a new ReplicaSet and replaces pods according to the Deployment rollout strategy. Running pods are replaced gradually unless the strategy is Recreate."}
            </div>
          )}

          {isDelete && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {kind === "Deployment"
                  ? "Deleting this Deployment also removes its ReplicaSets and Pods. This action cannot be undone."
                  : kind === "StatefulSet"
                    ? statefulSetMeta?.pvcRetentionWhenDeleted === "Delete"
                      ? "Deleting this StatefulSet also removes its pods and the PVCs created from volumeClaimTemplates. This action cannot be undone."
                      : "Deleting this StatefulSet also removes its pods. PVCs created from volumeClaimTemplates are retained by default. This action cannot be undone."
                    : kind === "DaemonSet"
                      ? "Deleting this DaemonSet removes its daemon pods from every matching node. This action cannot be undone."
                      : kind === "Job"
                        ? `Deleting this Job removes its retained pod history${jobMeta?.active ? ` and ${jobMeta.active} active pod(s)` : ""}.${jobMeta?.ownerCronJob ? ` The owning CronJob '${jobMeta.ownerCronJob}' remains.` : ""}`
                        : kind === "CronJob"
                          ? "Deleting this CronJob also removes the Jobs it owns and their Pods. This action cannot be undone."
                          : ownerDeployment
                            ? `Deleting this ReplicaSet also removes its pods. The owning Deployment '${ownerDeployment}' is not deleted and may create a replacement ReplicaSet.`
                            : "This standalone ReplicaSet and its pods will be permanently removed. This action cannot be undone."}
              </span>
            </div>
          )}

          {(isSuspend || isResume) && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-[11px] leading-relaxed">
              {isSuspend
                ? "Stops this CronJob from creating new Jobs. Already running Jobs continue until they finish."
                : "Resumes future scheduled runs. Schedules missed while suspended are not backfilled."}
            </div>
          )}

          {isTrigger && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-[11px] leading-relaxed">
              Creates a one-off Job from this CronJob&apos;s jobTemplate. The
              Job is owned by the CronJob and starts immediately. The CronJob
              schedule is unchanged.
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
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
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
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 ${isDelete ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"}`}
          >
            {isSubmitting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Working...</span>
              </>
            ) : (
              <>
                {submitIcon}
                <span>{submitLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
