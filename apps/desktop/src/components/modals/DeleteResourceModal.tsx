"use client";

import * as React from "react";
import { AlertTriangle, RotateCw, Trash2, X } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";

export function DeleteResourceModal() {
  const { deleteResourceTarget, closeDeleteResource, confirmDeleteResource } =
    useClusterStore();
  const [confirmation, setConfirmation] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    setConfirmation("");
  }, [deleteResourceTarget]);

  React.useEffect(() => {
    if (!deleteResourceTarget) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) {
        closeDeleteResource();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteResourceTarget, isDeleting, closeDeleteResource]);

  if (!deleteResourceTarget) return null;

  const target = deleteResourceTarget;
  const matches = confirmation.trim() === target.name;
  const command = `kubectl delete ${target.kind.toLowerCase()} ${target.name}${target.namespace && target.namespace !== "Cluster Scope" ? ` -n ${target.namespace}` : ""}`;

  const handleDelete = async () => {
    if (!matches) return;
    setIsDeleting(true);
    try {
      await confirmDeleteResource();
    } catch {
      // The store surfaces the error toast and keeps the modal open.
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      data-testid="delete-resource-modal"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/25 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                Delete {target.kind}
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                Delete{" "}
                <strong className="text-[var(--foreground)] font-mono">
                  {target.name}
                </strong>
                {target.namespace && target.namespace !== "Cluster Scope" ? (
                  <>
                    {" "}
                    in namespace{" "}
                    <strong className="text-[var(--foreground)] font-mono">
                      {target.namespace}
                    </strong>
                  </>
                ) : null}
                ?
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This permanently removes the object from the cluster. This action
              cannot be undone.
            </span>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2 font-mono text-[10px] text-[var(--muted)] overflow-x-auto">
            {command}
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] text-[var(--muted)]">
              Type{" "}
              <strong className="font-mono text-[var(--foreground)]">
                {target.name}
              </strong>{" "}
              to confirm.
            </span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoFocus
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--foreground)] outline-hidden focus:border-rose-500"
              placeholder={target.name}
              aria-label="Type resource name to confirm deletion"
            />
          </label>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={closeDeleteResource}
            disabled={isDeleting}
            className="rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={!matches || isDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-rose-700 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            {isDeleting ? "Deleting..." : `Delete ${target.kind}`}
          </button>
        </div>
      </div>
    </div>
  );
}
