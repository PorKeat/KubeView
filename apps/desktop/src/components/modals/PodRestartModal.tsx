"use client";

import * as React from "react";
import { X, RotateCw, RefreshCw, Layers } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";

export function PodRestartModal() {
  const {
    restartConfirmPod,
    closeRestartConfirm,
    bulkRestartConfirmPods,
    closeBulkRestartConfirm,
    restartPod,
    bulkRestartPods,
  } = useClusterStore();

  const [isRestarting, setIsRestarting] = React.useState(false);

  const isBulk = Boolean(bulkRestartConfirmPods && bulkRestartConfirmPods.length > 0);
  const targetPods = isBulk
    ? bulkRestartConfirmPods!
    : restartConfirmPod
    ? [restartConfirmPod]
    : [];

  const handleClose = () => {
    if (isBulk) {
      closeBulkRestartConfirm();
    } else {
      closeRestartConfirm();
    }
  };

  // Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (restartConfirmPod || bulkRestartConfirmPods)) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [restartConfirmPod, bulkRestartConfirmPods]);

  if (!restartConfirmPod && !bulkRestartConfirmPods) return null;

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      if (isBulk) {
        const res = await bulkRestartPods(targetPods);
        if (res.failed === 0) {
          toast.success(`Successfully restarted ${res.succeeded} pod${res.succeeded > 1 ? "s" : ""}`);
        } else {
          toast.warning(`Restarted ${res.succeeded} pod(s), ${res.failed} failed`);
        }
        closeBulkRestartConfirm();
      } else {
        await restartPod({
          namespace: restartConfirmPod!.namespace,
          podName: restartConfirmPod!.name,
        });
        toast.success(`Pod ${restartConfirmPod!.name} restarted successfully`);
        closeRestartConfirm();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to restart pod: ${msg}`);
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25 shrink-0">
            <RotateCw className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
              {isBulk ? `Restart ${targetPods.length} Selected Pods` : "Restart Pod"}
            </h3>
            {isBulk ? (
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                You are about to restart{" "}
                <strong className="text-[var(--foreground)] font-mono">{targetPods.length}</strong>{" "}
                pods by deleting and recreating them.
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                Are you sure you want to restart pod{" "}
                <strong className="text-[var(--foreground)] font-mono">{restartConfirmPod?.name}</strong>{" "}
                in namespace <strong className="text-[var(--foreground)] font-mono">{restartConfirmPod?.namespace}</strong>?
                KubeView deletes the pod and lets its controller recreate it.
              </p>
            )}
          </div>
        </div>

        {/* Bulk Pods List */}
        {isBulk && (
          <div className="max-h-36 overflow-y-auto border border-[var(--border)] rounded-xl bg-black/[0.02] dark:bg-white/[0.02] divide-y divide-[var(--border)] p-1 text-[11px] font-mono">
            {targetPods.map((p) => (
              <div key={`${p.namespace}/${p.name}`} className="px-2 py-1 flex items-center justify-between">
                <span className="text-[var(--foreground)] truncate max-w-[240px]">{p.name}</span>
                <span className="text-[10px] text-[var(--muted)] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]">
                  {p.namespace}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs">
          <p className="leading-relaxed text-[11px]">
            Kubernetes has no direct pod restart command. KubeView deletes each pod:
            pods owned by a Deployment, ReplicaSet, StatefulSet, or DaemonSet are
            recreated by that controller, while standalone pods are recreated from
            their existing spec.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button
            onClick={handleClose}
            disabled={isRestarting}
            className="px-3.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleRestart}
            disabled={isRestarting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isRestarting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Restarting...</span>
              </>
            ) : (
              <>
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isBulk ? `Restart ${targetPods.length} Pods` : "Restart Pod"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
