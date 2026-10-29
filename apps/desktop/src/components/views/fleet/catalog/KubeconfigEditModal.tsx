"use client";

import * as React from "react";
import {
  AlertTriangle,
  FileCode,
  KeyRound,
  Loader2,
  Pencil,
  Server,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ExportKubeconfigResult } from "@kubeview/contracts";
import { YamlEditor } from "@/components/editor/YamlEditor";
import { cn } from "@/lib/utils";
import { invokeRpc } from "@/lib/ipc";
import type { ClusterContextInfo } from "@/stores/clusterStore";
import { useClusterStore } from "@/stores/clusterStore";
import { useCatalogStore } from "@/stores/catalogStore";

type EditorMode = "details" | "yaml";

export function KubeconfigEditModal({
  context,
  onClose,
}: {
  context: ClusterContextInfo;
  onClose: () => void;
}) {
  const updateEndpoint = useClusterStore((state) => state.updateEndpoint);
  const loadContexts = useClusterStore((state) => state.loadContexts);
  const currentAlias = useCatalogStore(
    (state) => state.aliases[context.name] ?? "",
  );
  const setContextAlias = useCatalogStore((state) => state.setContextAlias);
  const [mode, setMode] = React.useState<EditorMode>("details");
  const [alias, setAlias] = React.useState(currentAlias);
  const [endpoint, setEndpoint] = React.useState(context.server);
  const [yaml, setYaml] = React.useState("");
  const [isLoadingYaml, setIsLoadingYaml] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  const loadYaml = async () => {
    if (yaml || isLoadingYaml) return;
    setIsLoadingYaml(true);
    setError(null);
    try {
      const result = await invokeRpc<ExportKubeconfigResult>(
        "clusters.exportKubeconfig",
        { contextName: context.name },
      );
      setYaml(result.yaml);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingYaml(false);
    }
  };

  const switchMode = (nextMode: EditorMode) => {
    setError(null);
    setMode(nextMode);
    if (nextMode === "yaml") {
      void loadYaml();
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || isLoadingYaml) return;

    const aliasValue = alias.trim() || null;

    if (mode === "yaml") {
      if (!yaml.trim()) {
        setError("The YAML manifest is empty.");
        return;
      }
      setIsSaving(true);
      setError(null);
      try {
        await invokeRpc<ExportKubeconfigResult>(
          "clusters.updateKubeconfigContext",
          { contextName: context.name, yaml },
        );
        setContextAlias(context.name, aliasValue);
        await loadContexts();
        toast.success("Kubeconfig updated");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const nextEndpoint = endpoint.trim();
    if (!nextEndpoint) {
      setError("API server endpoint is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (nextEndpoint !== context.server) {
        await updateEndpoint(context.name, nextEndpoint);
      }
      setContextAlias(context.name, aliasValue);
      toast.success("Kubeconfig updated");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="presentation"
    >
      <form
        onSubmit={handleSave}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kubeconfig-edit-title"
        data-testid="kubeconfig-edit-modal"
        className={cn(
          "flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-2xl animate-in fade-in zoom-in-95 duration-150",
          mode === "yaml" ? "max-w-4xl" : "max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]">
              {mode === "yaml" ? (
                <FileCode className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pencil className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <h2
                id="kubeconfig-edit-title"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Edit kubeconfig
              </h2>
              <p className="truncate font-mono text-[10px] text-[var(--muted)]">
                {context.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close kubeconfig editor"
            className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1 border-b border-[var(--border)] px-4 py-2 sm:px-5">
          <button
            type="button"
            data-testid="kubeconfig-edit-tab-details"
            onClick={() => switchMode("details")}
            className={cn(
              "rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer",
              mode === "details"
                ? "bg-[var(--surface-active)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            Details
          </button>
          <button
            type="button"
            data-testid="kubeconfig-edit-tab-yaml"
            onClick={() => switchMode("yaml")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer",
              mode === "yaml"
                ? "bg-[var(--surface-active)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            <FileCode className="h-3 w-3" aria-hidden="true" />
            Raw YAML
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {error && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-2 text-[10px] text-rose-600 dark:text-rose-400"
            >
              <AlertTriangle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}

          {mode === "yaml" ? (
            <div className="space-y-3">
              {isLoadingYaml ? (
                <div className="flex h-[42vh] min-h-[300px] items-center justify-center gap-2 rounded-lg border border-[var(--editor-border)] bg-[var(--editor-bg)] font-mono text-xs text-[var(--editor-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                  Loading kubeconfig YAML...
                </div>
              ) : (
                <YamlEditor
                  value={yaml}
                  onChange={setYaml}
                  onSubmit={() => {
                    const form = document.querySelector(
                      '[data-testid="kubeconfig-edit-modal"]',
                    ) as HTMLFormElement | null;
                    form?.requestSubmit();
                  }}
                  ariaLabel={`Kubeconfig YAML for ${context.name}`}
                  testId="kubeconfig-edit-yaml"
                  className="h-[42vh] min-h-[300px]"
                />
              )}
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2 text-[10px] leading-4 text-amber-700 dark:text-amber-400">
                <KeyRound
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                Raw YAML contains credentials and supports editing the default
                namespace. Only this context can be saved at a time.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="kubeconfig-alias"
                  className="text-[11px] font-medium text-[var(--foreground)]"
                >
                  Alias name{" "}
                  <span className="text-[var(--muted)]">(optional)</span>
                </label>
                <input
                  id="kubeconfig-alias"
                  data-testid="kubeconfig-edit-alias"
                  value={alias}
                  onChange={(event) => setAlias(event.target.value)}
                  placeholder={context.name}
                  maxLength={80}
                  autoFocus
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] outline-hidden transition-colors placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)]"
                />
                <p className="text-[10px] leading-4 text-[var(--muted)]">
                  Shown in KubeView. This does not rename the context in your
                  kubeconfig file.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="kubeconfig-endpoint"
                  className="text-[11px] font-medium text-[var(--foreground)]"
                >
                  API server endpoint
                </label>
                <div className="relative">
                  <Server
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                    aria-hidden="true"
                  />
                  <input
                    id="kubeconfig-endpoint"
                    data-testid="kubeconfig-edit-endpoint"
                    value={endpoint}
                    onChange={(event) => setEndpoint(event.target.value)}
                    spellCheck={false}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-8 pr-3 font-mono text-[11px] text-[var(--foreground)] outline-hidden transition-colors focus:border-[var(--accent)]"
                  />
                </div>
                <p className="text-[10px] leading-4 text-[var(--muted)]">
                  Updating the endpoint writes the change to the managed
                  kubeconfig.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Context", context.name],
                  ["Cluster", context.cluster],
                  ["Auth", context.authType ?? "unknown"],
                  ["Namespace", context.namespace || "default"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[var(--border)] bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.02]"
                  >
                    <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      {label}
                    </div>
                    <div
                      className="mt-0.5 truncate font-mono text-[10px] text-[var(--foreground)]"
                      title={value}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[10px] leading-4 text-[var(--muted)]">
                <Pencil
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                Use Raw YAML to edit the default namespace, certificates, or
                other kubeconfig fields.
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5">
          <span className="flex items-center gap-1.5 font-mono text-[9px] text-amber-700 dark:text-amber-400">
            <KeyRound className="h-3 w-3" aria-hidden="true" />
            contains credentials
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="kubeconfig-edit-save"
              disabled={isSaving || isLoadingYaml || (mode === "yaml" && !yaml)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSaving
                ? "Saving..."
                : mode === "yaml"
                  ? "Apply YAML"
                  : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
