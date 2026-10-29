"use client";

import * as React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  FileCode,
  LockKeyhole,
  RotateCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { YamlEditor } from "@/components/editor/YamlEditor";
import { useClusterStore } from "@/stores/clusterStore";

export function ResourceEditorModal() {
  const {
    resourceEditorTarget,
    resourceEditorYaml,
    resourceEditorCapabilities,
    resourceEditorCapabilityWarning,
    isResourceEditorLoading,
    isResourceEditorSaving,
    isResourceEditorValidating,
    resourceEditorValidationSuccess,
    resourceEditorError,
    setResourceEditorYaml,
    validateResourceEditor,
    applyResourceEditor,
    closeResourceEditor,
    openDeleteResource,
  } = useClusterStore();

  React.useEffect(() => {
    if (!resourceEditorTarget) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !isResourceEditorSaving &&
        !isResourceEditorValidating
      ) {
        closeResourceEditor();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    resourceEditorTarget,
    isResourceEditorSaving,
    isResourceEditorValidating,
    closeResourceEditor,
  ]);

  if (!resourceEditorTarget) return null;

  const target = resourceEditorTarget;
  const isCreate = target.mode === "create";
  const requiredVerb: "create" | "update" = isCreate ? "create" : "update";
  const canApply =
    !resourceEditorCapabilities ||
    resourceEditorCapabilities[requiredVerb] !== false;
  const canDelete =
    !isCreate &&
    (!resourceEditorCapabilities ||
      resourceEditorCapabilities.delete !== false);
  const lineCount = resourceEditorYaml
    ? resourceEditorYaml.split("\n").length
    : 0;
  const capabilityReason =
    resourceEditorCapabilities?.reasons?.[requiredVerb] ||
    `Your identity is not allowed to ${requiredVerb} this resource.`;

  const submitEditor = () => {
    if (
      isResourceEditorLoading ||
      isResourceEditorSaving ||
      isResourceEditorValidating ||
      !canApply ||
      !resourceEditorYaml.trim()
    ) {
      return;
    }
    void applyResourceEditor();
  };

  return (
    <div
      data-testid="resource-editor-modal"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
    >
      <div className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/15 p-2 text-[var(--accent)]">
              <FileCode className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-[var(--foreground)]">
                {isCreate ? "Create" : "Edit"} {target.kind}
              </h3>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[9px] text-[var(--muted)]">
                <span className="rounded border border-[var(--border)] bg-[var(--surface-active)]/60 px-1.5 py-0.5">
                  {target.apiVersion}
                </span>
                <span className="rounded border border-[var(--border)] bg-[var(--surface-active)]/60 px-1.5 py-0.5">
                  {target.resource}
                </span>
                {target.namespace && (
                  <span className="rounded border border-[var(--border)] bg-[var(--surface-active)]/60 px-1.5 py-0.5">
                    {target.namespace}
                  </span>
                )}
                {target.name && (
                  <span className="max-w-[220px] truncate" title={target.name}>
                    {target.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeResourceEditor}
            disabled={isResourceEditorSaving || isResourceEditorValidating}
            className="cursor-pointer rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
            aria-label="Close YAML editor"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {resourceEditorError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-[11px] text-rose-600 dark:text-rose-400">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span className="leading-relaxed">{resourceEditorError}</span>
            </div>
          )}

          {!canApply && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-400">
              <LockKeyhole
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span className="leading-relaxed">{capabilityReason}</span>
            </div>
          )}

          {resourceEditorCapabilityWarning && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span className="leading-relaxed">
                Permission lookup unavailable. The API server will still
                authorize the request. {resourceEditorCapabilityWarning}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--muted)]">
            <span>kubeview field manager · managedFields stripped on read</span>
            <span className="tabular-nums">
              {lineCount} lines · {resourceEditorYaml.length} bytes
            </span>
          </div>

          {isResourceEditorLoading ? (
            <div className="flex h-64 items-center justify-center gap-2 rounded-xl border border-[var(--editor-border)] bg-[var(--editor-bg)] font-mono text-xs text-[var(--editor-muted)]">
              <RotateCw className="h-4 w-4 animate-spin text-[var(--accent)]" />
              Fetching live manifest...
            </div>
          ) : (
            <YamlEditor
              value={resourceEditorYaml}
              onChange={setResourceEditorYaml}
              onSubmit={submitEditor}
              ariaLabel={`${target.kind} YAML manifest`}
              testId="resource-editor-textarea"
              className="h-[46vh] min-h-[320px] max-h-[60vh]"
            />
          )}

          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>
              Applying{" "}
              {isCreate ? "creates a new object" : "replaces the live manifest"}
              . Kubernetes validates the object server-side; a failed apply
              leaves the current resource unchanged.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5">
          {!isCreate ? (
            <button
              type="button"
              data-testid="resource-editor-delete"
              onClick={() => {
                closeResourceEditor();
                openDeleteResource(target);
              }}
              disabled={
                !canDelete ||
                isResourceEditorSaving ||
                isResourceEditorValidating
              }
              title={
                canDelete
                  ? `Delete ${target.kind}`
                  : resourceEditorCapabilities?.reasons?.delete ||
                    `Your identity cannot delete ${target.kind}.`
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="resource-editor-validate"
              onClick={() => void validateResourceEditor()}
              disabled={
                isResourceEditorSaving ||
                isResourceEditorValidating ||
                isResourceEditorLoading ||
                !resourceEditorYaml.trim()
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40"
            >
              {isResourceEditorValidating ? (
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
              ) : resourceEditorValidationSuccess ? (
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <BadgeCheck className="h-3.5 w-3.5" />
              )}
              {isResourceEditorValidating
                ? "Validating..."
                : resourceEditorValidationSuccess
                  ? "Valid"
                  : "Validate"}
            </button>
            <button
              type="button"
              onClick={closeResourceEditor}
              disabled={isResourceEditorSaving || isResourceEditorValidating}
              className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="resource-editor-apply"
              onClick={() => void applyResourceEditor()}
              disabled={
                !canApply ||
                isResourceEditorSaving ||
                isResourceEditorValidating ||
                isResourceEditorLoading ||
                !resourceEditorYaml.trim()
              }
              title="Apply and close (⌘/Ctrl+Enter)"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isResourceEditorSaving ? (
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isResourceEditorSaving
                ? "Applying..."
                : isCreate
                  ? "Create resource"
                  : "Apply & close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
