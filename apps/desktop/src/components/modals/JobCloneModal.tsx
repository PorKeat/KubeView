"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CopyPlus, Loader2, X } from "lucide-react";
import type { JobSummary } from "@kubeview/contracts";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";

const NAME_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

export function JobCloneModal({
  open,
  job,
  onClose,
}: {
  open: boolean;
  job: JobSummary;
  onClose: () => void;
}) {
  const cloneJob = useClusterStore((state) => state.cloneJob);
  const [name, setName] = React.useState(`${job.name}-clone`);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(`${job.name}-clone`);
    setError(null);
  }, [job.name, open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const trimmed = name.trim();
  const nameError = !trimmed
    ? "Name is required."
    : trimmed.length > 63
      ? "Use 63 characters or fewer."
      : !NAME_PATTERN.test(trimmed)
        ? "Use lowercase letters, numbers, and hyphens."
        : null;

  const submit = async () => {
    if (nameError) return;
    setIsSaving(true);
    setError(null);
    try {
      const created = await cloneJob({
        namespace: job.namespace,
        name: job.name,
        newName: trimmed,
      });
      toast.success(`Job ${created.name} created from ${job.name}`);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to clone the job.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      data-testid="job-clone-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-clone-title"
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
              <CopyPlus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="job-clone-title"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Clone Job
              </h2>
              <p className="truncate font-mono text-[10px] text-[var(--muted)]">
                job/{job.name} · {job.namespace}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close clone dialog"
            className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="space-y-3 p-4">
          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
            The new Job copies the pod template and settings from{" "}
            <span className="font-mono">{job.name}</span>. Controller labels and
            the old selector are replaced automatically.
          </p>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">
              New Job name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              data-testid="job-clone-name"
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 font-mono text-sm text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
            />
            {nameError && (
              <span className="mt-1 block text-[10px] text-rose-500">
                {nameError}
              </span>
            )}
          </label>
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
              data-testid="job-clone-submit"
              onClick={() => void submit()}
              disabled={isSaving || Boolean(nameError)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              Clone Job
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
