"use client";

import * as React from "react";
import { Eye, FolderLock, LockKeyhole, RefreshCw } from "lucide-react";
import type {
  ConfigMapSummary,
  SecretEditData,
  SecretSummary,
} from "@kubeview/contracts";
import { ConfigStorageEditorForm } from "@/components/modals/ConfigStorageEditorForm";
import { invokeRpc } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { SelectedResource } from "@/stores/clusterStore";
import { useClusterStore } from "@/stores/clusterStore";
import { InspectorResourceEditor } from "./InspectorResourceEditor";

type ConfigStorageEditorMode = "form" | "yaml";

function EditorModeSwitch({
  mode,
  onChange,
}: {
  mode: ConfigStorageEditorMode;
  onChange: (mode: ConfigStorageEditorMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-[var(--border)] bg-black/[0.03] p-0.5 dark:bg-white/[0.03]"
      role="group"
      aria-label="Configuration editor mode"
    >
      <button
        type="button"
        data-testid="config-storage-mode-form"
        aria-pressed={mode === "form"}
        onClick={() => onChange("form")}
        className={cn(
          "cursor-pointer rounded-md px-2 py-1 text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
          mode === "form"
            ? "bg-[var(--surface)] text-[var(--foreground)] shadow-xs"
            : "text-[var(--muted)] hover:text-[var(--foreground)]",
        )}
      >
        Fields
      </button>
      <button
        type="button"
        data-testid="config-storage-mode-yaml"
        aria-pressed={mode === "yaml"}
        onClick={() => onChange("yaml")}
        className={cn(
          "cursor-pointer rounded-md px-2 py-1 text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
          mode === "yaml"
            ? "bg-[var(--surface)] text-[var(--foreground)] shadow-xs"
            : "text-[var(--muted)] hover:text-[var(--foreground)]",
        )}
      >
        YAML
      </button>
    </div>
  );
}

export function ConfigStorageEditView({
  currentResource,
  data,
  isEditorMaximized,
  onToggleEditorMaximized,
  onClose,
  onSaved,
}: {
  currentResource: SelectedResource;
  data: ConfigMapSummary | SecretSummary;
  isEditorMaximized: boolean;
  onToggleEditorMaximized: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const currentContext = useClusterStore((state) => state.currentContext);
  const isConfigMap = currentResource.kind === "ConfigMap";
  const [mode, setMode] = React.useState<ConfigStorageEditorMode>(
    isConfigMap ? "yaml" : "form",
  );
  const [formDirty, setFormDirty] = React.useState(false);
  const [secretRevealed, setSecretRevealed] = React.useState(false);
  const [isRevealingSecret, setIsRevealingSecret] = React.useState(false);
  const [revealError, setRevealError] = React.useState<string | null>(null);
  const yamlDirty = useClusterStore((state) => state.isInspectorEditDirty);
  const setInspectorEditDirty = useClusterStore(
    (state) => state.setInspectorEditDirty,
  );

  React.useEffect(() => {
    setMode(isConfigMap ? "yaml" : "form");
    setFormDirty(false);
    setSecretRevealed(false);
    setRevealError(null);
    setIsRevealingSecret(false);
  }, [
    isConfigMap,
    currentResource.kind,
    currentResource.name,
    currentResource.namespace,
  ]);

  const switchMode = (nextMode: ConfigStorageEditorMode) => {
    if (nextMode === mode) return;
    const hasUnsavedChanges = mode === "yaml" ? yamlDirty : formDirty;
    if (
      hasUnsavedChanges &&
      !window.confirm("Discard unsaved changes and switch editors?")
    ) {
      return;
    }
    if (mode === "yaml") {
      setInspectorEditDirty(false);
    }
    if (nextMode === "form" && isEditorMaximized) {
      onToggleEditorMaximized();
    }
    setFormDirty(false);
    setMode(nextMode);
  };

  const revealSecret = async () => {
    if (!currentContext) return;
    setIsRevealingSecret(true);
    setRevealError(null);
    try {
      await invokeRpc<SecretEditData>("secrets.reveal", {
        contextName: currentContext,
        namespace: currentResource.namespace,
        name: currentResource.name,
      });
      setSecretRevealed(true);
    } catch (err) {
      setRevealError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRevealingSecret(false);
    }
  };

  const modeSwitch = (
    <div className="flex flex-wrap items-center gap-1.5">
      <EditorModeSwitch mode={mode} onChange={switchMode} />
      {!isConfigMap && mode === "yaml" && secretRevealed && (
        <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-700 dark:text-amber-400">
          values visible
        </span>
      )}
    </div>
  );

  if (mode === "yaml" && !isConfigMap && !secretRevealed) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]">
              <FolderLock className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-xs font-semibold text-[var(--foreground)]">
                Secret YAML
              </h3>
              <p className="font-mono text-[9px] text-[var(--muted)]">
                Reveal is required before raw values are loaded
              </p>
            </div>
          </div>
          {modeSwitch}
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
          <div
            data-testid="secret-yaml-gate"
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)]">
                  Reveal Secret values first
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                  The YAML editor shows the Secret data as base64. Reveal it
                  only when you need to inspect or change this Secret.
                </p>
              </div>
            </div>
            {revealError && (
              <div className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-2 text-[10px] text-rose-600 dark:text-rose-400">
                {revealError}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => switchMode("form")}
                className="cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1.5 text-[10px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              >
                Keep values hidden
              </button>
              <button
                type="button"
                data-testid="secret-yaml-reveal"
                onClick={() => void revealSecret()}
                disabled={isRevealingSecret}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-400"
              >
                {isRevealingSecret ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isRevealingSecret ? "Revealing..." : "Reveal & edit YAML"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "yaml") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <InspectorResourceEditor
          currentResource={currentResource}
          isMaximized={isEditorMaximized}
          onToggleMaximize={onToggleEditorMaximized}
          headerAccessory={modeSwitch}
          onApplied={onSaved}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4">
      <ConfigStorageEditorForm
        target={{
          kind: isConfigMap ? "ConfigMap" : "Secret",
          name: currentResource.name,
          namespace: currentResource.namespace,
          status: currentResource.status,
          immutable: data.immutable,
          summary: data,
        }}
        onClose={onClose}
        onSaved={onSaved}
        onDirtyChange={setFormDirty}
        onRevealed={() => setSecretRevealed(true)}
        headerAccessory={modeSwitch}
      />
    </div>
  );
}
