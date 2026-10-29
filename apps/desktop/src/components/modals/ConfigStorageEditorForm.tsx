"use client";

import * as React from "react";
import {
  AlertTriangle,
  Eye,
  FileCode,
  FolderLock,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { invokeRpc } from "@/lib/ipc";
import { useClusterStore } from "@/stores/clusterStore";
import type {
  ConfigMapEditData,
  ConfigMapSummary,
  ConfigStorageUpdateResult,
  SecretEditData,
  SecretSummary,
} from "@kubeview/contracts";
import { ConfigStorageEditorEntry } from "./ConfigStorageEditorEntry";
import {
  entriesFromMap,
  entriesFromSecret,
  makeEntry,
  validateEntries,
  type EditableEntry,
} from "./configStorageEditorUtils";

export type ConfigStorageEditorTarget = {
  kind: "ConfigMap" | "Secret";
  name: string;
  namespace: string;
  status: string;
  immutable?: boolean;
  summary?: ConfigMapSummary | SecretSummary;
};

export function ConfigStorageEditorForm({
  target,
  onClose,
  onSaved,
  onDirtyChange,
  headerAccessory,
  onRevealed,
}: {
  target: ConfigStorageEditorTarget;
  onClose: () => void;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  headerAccessory?: React.ReactNode;
  onRevealed?: () => void;
}) {
  const currentContext = useClusterStore((state) => state.currentContext);
  const [entries, setEntries] = React.useState<EditableEntry[]>([]);
  const [binaryData, setBinaryData] = React.useState<Record<string, string>>(
    {},
  );
  const [resourceVersion, setResourceVersion] = React.useState("");
  const [immutable, setImmutable] = React.useState(Boolean(target.immutable));
  const [secretType, setSecretType] = React.useState(
    target.kind === "Secret"
      ? ((target.summary as SecretSummary | undefined)?.type ?? "Opaque")
      : "",
  );
  const [isLoading, setIsLoading] = React.useState(target.kind === "ConfigMap");
  const [isRevealed, setIsRevealed] = React.useState(
    target.kind === "ConfigMap",
  );
  const [isRevealing, setIsRevealing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [visibleValues, setVisibleValues] = React.useState<
    Record<string, boolean>
  >({});
  const [dirty, setDirty] = React.useState(false);
  const isSecret = target.kind === "Secret";

  React.useEffect(() => {
    setEntries([]);
    setBinaryData({});
    setResourceVersion("");
    setImmutable(Boolean(target.immutable));
    setError(null);
    setIsRevealed(!isSecret);
    setDirty(false);
    setVisibleValues({});
    setSecretType(
      isSecret
        ? ((target.summary as SecretSummary | undefined)?.type ?? "Opaque")
        : "",
    );
  }, [
    target.kind,
    target.name,
    target.namespace,
    target.immutable,
    target.summary,
    isSecret,
  ]);

  React.useEffect(() => {
    if (isSecret || !currentContext) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    invokeRpc<ConfigMapEditData>("configmaps.editData", {
      contextName: currentContext,
      namespace: target.namespace,
      name: target.name,
    })
      .then((data) => {
        if (!active) return;
        setEntries(entriesFromMap(data.data ?? {}));
        setBinaryData(data.binaryData ?? {});
        setResourceVersion(data.resourceVersion);
        setImmutable(data.immutable);
        setIsRevealed(true);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentContext, isSecret, target.kind, target.name, target.namespace]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  React.useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const validationError = React.useMemo(
    () => validateEntries(entries, binaryData),
    [entries, binaryData],
  );

  const updateEntry = (id: string, patch: Partial<EditableEntry>) => {
    setEntries((previous) =>
      previous.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
    setDirty(true);
  };

  const addEntry = () => {
    setEntries((previous) => [...previous, makeEntry()]);
    setDirty(true);
  };

  const removeEntry = (id: string) => {
    setEntries((previous) => previous.filter((entry) => entry.id !== id));
    setDirty(true);
  };

  const toggleEntryVisibility = (id: string) => {
    setVisibleValues((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  const revealSecret = async () => {
    if (!currentContext) return;
    setIsRevealing(true);
    setError(null);
    try {
      const data = await invokeRpc<SecretEditData>("secrets.reveal", {
        contextName: currentContext,
        namespace: target.namespace,
        name: target.name,
      });
      setEntries(entriesFromSecret(data.entries ?? []));
      setResourceVersion(data.resourceVersion);
      setImmutable(data.immutable);
      setSecretType(data.type || "Opaque");
      setIsRevealed(true);
      setDirty(false);
      onRevealed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRevealing(false);
    }
  };

  const save = async () => {
    if (!currentContext || validationError || immutable) return;
    setIsSaving(true);
    setError(null);
    try {
      if (isSecret) {
        await invokeRpc<ConfigStorageUpdateResult>("secrets.apply", {
          contextName: currentContext,
          namespace: target.namespace,
          name: target.name,
          resourceVersion,
          entries: entries.map((entry) => ({
            key: entry.key.trim(),
            value: entry.value,
            binary: entry.binary,
          })),
        });
      } else {
        await invokeRpc<ConfigStorageUpdateResult>("configmaps.apply", {
          contextName: currentContext,
          namespace: target.namespace,
          name: target.name,
          resourceVersion,
          data: Object.fromEntries(
            entries.map((entry) => [entry.key.trim(), entry.value]),
          ),
          binaryData,
        });
      }
      toast.success(`${target.kind} updated`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    if (dirty) {
      const confirmed = window.confirm("Discard unsaved changes?");
      if (!confirmed) return;
    }
    onClose();
  };

  const title = isSecret ? "Edit Secret" : "Edit ConfigMap";
  const Icon = isSecret ? FolderLock : FileCode;
  const summaryKeys = target.summary?.keys ?? [];

  return (
    <div
      data-testid="config-storage-editor-form"
      className="flex w-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/15 p-2 text-[var(--accent)]">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)]">
              {title}
            </h3>
            <p className="truncate font-mono text-[11px] text-[var(--muted)]">
              {target.name} in {target.namespace || "cluster scope"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {headerAccessory}
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="cursor-pointer rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-[11px] text-rose-600 dark:text-rose-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {immutable && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This {target.kind} is immutable and cannot be edited.
          </div>
        )}

        {isSecret && !isRevealed ? (
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-black/[0.02] p-5 dark:bg-white/[0.02]">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] p-2 text-[var(--muted)]">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--foreground)]">
                  Secret values are hidden
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                  The editor has not loaded any values. Reveal them only if you
                  need to inspect or change this Secret.
                </p>
                <p className="mt-2 font-mono text-[10px] text-[var(--muted)]">
                  {summaryKeys.length} keys · type {secretType || "Opaque"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void revealSecret()}
              disabled={isRevealing}
              data-testid="config-storage-reveal"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-400"
            >
              {isRevealing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {isRevealing ? "Revealing..." : "Reveal values"}
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex h-52 items-center justify-center gap-2 rounded-xl border border-[var(--border)] text-xs text-[var(--muted)]">
            <RefreshCw className="h-4 w-4 animate-spin text-[var(--accent)]" />
            Loading form...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                  {isSecret ? "Secret values" : "Data"}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                  {entries.length} key{entries.length === 1 ? "" : "s"}
                  {isSecret
                    ? ` · type ${secretType || "Opaque"}`
                    : " · plaintext values"}
                </div>
              </div>
              {isSecret && (
                <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono text-amber-700 dark:text-amber-400">
                  sensitive
                </span>
              )}
            </div>

            <div className="space-y-2">
              {entries.map((entry, index) => (
                <ConfigStorageEditorEntry
                  key={entry.id}
                  entry={entry}
                  index={index}
                  immutable={immutable}
                  isSecret={isSecret}
                  visible={Boolean(visibleValues[entry.id])}
                  onUpdate={updateEntry}
                  onRemove={removeEntry}
                  onToggleVisibility={toggleEntryVisibility}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addEntry}
                disabled={immutable}
                data-testid="config-storage-add"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Add key
              </button>
              {Object.keys(binaryData).length > 0 && (
                <span className="font-mono text-[10px] text-[var(--muted)]">
                  Binary keys preserved: {Object.keys(binaryData).join(", ")}
                </span>
              )}
            </div>

            {validationError && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-2 text-[10px] text-rose-600 dark:text-rose-400">
                {validationError}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5">
        <span className="text-[10px] font-mono text-[var(--muted)]">
          {dirty ? "Unsaved changes" : "No changes"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={
              isSaving ||
              !isRevealed ||
              isLoading ||
              isRevealing ||
              immutable ||
              Boolean(validationError)
            }
            data-testid="config-storage-save"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
