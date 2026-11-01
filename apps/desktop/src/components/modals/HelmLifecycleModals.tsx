"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  History,
  Loader2,
  RotateCcw,
  ShipWheel,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  HelmHistoryResult,
  HelmReleaseActionResult,
  HelmReleaseRevision,
  HelmValuesResult,
} from "@kubeview/contracts";
import { toast } from "sonner";
import { invokeRpc } from "@/lib/ipc";
import { useClusterStore } from "@/stores/clusterStore";
import { useHelmStore } from "@/stores/helmStore";
import { cn } from "@/lib/utils";

export interface HelmReleaseTarget {
  name: string;
  namespace: string;
  chart?: string;
  chartVersion?: string;
  repositoryUrl?: string;
}

function ModalShell({
  title,
  subtitle,
  icon: Icon,
  onClose,
  busy,
  children,
  testId,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  onClose: () => void;
  busy: boolean;
  children: React.ReactNode;
  testId: string;
}) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => !busy && onClose()}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                {title}
              </h2>
              <p className="truncate font-mono text-[10px] text-[var(--muted)]">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={`Close ${title}`}
            className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-0.5 block text-[9px] text-[var(--muted)]">
          {hint}
        </span>
      )}
    </label>
  );
}

const inputClass =
  "h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 font-mono text-[11px] text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]";

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-[var(--foreground)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}

export function HelmChartActionModal({
  open,
  mode,
  target,
  onClose,
  onCompleted,
}: {
  open: boolean;
  mode: "install" | "upgrade";
  target?: Partial<HelmReleaseTarget>;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const currentContext = useClusterStore((state) => state.currentContext);
  const currentNamespace = useClusterStore((state) => state.currentNamespace);
  const refreshResourceKind = useClusterStore(
    (state) => state.refreshResourceKind,
  );
  const releaseRepositories = useHelmStore(
    (state) => state.releaseRepositories,
  );
  const rememberReleaseRepository = useHelmStore(
    (state) => state.rememberReleaseRepository,
  );
  const [releaseName, setReleaseName] = React.useState("");
  const [namespace, setNamespace] = React.useState("default");
  const [repositoryUrl, setRepositoryUrl] = React.useState("");
  const [chartName, setChartName] = React.useState("");
  const [version, setVersion] = React.useState("");
  const [values, setValues] = React.useState("");
  const [createNamespace, setCreateNamespace] = React.useState(false);
  const [wait, setWait] = React.useState(true);
  const [reuseValues, setReuseValues] = React.useState(false);
  const [resetValues, setResetValues] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const targetName = target?.name ?? "";
  const targetNamespace = target?.namespace ?? "";
  const targetRepositoryUrl = target?.repositoryUrl ?? "";
  const targetChart = target?.chart ?? "";
  const targetChartVersion = target?.chartVersion ?? "";
  const storedReleaseRepository =
    targetName && targetNamespace
      ? (releaseRepositories[`${targetNamespace}/${targetName}`] ?? "")
      : "";

  React.useEffect(() => {
    if (!open) return;
    setReleaseName(targetName);
    setNamespace(
      targetNamespace ||
        (currentNamespace !== "all" ? currentNamespace : "default"),
    );
    setRepositoryUrl(targetRepositoryUrl || storedReleaseRepository);
    setChartName(targetChart);
    setVersion(targetChartVersion);
    setValues("");
    setCreateNamespace(false);
    setWait(true);
    setReuseValues(false);
    setResetValues(false);
    setError(null);
    if (mode === "upgrade" && targetName && targetNamespace) {
      invokeRpc<HelmValuesResult>("helm.values", {
        contextName: currentContext,
        namespace: targetNamespace,
        name: targetName,
      })
        .then((result) => setValues(result.values ?? ""))
        .catch(() => {
          // Values are optional; the user can enter them manually.
        });
    }
  }, [
    currentContext,
    currentNamespace,
    mode,
    open,
    targetChart,
    targetChartVersion,
    targetName,
    targetNamespace,
    targetRepositoryUrl,
    storedReleaseRepository,
  ]);

  if (!open) return null;

  const submit = async () => {
    if (!releaseName.trim() || !chartName.trim() || !repositoryUrl.trim()) {
      setError("Release name, chart name, and repository URL are required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const base = {
        contextName: currentContext,
        releaseName: releaseName.trim(),
        namespace: namespace.trim() || "default",
        repositoryUrl: repositoryUrl.trim(),
        chartName: chartName.trim(),
        version: version.trim() || undefined,
        values,
        wait,
        timeoutSeconds: 300,
      };
      if (mode === "install") {
        await invokeRpc<HelmReleaseActionResult>("helm.install", {
          ...base,
          createNamespace,
        });
        toast.success(`Installed Helm release ${base.releaseName}`);
      } else {
        await invokeRpc<HelmReleaseActionResult>("helm.upgrade", {
          ...base,
          reuseValues,
          resetValues,
        });
        toast.success(`Upgraded Helm release ${base.releaseName}`);
      }
      rememberReleaseRepository(
        base.namespace,
        base.releaseName,
        base.repositoryUrl,
      );
      void refreshResourceKind("HelmRelease");
      onCompleted?.();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Helm operation failed.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      title={mode === "install" ? "Install Helm release" : "Upgrade release"}
      subtitle={`${releaseName || "new release"} · ${namespace}`}
      icon={mode === "install" ? Upload : ShipWheel}
      onClose={onClose}
      busy={isSaving}
      testId={`helm-${mode}-modal`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Release name">
          <input
            value={releaseName}
            onChange={(event) => setReleaseName(event.target.value)}
            disabled={mode === "upgrade"}
            className={inputClass}
            data-testid="helm-release-name"
          />
        </Field>
        <Field label="Namespace">
          <input
            value={namespace}
            onChange={(event) => setNamespace(event.target.value)}
            disabled={mode === "upgrade"}
            className={inputClass}
            data-testid="helm-release-namespace"
          />
        </Field>
        <Field
          label="Repository URL"
          hint="Chart repository, e.g. https://charts.example.com"
        >
          <input
            value={repositoryUrl}
            onChange={(event) => setRepositoryUrl(event.target.value)}
            placeholder="https://..."
            className={inputClass}
            data-testid="helm-repository-url"
          />
        </Field>
        <Field label="Chart name">
          <input
            value={chartName}
            onChange={(event) => setChartName(event.target.value)}
            className={inputClass}
            data-testid="helm-chart-name"
          />
        </Field>
        <Field label="Chart version" hint="Leave empty for the latest semver.">
          <input
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            className={inputClass}
            data-testid="helm-chart-version"
          />
        </Field>
        <div className="flex flex-col justify-end gap-1.5 pb-1">
          <Checkbox
            label="Wait for resources"
            checked={wait}
            onChange={setWait}
          />
          {mode === "install" ? (
            <Checkbox
              label="Create namespace"
              checked={createNamespace}
              onChange={setCreateNamespace}
            />
          ) : (
            <div className="flex flex-wrap gap-3">
              <Checkbox
                label="Reuse values"
                checked={reuseValues}
                onChange={(value) => {
                  setReuseValues(value);
                  if (value) setResetValues(false);
                }}
              />
              <Checkbox
                label="Reset values"
                checked={resetValues}
                onChange={(value) => {
                  setResetValues(value);
                  if (value) setReuseValues(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <Field
        label="Values (YAML)"
        hint="Optional overrides merged with the chart defaults."
      >
        <textarea
          value={values}
          onChange={(event) => setValues(event.target.value)}
          rows={10}
          spellCheck={false}
          data-testid="helm-values"
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--editor-bg)] p-2.5 font-mono text-[11px] leading-relaxed text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-2.5 text-[11px] text-rose-600 dark:text-rose-400"
        >
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
          data-testid={`helm-${mode}-submit`}
          onClick={() => void submit()}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
          {mode === "install" ? "Install" : "Upgrade"}
        </button>
      </div>
    </ModalShell>
  );
}

export function HelmRollbackModal({
  open,
  target,
  onClose,
  onCompleted,
}: {
  open: boolean;
  target: HelmReleaseTarget | null;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const currentContext = useClusterStore((state) => state.currentContext);
  const refreshResourceKind = useClusterStore(
    (state) => state.refreshResourceKind,
  );
  const [revisions, setRevisions] = React.useState<HelmReleaseRevision[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [rollingBack, setRollingBack] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const releaseName = target?.name ?? "";
  const releaseNamespace = target?.namespace ?? "";

  React.useEffect(() => {
    if (!open || !releaseName || !releaseNamespace) return;
    setIsLoading(true);
    setError(null);
    invokeRpc<HelmHistoryResult>("helm.history", {
      contextName: currentContext,
      namespace: releaseNamespace,
      name: releaseName,
    })
      .then((result) => setRevisions(result.items ?? []))
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load release history.",
        ),
      )
      .finally(() => setIsLoading(false));
  }, [currentContext, open, releaseName, releaseNamespace]);

  if (!open || !target) return null;

  const rollback = async (revision: number) => {
    setRollingBack(revision);
    setError(null);
    try {
      await invokeRpc("helm.rollback", {
        contextName: currentContext,
        releaseName: target.name,
        namespace: target.namespace,
        revision,
        wait: true,
        timeoutSeconds: 300,
      });
      toast.success(`${target.name} rolled back to revision ${revision}`);
      void refreshResourceKind("HelmRelease");
      onCompleted?.();
      onClose();
    } catch (rollbackError) {
      setError(
        rollbackError instanceof Error
          ? rollbackError.message
          : "Rollback failed.",
      );
    } finally {
      setRollingBack(null);
    }
  };

  return (
    <ModalShell
      title="Rollback release"
      subtitle={`${target.name} · ${target.namespace}`}
      icon={History}
      onClose={onClose}
      busy={rollingBack !== null}
      testId="helm-rollback-modal"
    >
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-2.5 text-[11px] text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
      )}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center gap-2 text-xs text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
          Loading revisions...
        </div>
      ) : revisions.length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--muted)]">
          No release history is available.
        </p>
      ) : (
        <ul className="space-y-2">
          {revisions.map((revision, index) => (
            <li
              key={revision.revision}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3",
                index === 0
                  ? "border-[var(--accent)]/40 bg-[var(--accent)]/5"
                  : "border-[var(--border)] bg-[var(--background)]",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[var(--foreground)]">
                    Revision {revision.revision}
                  </span>
                  <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)]">
                    {revision.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted)]">
                  {revision.chart} {revision.chartVersion} ·{" "}
                  {revision.updated
                    ? new Date(revision.updated).toLocaleString()
                    : "unknown"}
                </p>
                {revision.description && (
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {revision.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void rollback(revision.revision)}
                disabled={rollingBack !== null || index === 0}
                data-testid={`helm-rollback-${revision.revision}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40 cursor-pointer"
              >
                {rollingBack === revision.revision ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                Roll back
              </button>
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}

export function HelmUninstallModal({
  open,
  target,
  onClose,
  onCompleted,
}: {
  open: boolean;
  target: HelmReleaseTarget | null;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const currentContext = useClusterStore((state) => state.currentContext);
  const refreshResourceKind = useClusterStore(
    (state) => state.refreshResourceKind,
  );
  const [keepHistory, setKeepHistory] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setKeepHistory(false);
    setConfirmation("");
    setError(null);
  }, [open]);

  if (!open || !target) return null;

  const remove = async () => {
    if (confirmation.trim() !== target.name) {
      setError(`Type "${target.name}" to confirm uninstall.`);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await invokeRpc("helm.uninstall", {
        contextName: currentContext,
        releaseName: target.name,
        namespace: target.namespace,
        keepHistory,
        wait: true,
      });
      toast.success(`Uninstalled Helm release ${target.name}`);
      void refreshResourceKind("HelmRelease");
      onCompleted?.();
      onClose();
    } catch (uninstallError) {
      setError(
        uninstallError instanceof Error
          ? uninstallError.message
          : "Uninstall failed.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      title="Uninstall release"
      subtitle={`${target.name} · ${target.namespace}`}
      icon={Trash2}
      onClose={onClose}
      busy={isSaving}
      testId="helm-uninstall-modal"
    >
      <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3 text-[11px] leading-relaxed text-[var(--foreground)]">
        Uninstalling removes the rendered Kubernetes resources. This cannot be
        undone unless the release is reinstalled.
      </div>
      <Checkbox
        label="Keep release history"
        checked={keepHistory}
        onChange={setKeepHistory}
      />
      <Field label={`Type ${target.name} to confirm`}>
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className={inputClass}
          data-testid="helm-uninstall-confirm-name"
        />
      </Field>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-2.5 text-[11px] text-rose-600 dark:text-rose-400"
        >
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
          data-testid="helm-uninstall-submit"
          onClick={() => void remove()}
          disabled={isSaving || confirmation.trim() !== target.name}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
        >
          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
          Uninstall
        </button>
      </div>
    </ModalShell>
  );
}

/** Inline upgrade/rollback/uninstall actions for the Helm release drawer. */
export function HelmReleaseActions({
  target,
  onChanged,
}: {
  target: HelmReleaseTarget;
  onChanged: () => void;
}) {
  const [mode, setMode] = React.useState<"upgrade" | "rollback" | "uninstall">(
    "upgrade",
  );
  const [open, setOpen] = React.useState(false);

  const show = (next: typeof mode) => {
    setMode(next);
    setOpen(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-testid="helm-release-upgrade"
        onClick={() => show("upgrade")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
      >
        <Upload className="h-3.5 w-3.5 text-[var(--muted)]" />
        Upgrade
      </button>
      <button
        type="button"
        data-testid="helm-release-rollback"
        onClick={() => show("rollback")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
      >
        <History className="h-3.5 w-3.5 text-[var(--muted)]" />
        Rollback
      </button>
      <button
        type="button"
        data-testid="helm-release-uninstall"
        onClick={() => show("uninstall")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-2 text-[10px] font-medium text-rose-600 transition-colors hover:bg-rose-500/10 cursor-pointer dark:text-rose-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Uninstall
      </button>

      {mode === "rollback" ? (
        <HelmRollbackModal
          open={open}
          target={target}
          onClose={() => setOpen(false)}
          onCompleted={onChanged}
        />
      ) : mode === "uninstall" ? (
        <HelmUninstallModal
          open={open}
          target={target}
          onClose={() => setOpen(false)}
          onCompleted={onChanged}
        />
      ) : (
        <HelmChartActionModal
          open={open}
          mode="upgrade"
          target={target}
          onClose={() => setOpen(false)}
          onCompleted={onChanged}
        />
      )}
    </div>
  );
}
