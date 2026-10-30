"use client";

import * as React from "react";
import { AlertTriangle, FolderPlus, Plus, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import type { ResourceApplyResult } from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";

const NAMESPACE_NAME_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const LABEL_KEY_PATTERN =
  /^([a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*\/)?[A-Za-z0-9]([-A-Za-z0-9_.]*[A-Za-z0-9])?$/;
const LABEL_VALUE_PATTERN = /^([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9]$/;

interface LabelEntry {
  id: string;
  key: string;
  value: string;
}

function validateNamespaceName(value: string): string | null {
  if (!value) return "Namespace name is required.";
  if (value.length > 63) return "Use 63 characters or fewer.";
  if (!NAMESPACE_NAME_PATTERN.test(value)) {
    return "Use lowercase letters, numbers, and hyphens; start and end with a letter or number.";
  }
  return null;
}

function validateLabels(labels: LabelEntry[]): string | null {
  const seen = new Set<string>();
  for (const label of labels) {
    const key = label.key.trim();
    const value = label.value.trim();
    if (!key && !value) continue;
    if (!key) return "Every label needs a key.";
    if (key.length > 253) return `Label key "${key}" is too long.`;
    if (!LABEL_KEY_PATTERN.test(key)) {
      return `Label key "${key}" is not a valid Kubernetes label key.`;
    }
    if (seen.has(key)) return `Duplicate label key "${key}".`;
    seen.add(key);
    if (value.length > 63) {
      return `Label "${key}" value must be 63 characters or fewer.`;
    }
    if (value && !LABEL_VALUE_PATTERN.test(value)) {
      return `Label "${key}" value is not a valid Kubernetes label value.`;
    }
  }
  return null;
}

function buildNamespaceManifest(name: string, labels: LabelEntry[]): string {
  const lines = [
    "apiVersion: v1",
    "kind: Namespace",
    "metadata:",
    `  name: ${name}`,
  ];
  const entries = labels
    .map((label) => ({ key: label.key.trim(), value: label.value.trim() }))
    .filter((label) => label.key.length > 0);
  if (entries.length > 0) {
    lines.push("  labels:");
    for (const entry of entries) {
      lines.push(
        `    ${JSON.stringify(entry.key)}: ${JSON.stringify(entry.value)}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

export function CreateNamespaceModal() {
  const isOpen = useClusterStore((state) => state.isCreateNamespaceOpen);
  const closeCreateNamespace = useClusterStore(
    (state) => state.closeCreateNamespace,
  );
  const currentContext = useClusterStore((state) => state.currentContext);
  const loadNamespaces = useClusterStore((state) => state.loadNamespaces);
  const setCurrentNamespace = useClusterStore(
    (state) => state.setCurrentNamespace,
  );
  const bumpNamespaceRevision = useClusterStore(
    (state) => state.bumpNamespaceRevision,
  );

  const [name, setName] = React.useState("");
  const [labels, setLabels] = React.useState<LabelEntry[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const nextLabelId = React.useRef(0);

  React.useEffect(() => {
    if (isOpen) return;
    setName("");
    setLabels([]);
    setIsSaving(false);
    setError(null);
    nextLabelId.current = 0;
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) closeCreateNamespace();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, closeCreateNamespace]);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const nameError = validateNamespaceName(trimmedName);
  const labelError = validateLabels(labels);
  const manifest =
    !nameError && !labelError
      ? buildNamespaceManifest(trimmedName, labels)
      : null;
  const canSubmit = !nameError && !labelError && !isSaving;

  const addLabel = () => {
    setLabels((previous) => [
      ...previous,
      { id: `label-${nextLabelId.current++}`, key: "", value: "" },
    ]);
  };

  const updateLabel = (id: string, patch: Partial<LabelEntry>) => {
    setLabels((previous) =>
      previous.map((label) =>
        label.id === id ? { ...label, ...patch } : label,
      ),
    );
  };

  const removeLabel = (id: string) => {
    setLabels((previous) => previous.filter((label) => label.id !== id));
  };

  const submit = async () => {
    if (!canSubmit) return;
    if (!currentContext) {
      setError("No Kubernetes context is selected.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await invokeRpc<ResourceApplyResult>("resources.apply", {
        contextName: currentContext,
        yaml: buildNamespaceManifest(trimmedName, labels),
        resource: "namespaces",
        dryRun: false,
      });
      toast.success(`Namespace ${result.name} created`);
      await loadNamespaces();
      setCurrentNamespace(result.name);
      bumpNamespaceRevision();
      closeCreateNamespace();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(`Failed to create namespace: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      data-testid="create-namespace-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-namespace-title"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => {
          if (!isSaving) closeCreateNamespace();
        }}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/15 p-2 text-[var(--accent)]">
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3
                id="create-namespace-title"
                className="text-sm font-bold tracking-tight text-[var(--foreground)]"
              >
                Create Namespace
              </h3>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                Partition cluster resources and scope access to a team or
                environment.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCreateNamespace}
            disabled={isSaving}
            aria-label="Close create namespace dialog"
            className="cursor-pointer rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-[11px] text-rose-600 dark:text-rose-400">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="create-namespace-name"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]"
            >
              Namespace name
            </label>
            <input
              id="create-namespace-name"
              data-testid="create-namespace-name"
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
              disabled={isSaving}
              placeholder="team-payments"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={name.length > 0 && Boolean(nameError)}
              aria-describedby="create-namespace-name-help"
              className={cn(
                "h-9 w-full rounded-lg border bg-[var(--background)] px-3 font-mono text-xs text-[var(--foreground)] outline-hidden transition-colors placeholder:text-[var(--muted)] focus:ring-1 disabled:opacity-60",
                name.length > 0 && nameError
                  ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30"
                  : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/30",
              )}
            />
            <p
              id="create-namespace-name-help"
              className={cn(
                "mt-1.5 text-[10px] leading-relaxed",
                name.length > 0 && nameError
                  ? "text-rose-500"
                  : "text-[var(--muted)]",
              )}
            >
              {name.length > 0 && nameError
                ? nameError
                : "Lowercase letters, numbers, and hyphens. Max 63 characters."}
            </p>
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Labels{" "}
                <span className="font-normal normal-case">(optional)</span>
              </span>
              <button
                type="button"
                data-testid="create-namespace-add-label"
                onClick={addLabel}
                disabled={isSaving}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                Add label
              </button>
            </div>

            {labels.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2.5 text-[10px] text-[var(--muted)]">
                No labels. Label a namespace to target policies such as Pod
                Security Admission.
              </p>
            ) : (
              <div className="space-y-2">
                {labels.map((label, index) => (
                  <div key={label.id} className="flex items-center gap-1.5">
                    <input
                      value={label.key}
                      onChange={(event) =>
                        updateLabel(label.id, { key: event.target.value })
                      }
                      disabled={isSaving}
                      placeholder="team"
                      aria-label={`Label key ${index + 1}`}
                      data-testid={`create-namespace-label-key-${index}`}
                      spellCheck={false}
                      autoComplete="off"
                      className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 font-mono text-[11px] text-[var(--foreground)] outline-hidden transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 disabled:opacity-60"
                    />
                    <span className="font-mono text-[11px] text-[var(--muted)]">
                      =
                    </span>
                    <input
                      value={label.value}
                      onChange={(event) =>
                        updateLabel(label.id, { value: event.target.value })
                      }
                      disabled={isSaving}
                      placeholder="payments"
                      aria-label={`Label value ${index + 1}`}
                      data-testid={`create-namespace-label-value-${index}`}
                      spellCheck={false}
                      autoComplete="off"
                      className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 font-mono text-[11px] text-[var(--foreground)] outline-hidden transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => removeLabel(label.id)}
                      disabled={isSaving}
                      aria-label={`Remove label ${index + 1}`}
                      className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {labelError && (
                  <p role="alert" className="text-[10px] text-rose-500">
                    {labelError}
                  </p>
                )}
              </div>
            )}
          </section>

          {manifest && (
            <details className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <summary className="cursor-pointer select-none px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Manifest preview
              </summary>
              <pre className="overflow-x-auto border-t border-[var(--border)] px-3 py-2 font-mono text-[10px] leading-relaxed text-[var(--foreground)]">
                {manifest}
              </pre>
            </details>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5">
          <button
            type="button"
            data-testid="create-namespace-cancel"
            onClick={closeCreateNamespace}
            disabled={isSaving}
            className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="create-namespace-submit"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <RotateCw
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isSaving ? "Creating..." : "Create namespace"}
          </button>
        </div>
      </div>
    </div>
  );
}
