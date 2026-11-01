"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Loader2, Split, X } from "lucide-react";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";
import type { StatefulSetSummary } from "@kubeview/contracts";

export function StatefulSetPartitionModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: StatefulSetSummary;
  onClose: () => void;
}) {
  const setStatefulSetPartition = useClusterStore(
    (state) => state.setStatefulSetPartition,
  );
  const [partition, setPartition] = React.useState(String(item.partition ?? 0));
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPartition(String(item.partition ?? 0));
    setError(null);
  }, [item.partition, open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const parsed = Number(partition);
  const valid =
    Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed <= (item.desiredReplicas ?? 0);

  const submit = async () => {
    if (!valid) {
      setError(
        `Partition must be between 0 and ${item.desiredReplicas ?? 0} ${
          item.desiredReplicas === 1 ? "replica" : "replicas"
        }.`,
      );
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await setStatefulSetPartition({
        namespace: item.namespace,
        name: item.name,
        partition: parsed,
      });
      toast.success(`${item.name} update partition set to ${parsed}`);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update the partition.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      data-testid="statefulset-partition-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="statefulset-partition-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => !isSaving && onClose()}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <Split className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="statefulset-partition-title"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Set update partition
              </h2>
              <p className="truncate font-mono text-[10px] text-[var(--muted)]">
                statefulset/{item.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close partition dialog"
            className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="space-y-3 p-4">
          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
            Pods with an ordinal greater than or equal to the partition stay on
            the current revision. A partition equal to the replica count pauses
            the rollout; 0 rolls every pod.
          </p>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">
              Partition
            </span>
            <input
              type="number"
              min={0}
              max={item.desiredReplicas ?? 0}
              value={partition}
              onChange={(event) => setPartition(event.target.value)}
              data-testid="statefulset-partition-input"
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 font-mono text-sm text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
            />
          </label>
          <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
            <span>
              Replicas: <strong>{item.desiredReplicas ?? 0}</strong>
            </span>
            <span>
              Current partition: <strong>{item.partition ?? 0}</strong>
            </span>
          </div>
          {error && (
            <p role="alert" className="text-[11px] text-rose-500">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="statefulset-partition-submit"
              onClick={() => void submit()}
              disabled={isSaving || !valid}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              Apply partition
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
