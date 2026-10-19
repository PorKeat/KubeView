"use client";

import * as React from "react";
import { X, Trash2, AlertTriangle, RotateCw, CheckCircle2 } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";

export function PodDeleteModal() {
  const {
    deleteConfirmPod,
    closeDeleteConfirm,
    bulkDeleteConfirmPods,
    closeBulkDeleteConfirm,
    deletePod,
    bulkDeletePods,
    closeInspector,
  } = useClusterStore();

  const [isDeleting, setIsDeleting] = React.useState(false);
  const [forceDelete, setForceDelete] = React.useState(false);

  const isBulk = Boolean(bulkDeleteConfirmPods && bulkDeleteConfirmPods.length > 0);
  const targetPods = isBulk
    ? bulkDeleteConfirmPods!
    : deleteConfirmPod
    ? [deleteConfirmPod]
    : [];

  const handleClose = () => {
    if (isBulk) {
      closeBulkDeleteConfirm();
    } else {
      closeDeleteConfirm();
    }
  };

  // Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (deleteConfirmPod || bulkDeleteConfirmPods)) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteConfirmPod, bulkDeleteConfirmPods]);

  if (!deleteConfirmPod && !bulkDeleteConfirmPods) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (isBulk) {
        const res = await bulkDeletePods(targetPods, forceDelete);
        if (res.failed === 0) {
          toast.success(`Successfully deleted ${res.succeeded} pod${res.succeeded > 1 ? "s" : ""}`);
        } else {
          toast.warning(`Deleted ${res.succeeded} pod(s), ${res.failed} failed`);
        }
        closeInspector();
        closeBulkDeleteConfirm();
      } else {
        await deletePod({
          namespace: deleteConfirmPod!.namespace,
          podName: deleteConfirmPod!.name,
          gracePeriodSeconds: forceDelete ? 0 : undefined,
        });
        toast.success(`Pod ${deleteConfirmPod!.name} successfully deleted`);
        closeInspector();
        closeDeleteConfirm();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to delete pod: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/25 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
              {isBulk ? `Delete ${targetPods.length} Selected Pods` : "Delete Pod"}
            </h3>
            {isBulk ? (
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                You are about to terminate <strong className="text-[var(--foreground)] font-mono">{targetPods.length}</strong> pods across the cluster.
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                Are you sure you want to delete pod{" "}
                <strong className="text-[var(--foreground)] font-mono">{deleteConfirmPod?.name}</strong>{" "}
                in namespace <strong className="text-[var(--foreground)] font-mono">{deleteConfirmPod?.namespace}</strong>?
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

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed text-[11px]">
            If any pod is managed by a Deployment, ReplicaSet, or StatefulSet, Kubernetes will immediately spin up a replacement replica. Standalone pods will be permanently terminated.
          </span>
        </div>

        <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={forceDelete}
            onChange={(e) => setForceDelete(e.target.checked)}
            className="rounded accent-rose-500"
          />
          <span>Force delete immediately (0-second grace period)</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-3.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBulk ? `Delete ${targetPods.length} Pods` : "Delete Pod"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
