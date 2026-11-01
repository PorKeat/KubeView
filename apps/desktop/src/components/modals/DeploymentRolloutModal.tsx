"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { History, Loader2, RotateCcw, X } from "lucide-react";
import type {
  DeploymentRolloutHistoryResult,
  DeploymentRolloutRevision,
} from "@kubeview/contracts";
import { toast } from "sonner";
import { invokeRpc } from "@/lib/ipc";
import { useClusterStore } from "@/stores/clusterStore";
import { cn } from "@/lib/utils";

export function DeploymentRolloutModal({
  open,
  name,
  namespace,
  onClose,
}: {
  open: boolean;
  name: string;
  namespace: string;
  onClose: () => void;
}) {
  const currentContext = useClusterStore((state) => state.currentContext);
  const rollbackDeployment = useClusterStore(
    (state) => state.rollbackDeployment,
  );
  const [revisions, setRevisions] = React.useState<DeploymentRolloutRevision[]>(
    [],
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [rollingBack, setRollingBack] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!currentContext) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await invokeRpc<DeploymentRolloutHistoryResult>(
        "deployments.rolloutHistory",
        { contextName: currentContext, namespace, name },
      );
      setRevisions(result.items ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load rollout history.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentContext, name, namespace]);

  React.useEffect(() => {
    if (!open) return;
    void load();
  }, [load, open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && rollingBack === null) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, rollingBack]);

  if (!open || typeof document === "undefined") return null;

  const rollback = async (revision: number) => {
    setRollingBack(revision);
    setError(null);
    try {
      await rollbackDeployment({
        contextName: currentContext,
        namespace,
        name,
        revision,
      });
      toast.success(`Deployment ${name} rolled back to revision ${revision}`);
      onClose();
    } catch (rollbackError) {
      setError(
        rollbackError instanceof Error
          ? rollbackError.message
          : "Rollback failed.",
      );
    } finally {
      setRollingBack(null);
    }
  };

  return createPortal(
    <div
      data-testid="deployment-rollout-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deployment-rollout-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => rollingBack === null && onClose()}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <History className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="deployment-rollout-title"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Rollout history
              </h2>
              <p className="truncate font-mono text-[10px] text-[var(--muted)]">
                deployment/{name} · {namespace}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={rollingBack !== null}
            aria-label="Close rollout history"
            className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-rose-500/25 bg-rose-500/5 p-2.5 text-[11px] text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
          )}
          {isLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-xs text-[var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
              Loading revisions...
            </div>
          ) : revisions.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--muted)]">
              No ReplicaSet revisions were found for this Deployment.
            </p>
          ) : (
            <ul className="space-y-2">
              {[...revisions].reverse().map((revision) => (
                <li
                  key={revision.replicaSetName}
                  data-testid={`deployment-revision-${revision.revision}`}
                  className={cn(
                    "rounded-xl border p-3",
                    revision.current
                      ? "border-[var(--accent)]/40 bg-[var(--accent)]/5"
                      : "border-[var(--border)] bg-[var(--background)]",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[var(--foreground)]">
                          Revision {revision.revision}
                        </span>
                        {revision.current && (
                          <span className="rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-1.5 py-0.5 font-mono text-[9px] text-[var(--accent)]">
                            current
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-[var(--muted)]">
                          {revision.ready}/{revision.desired} ready
                        </span>
                      </div>
                      <p className="mt-1 break-all font-mono text-[10px] text-[var(--muted)]">
                        {revision.images.join(", ") || "no images"}
                      </p>
                      {revision.changeCause && (
                        <p className="mt-1 text-[10px] text-[var(--muted)]">
                          {revision.changeCause}
                        </p>
                      )}
                      <p className="mt-1 font-mono text-[9px] text-[var(--muted)]">
                        {revision.replicaSetName} ·{" "}
                        {new Date(revision.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid={`deployment-rollback-${revision.revision}`}
                      onClick={() => void rollback(revision.revision)}
                      disabled={revision.current || rollingBack !== null}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      {rollingBack === revision.revision ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      Roll back
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-[var(--border)] px-4 py-2.5 text-[10px] text-[var(--muted)]">
          Rolling back copies the selected ReplicaSet pod template into the
          Deployment, matching `kubectl rollout undo`.
        </footer>
      </div>
    </div>,
    document.body,
  );
}
