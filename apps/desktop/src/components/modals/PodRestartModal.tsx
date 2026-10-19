"use client";

import * as React from "react";
import { X, RotateCw, RefreshCw } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";

export function PodRestartModal() {
  const { restartConfirmPod, closeRestartConfirm, restartPod } = useClusterStore();
  const [isRestarting, setIsRestarting] = React.useState(false);

  // Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && restartConfirmPod) {
        closeRestartConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [restartConfirmPod, closeRestartConfirm]);

  if (!restartConfirmPod) return null;

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await restartPod({
        namespace: restartConfirmPod.namespace,
        podName: restartConfirmPod.name,
      });
      toast.success(`Pod ${restartConfirmPod.name} restarted successfully`);
      closeRestartConfirm();
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
              Restart Pod
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
              Are you sure you want to restart pod{" "}
              <strong className="text-[var(--foreground)] font-mono">{restartConfirmPod.name}</strong>{" "}
              in namespace <strong className="text-[var(--foreground)] font-mono">{restartConfirmPod.namespace}</strong>?
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs">
          <p className="leading-relaxed text-[11px]">
            If this pod is managed by a Deployment or ReplicaSet, Kubernetes will immediately recreate it with a fresh pod instance and re-pull containers if configured.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button
            onClick={closeRestartConfirm}
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
                <span>Restart Pod</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
