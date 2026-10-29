"use client";

import * as React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  FileCode,
  FileDiff,
  LockKeyhole,
  Maximize2,
  Minimize2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ResourceApplyResult,
  ResourceCapabilities,
  ResourceGetResult,
} from "@kubeview/contracts";
import { YamlEditor } from "@/components/editor/YamlEditor";
import { Tooltip } from "@/components/ui/Tooltip";
import { invokeRpc } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { resourceTarget } from "@/lib/resourceKinds";
import { diffYamlLines } from "@/lib/yamlDiff";
import { useClusterStore, type SelectedResource } from "@/stores/clusterStore";
import { ResourceDiffView } from "../components/ResourceDiffView";

const WORKLOAD_KINDS = new Set([
  "Deployment",
  "ReplicaSet",
  "StatefulSet",
  "DaemonSet",
  "Job",
  "CronJob",
]);

export interface InspectorResourceEditorProps {
  currentResource: SelectedResource;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  headerAccessory?: React.ReactNode;
  onApplied?: () => void;
}

export function InspectorResourceEditor({
  currentResource,
  isMaximized = false,
  onToggleMaximize,
  headerAccessory,
  onApplied,
}: InspectorResourceEditorProps) {
  const currentContext = useClusterStore((state) => state.currentContext);
  const refreshResourceKind = useClusterStore(
    (state) => state.refreshResourceKind,
  );
  const openDeleteResource = useClusterStore(
    (state) => state.openDeleteResource,
  );
  const closeInspector = useClusterStore((state) => state.closeInspector);
  const setInspectorEditDirty = useClusterStore(
    (state) => state.setInspectorEditDirty,
  );

  const target = React.useMemo(
    () =>
      resourceTarget(
        currentResource.kind,
        currentResource.name,
        currentResource.namespace,
      ),
    [currentResource.kind, currentResource.name, currentResource.namespace],
  );
  const targetKey = target
    ? `${target.apiVersion}/${target.kind}/${target.namespace}/${target.name}`
    : "";

  const [yaml, setYaml] = React.useState("");
  const [baselineYaml, setBaselineYaml] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"yaml" | "diff">("yaml");
  const [pendingApply, setPendingApply] = React.useState<{
    closeAfter: boolean;
  } | null>(null);
  const [capabilities, setCapabilities] =
    React.useState<ResourceCapabilities | null>(null);
  const [capabilityWarning, setCapabilityWarning] = React.useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [savingWithClose, setSavingWithClose] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationSuccess, setValidationSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!target) {
      setIsLoading(false);
      setError("This resource type does not support generic YAML editing.");
      return;
    }

    let cancelled = false;
    let warning: string | null = null;
    setIsLoading(true);
    setValidationSuccess(false);
    setPendingApply(null);
    setViewMode("yaml");
    setError(null);
    setCapabilityWarning(null);
    setCapabilities(null);
    setYaml("");
    setBaselineYaml("");

    const capabilityPromise = invokeRpc<ResourceCapabilities>(
      "resources.capabilities",
      {
        contextName: currentContext,
        apiVersion: target.apiVersion,
        kind: target.kind,
        resource: target.resource,
        name: target.name,
        namespace: target.namespace || undefined,
      },
    ).catch((err) => {
      warning = err instanceof Error ? err.message : String(err);
      return null;
    });

    invokeRpc<ResourceGetResult>("resources.get", {
      contextName: currentContext,
      apiVersion: target.apiVersion,
      kind: target.kind,
      resource: target.resource,
      name: target.name,
      namespace: target.namespace || undefined,
    })
      .then((result) => {
        if (cancelled) return;
        setYaml(result.yaml);
        setBaselineYaml(result.yaml);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    capabilityPromise.then((result) => {
      if (cancelled) return;
      setCapabilities(result);
      setCapabilityWarning(warning);
    });

    return () => {
      cancelled = true;
    };
  }, [currentContext, target, targetKey]);

  const diff = React.useMemo(
    () => diffYamlLines(baselineYaml, yaml),
    [baselineYaml, yaml],
  );
  const dirty = yaml !== baselineYaml;
  const lineCount = yaml ? yaml.split("\n").length : 0;

  React.useEffect(() => {
    setInspectorEditDirty(dirty);
    return () => setInspectorEditDirty(false);
  }, [dirty, setInspectorEditDirty]);

  if (!target) {
    return (
      <div className="p-4 text-xs text-[var(--muted)]">
        This resource type does not support generic YAML editing.
      </div>
    );
  }

  const requiredVerb = "update" as const;
  const canApply = !capabilities || capabilities[requiredVerb] !== false;
  const canDelete = !capabilities || capabilities.delete !== false;
  const capabilityReason =
    capabilities?.reasons?.[requiredVerb] ||
    "Your identity is not allowed to update this resource.";
  const requiresConfirmation =
    diff.hasChanges && (diff.removed > 0 || WORKLOAD_KINDS.has(target.kind));

  const refParams = {
    contextName: currentContext,
    yaml,
    resource: target.resource,
    name: target.name,
    namespace: target.namespace || undefined,
  };

  const validate = async () => {
    if (isSaving || isValidating || isLoading) return;
    setIsValidating(true);
    setError(null);
    try {
      await invokeRpc<ResourceApplyResult>("resources.apply", {
        ...refParams,
        dryRun: true,
      });
      setValidationSuccess(true);
      if (diff.hasChanges) setViewMode("diff");
      toast.success("Manifest is valid");
    } catch (err) {
      setValidationSuccess(false);
      setError(err instanceof Error ? err.message : String(err));
      toast.error("Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const apply = async (closeAfter = false) => {
    if (!canApply) {
      setError(capabilityReason);
      return;
    }
    if (isSaving || isValidating || isLoading) return;

    setIsSaving(true);
    setSavingWithClose(closeAfter);
    setError(null);
    try {
      const result = await invokeRpc<ResourceApplyResult>("resources.apply", {
        ...refParams,
        dryRun: false,
      });
      setYaml(result.yaml);
      setBaselineYaml(result.yaml);
      setValidationSuccess(true);
      setPendingApply(null);
      await refreshResourceKind(target.kind);
      onApplied?.();
      toast.success(`${result.kind} ${result.name} updated`);
      if (closeAfter) {
        closeInspector();
      } else {
        setViewMode("yaml");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      toast.error("Failed to apply manifest");
    } finally {
      setIsSaving(false);
      setSavingWithClose(false);
    }
  };

  const requestApply = (closeAfter = false) => {
    if (isLoading || isSaving || isValidating) return;
    if (!diff.hasChanges) {
      toast.info("No changes to apply");
      return;
    }
    if (requiresConfirmation) {
      setPendingApply({ closeAfter });
      return;
    }
    void apply(closeAfter);
  };

  const reset = () => {
    setYaml(baselineYaml);
    setValidationSuccess(false);
    setPendingApply(null);
    setViewMode("yaml");
    setError(null);
  };

  const handleYamlChange = (value: string) => {
    setYaml(value);
    setValidationSuccess(false);
    setPendingApply(null);
  };

  return (
    <div
      data-testid="inspector-resource-editor"
      className="flex h-full min-h-0 flex-col bg-[var(--surface)]"
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]">
            <FileCode className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-[var(--foreground)]">
              Edit {target.kind}
            </h3>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[9px] text-[var(--muted)]">
              <span className="rounded border border-[var(--border)] bg-[var(--surface-active)]/60 px-1.5 py-0.5">
                {target.apiVersion}
              </span>
              <span className="rounded border border-[var(--border)] bg-[var(--surface-active)]/60 px-1.5 py-0.5">
                {target.resource}
              </span>
              <span className="rounded border border-[var(--border)] bg-[var(--surface-active)]/60 px-1.5 py-0.5">
                {target.namespace || "cluster scope"}
              </span>
              <span className="max-w-[220px] truncate" title={target.name}>
                {target.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {headerAccessory}
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-black/[0.03] p-0.5 dark:bg-white/[0.03]">
            <button
              type="button"
              data-testid="inspector-resource-editor-view-yaml"
              onClick={() => setViewMode("yaml")}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                viewMode === "yaml"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              YAML
            </button>
            <button
              type="button"
              data-testid="inspector-resource-editor-view-diff"
              onClick={() => setViewMode("diff")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                viewMode === "diff"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <FileDiff className="h-3 w-3" aria-hidden="true" />
              Changes
              {diff.hasChanges && (
                <span className="font-mono text-[9px]">
                  +{diff.added} −{diff.removed}
                </span>
              )}
            </button>
          </div>
          <span className="hidden font-mono text-[9px] text-[var(--muted)] sm:inline">
            {lineCount} lines · {yaml.length} bytes
          </span>
          {onToggleMaximize && (
            <Tooltip
              content={isMaximized ? "Restore editor" : "Expand editor"}
              side="bottom"
            >
              <button
                type="button"
                data-testid="inspector-resource-editor-maximize"
                aria-label={
                  isMaximized ? "Restore editor size" : "Expand editor"
                }
                aria-pressed={isMaximized}
                onClick={onToggleMaximize}
                className="rounded-md border border-[var(--border)] p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                {isMaximized ? (
                  <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 p-2.5 text-[10px] text-rose-600 dark:text-rose-400">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="break-words">{error}</span>
          </div>
        )}

        {!canApply && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2.5 text-[10px] text-amber-700 dark:text-amber-400">
            <LockKeyhole
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>{capabilityReason}</span>
          </div>
        )}

        {capabilityWarning && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[10px] text-amber-700 dark:text-amber-400">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>
              Permission lookup unavailable. The API server will still authorize
              the request. {capabilityWarning}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[320px] flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--editor-border)] bg-[var(--editor-bg)] font-mono text-xs text-[var(--editor-muted)]">
            <RotateCw className="h-4 w-4 animate-spin text-[var(--accent)]" />
            Fetching live manifest...
          </div>
        ) : viewMode === "diff" ? (
          <ResourceDiffView diff={diff} />
        ) : (
          <YamlEditor
            value={yaml}
            onChange={handleYamlChange}
            onSubmit={() => requestApply(false)}
            ariaLabel={`${target.kind} YAML manifest`}
            testId="inspector-resource-editor-yaml"
            className="min-h-[320px] flex-1"
          />
        )}
      </div>

      {pendingApply && (
        <div
          data-testid="inspector-resource-editor-apply-confirm"
          className="shrink-0 border-t border-amber-500/25 bg-amber-500/5 px-4 py-3"
        >
          <div className="flex items-start gap-2 text-[10px] text-amber-700 dark:text-amber-400">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <div className="space-y-0.5">
              <div className="font-semibold">
                Review changes before applying
              </div>
              <p>
                {diff.removed > 0
                  ? `This edit removes ${diff.removed} line${
                      diff.removed === 1 ? "" : "s"
                    } from the live manifest.`
                  : "This edit changes a workload manifest and may trigger a rollout."}
              </p>
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              data-testid="inspector-resource-editor-cancel-apply"
              onClick={() => setPendingApply(null)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[10px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            >
              Keep editing
            </button>
            <button
              type="button"
              data-testid="inspector-resource-editor-confirm-apply"
              onClick={() => void apply(pendingApply.closeAfter)}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isSaving && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
              {pendingApply.closeAfter ? "Confirm & close" : "Confirm apply"}
            </button>
          </div>
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
        <button
          type="button"
          data-testid="inspector-resource-editor-delete"
          onClick={() => openDeleteResource(target)}
          disabled={!canDelete || isSaving || isValidating}
          title={
            canDelete
              ? `Delete ${target.kind}`
              : capabilities?.reasons?.delete ||
                `Your identity cannot delete ${target.kind}.`
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-[10px] font-semibold text-rose-600 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden font-mono text-[9px] text-[var(--muted)] lg:inline">
            {diff.hasChanges
              ? `+${diff.added} −${diff.removed} vs live`
              : "No changes"}
          </span>
          <button
            type="button"
            data-testid="inspector-resource-editor-reset"
            onClick={reset}
            disabled={!dirty || isSaving || isValidating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[10px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
          <button
            type="button"
            data-testid="inspector-resource-editor-validate"
            onClick={() => void validate()}
            disabled={isLoading || isSaving || isValidating || !yaml.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            {isValidating ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
            ) : validationSuccess ? (
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <BadgeCheck className="h-3.5 w-3.5" />
            )}
            {isValidating
              ? "Validating..."
              : validationSuccess
                ? "Valid"
                : "Validate"}
          </button>
          <button
            type="button"
            data-testid="inspector-resource-editor-apply"
            onClick={() => requestApply(false)}
            disabled={
              isLoading ||
              isSaving ||
              isValidating ||
              !yaml.trim() ||
              !canApply ||
              !diff.hasChanges
            }
            title="Apply changes (⌘/Ctrl+Enter)"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {isSaving && !savingWithClose ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isSaving && !savingWithClose ? "Applying..." : "Apply changes"}
          </button>
          <button
            type="button"
            data-testid="inspector-resource-editor-apply-close"
            onClick={() => requestApply(true)}
            disabled={
              isLoading ||
              isSaving ||
              isValidating ||
              !yaml.trim() ||
              !canApply ||
              !diff.hasChanges
            }
            title="Apply changes and close the inspector (⌘/Ctrl+Enter)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            {isSaving && savingWithClose ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isSaving && savingWithClose ? "Applying..." : "Apply & close"}
          </button>
        </div>
      </div>
    </div>
  );
}
