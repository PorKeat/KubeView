"use client";

import * as React from "react";
import {
  AlertTriangle,
  FileCode,
  RotateCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";

export function ResourceEditorModal() {
  const {
    resourceEditorTarget,
    resourceEditorYaml,
    isResourceEditorLoading,
    isResourceEditorSaving,
    resourceEditorError,
    setResourceEditorYaml,
    applyResourceEditor,
    closeResourceEditor,
    openDeleteResource,
  } = useClusterStore();

  React.useEffect(() => {
    if (!resourceEditorTarget) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isResourceEditorSaving) {
        closeResourceEditor();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resourceEditorTarget, isResourceEditorSaving, closeResourceEditor]);

  if (!resourceEditorTarget) return null;

  const target = resourceEditorTarget;
  const lineCount = resourceEditorYaml
    ? resourceEditorYaml.split("\n").length
    : 0;

  return (
    <div
      data-testid="resource-editor-modal"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25 shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                Edit {target.kind} YAML
              </h3>
              <p className="text-[11px] text-[var(--muted)] font-mono truncate">
                {target.name}
                {target.namespace && target.namespace !== "Cluster Scope"
                  ? ` in ${target.namespace}`
                  : " (cluster-scoped)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeResourceEditor}
            disabled={isResourceEditorSaving}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close YAML editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-4 sm:p-5">
          {resourceEditorError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-[11px] text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{resourceEditorError}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[var(--muted)]">
            <span>kubeview field manager · managedFields stripped on read</span>
            <span className="tabular-nums">
              {lineCount} lines · {resourceEditorYaml.length} bytes
            </span>
          </div>

          {isResourceEditorLoading ? (
            <div className="flex h-64 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[#1e1e1e] font-mono text-xs text-slate-400">
              <RotateCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
              Fetching live manifest...
            </div>
          ) : (
            <textarea
              data-testid="resource-editor-textarea"
              value={resourceEditorYaml}
              onChange={(event) => setResourceEditorYaml(event.target.value)}
              spellCheck={false}
              wrap="off"
              className={cn(
                "w-full min-h-[46vh] max-h-[60vh] resize-y rounded-xl border border-[var(--border)] bg-[#1e1e1e] p-3 font-mono text-[11px] leading-5 text-slate-200 outline-hidden",
                "focus:border-[var(--accent)] focus-ring",
              )}
              aria-label={`${target.kind} YAML manifest`}
            />
          )}

          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Applying replaces the live manifest. Kubernetes validates the
              object server-side; a failed apply leaves the current resource
              unchanged.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => {
              closeResourceEditor();
              openDeleteResource(target);
            }}
            disabled={isResourceEditorSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-500/15 cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeResourceEditor}
              disabled={isResourceEditorSaving}
              className="rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void applyResourceEditor()}
              disabled={
                isResourceEditorSaving ||
                isResourceEditorLoading ||
                !resourceEditorYaml.trim()
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[var(--accent-hover)] cursor-pointer disabled:opacity-50"
            >
              {isResourceEditorSaving ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isResourceEditorSaving ? "Applying..." : "Apply Manifest"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
