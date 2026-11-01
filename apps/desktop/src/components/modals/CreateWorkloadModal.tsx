"use client";

import * as React from "react";
import { AlertTriangle, Braces, Check, Loader2, Plus, X } from "lucide-react";
import type {
  ResourceApplyResult,
  ResourceCapabilities,
} from "@kubeview/contracts";
import { toast } from "sonner";
import { invokeRpc } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import { YamlEditor } from "@/components/editor/YamlEditor";
import {
  DEFAULT_WORKLOAD_VALUES,
  buildWorkloadManifest,
  type WorkloadCreateValues,
} from "@/lib/resourceTemplates";

const NAME_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const RESOURCE_BY_KIND = { Job: "jobs", CronJob: "cronjobs" } as const;

type WorkloadKind = keyof typeof RESOURCE_BY_KIND;

function validateName(value: string): string | null {
  if (!value) return "Name is required.";
  if (value.length > 63) return "Use 63 characters or fewer.";
  if (!NAME_PATTERN.test(value)) {
    return "Use lowercase letters, numbers, and hyphens; start and end with a letter or number.";
  }
  return null;
}

function validateSchedule(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Schedule is required.";
  if (trimmed.startsWith("@")) return null;
  if (trimmed.split(/\s+/).length !== 5) {
    return "Use a five-field cron expression or a macro like @hourly.";
  }
  return null;
}

function FormField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-[11px] font-medium text-[var(--foreground)]">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[9px] leading-relaxed text-[var(--muted)]">
          {hint}
        </span>
      )}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] outline-hidden transition-colors placeholder:text-[var(--muted)]/50 focus:border-[var(--accent)]";

export function CreateWorkloadModal({
  kind,
  open,
  namespace,
  onClose,
}: {
  kind: WorkloadKind;
  open: boolean;
  namespace: string;
  onClose: () => void;
}) {
  const currentContext = useClusterStore((state) => state.currentContext);
  const loadJobs = useClusterStore((state) => state.loadJobs);
  const loadCronJobs = useClusterStore((state) => state.loadCronJobs);
  const loadPods = useClusterStore((state) => state.loadPods);
  const loadClusterOverview = useClusterStore(
    (state) => state.loadClusterOverview,
  );
  const openInspector = useClusterStore((state) => state.openInspector);

  const defaultNamespace =
    namespace && namespace !== "all" ? namespace : "default";
  const [values, setValues] = React.useState<WorkloadCreateValues>({
    ...DEFAULT_WORKLOAD_VALUES,
    namespace: defaultNamespace,
  });
  const [tab, setTab] = React.useState<"form" | "yaml">("form");
  const [yaml, setYaml] = React.useState("");
  const [yamlDirty, setYamlDirty] = React.useState(false);
  const [capabilities, setCapabilities] =
    React.useState<ResourceCapabilities | null>(null);
  const [capabilityWarning, setCapabilityWarning] = React.useState<
    string | null
  >(null);
  const [isValidating, setIsValidating] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setValues({ ...DEFAULT_WORKLOAD_VALUES, namespace: defaultNamespace });
    setTab("form");
    setYaml("");
    setYamlDirty(false);
    setError(null);
    setCapabilities(null);
    setCapabilityWarning(null);
  }, [defaultNamespace, open]);

  React.useEffect(() => {
    if (!open || !currentContext) return;
    let cancelled = false;
    invokeRpc<ResourceCapabilities>("resources.capabilities", {
      contextName: currentContext,
      apiVersion: "batch/v1",
      kind,
      resource: RESOURCE_BY_KIND[kind],
      namespace: defaultNamespace,
    })
      .then((result) => {
        if (!cancelled) setCapabilities(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCapabilityWarning(
            err instanceof Error ? err.message : String(err),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentContext, defaultNamespace, kind, open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose, open]);

  if (!open) return null;

  const nameError = validateName(values.name.trim());
  const scheduleError =
    kind === "CronJob" ? validateSchedule(values.schedule) : null;
  const generatedYaml = buildWorkloadManifest(kind, values);
  const activeYaml = yamlDirty ? yaml : generatedYaml;
  const yamlMatchesKind =
    new RegExp(`^kind:\\s*${kind}\\s*$`, "m").test(activeYaml) &&
    /^apiVersion:\s*batch\/v1\s*$/m.test(activeYaml);
  const canCreate = capabilities?.create !== false;
  const canSubmit =
    !nameError &&
    !scheduleError &&
    yamlMatchesKind &&
    !isSaving &&
    canCreate &&
    Boolean(currentContext);

  const updateValue = <K extends keyof WorkloadCreateValues>(
    key: K,
    value: WorkloadCreateValues[K],
  ) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    if (yamlDirty) {
      setYamlDirty(false);
      setTab("form");
    }
  };

  const switchTab = (next: "form" | "yaml") => {
    if (next === "yaml") {
      if (!yamlDirty) setYaml(generatedYaml);
    } else if (yamlDirty) {
      setYamlDirty(false);
    }
    setTab(next);
  };

  const apply = async (dryRun: boolean) => {
    if (!currentContext || !canCreate) return;
    if (!dryRun && !canSubmit) return;
    if (dryRun) setIsValidating(true);
    else setIsSaving(true);
    setError(null);
    try {
      const result = await invokeRpc<ResourceApplyResult>("resources.apply", {
        contextName: currentContext,
        yaml: activeYaml,
        resource: RESOURCE_BY_KIND[kind],
        dryRun,
        mode: "create",
      });
      if (dryRun) {
        toast.success("Manifest is valid");
        return;
      }
      toast.success(`${result.kind} ${result.name} created`);
      await Promise.all([
        loadJobs(namespace),
        loadCronJobs(namespace),
        loadPods(namespace),
        loadClusterOverview(currentContext, namespace),
      ]);
      openInspector({
        kind: result.kind,
        name: result.name,
        namespace: result.namespace ?? values.namespace,
        status: "Pending",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (dryRun) setIsValidating(false);
      else setIsSaving(false);
    }
  };

  return (
    <div
      data-testid="create-workload-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workload-title"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => !isSaving && onClose()}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="create-workload-title"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Create {kind}
              </h2>
              <p className="text-[11px] text-[var(--muted)]">
                {defaultNamespace === "all" ? "default" : defaultNamespace} ·{" "}
                {currentContext || "no context"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close create workload dialog"
            className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex shrink-0 items-center gap-1 border-b border-[var(--border)] px-2 sm:px-4">
          {(
            [
              ["form", "Form", Plus],
              ["yaml", "Advanced YAML", Braces],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              data-testid={`create-workload-tab-${id}`}
              onClick={() => switchTab(id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer",
                tab === id
                  ? "border-[var(--accent)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {error && (
            <div className="flex items-start gap-2 border-l-2 border-rose-500/70 pl-3 text-[11px] text-rose-600 dark:text-rose-400">
              <AlertTriangle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          )}
          {capabilityWarning && (
            <div className="border-l-2 border-amber-500/60 pl-3 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
              Permission lookup unavailable; the API server will still authorize
              the request. {capabilityWarning}
            </div>
          )}
          {capabilities?.create === false && (
            <div
              data-testid="create-workload-capability"
              className="border-l-2 border-rose-500/70 pl-3 text-[11px] text-rose-600 dark:text-rose-400"
            >
              Your identity cannot create {kind}s in {defaultNamespace}.
              {capabilities.reasons?.create
                ? ` ${capabilities.reasons.create}`
                : ""}
            </div>
          )}

          {tab === "form" ? (
            <div className="space-y-4">
              {yamlDirty && (
                <p className="text-[10px] leading-relaxed text-amber-600 dark:text-amber-400">
                  Advanced YAML has been edited. Changing a form field will
                  regenerate the YAML and discard those edits.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Name" hint={nameError ?? undefined}>
                  <input
                    data-testid="create-workload-name"
                    value={values.name}
                    onChange={(event) =>
                      updateValue("name", event.target.value)
                    }
                    placeholder="e.g. cleanup-report"
                    className={inputClass}
                    autoFocus
                  />
                </FormField>
                <FormField label="Namespace">
                  <input
                    data-testid="create-workload-namespace"
                    value={values.namespace}
                    onChange={(event) =>
                      updateValue("namespace", event.target.value)
                    }
                    placeholder="default"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Container name">
                  <input
                    value={values.containerName}
                    onChange={(event) =>
                      updateValue("containerName", event.target.value)
                    }
                    placeholder="job"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Image">
                  <input
                    data-testid="create-workload-image"
                    value={values.image}
                    onChange={(event) =>
                      updateValue("image", event.target.value)
                    }
                    placeholder="busybox:1.36"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Command" hint="Comma-separated entries.">
                  <input
                    data-testid="create-workload-command"
                    value={values.command}
                    onChange={(event) =>
                      updateValue("command", event.target.value)
                    }
                    placeholder="sh"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Args" hint="Comma-separated entries.">
                  <input
                    data-testid="create-workload-args"
                    value={values.args}
                    onChange={(event) =>
                      updateValue("args", event.target.value)
                    }
                    placeholder="-c, echo hello"
                    className={inputClass}
                  />
                </FormField>
              </div>

              {kind === "CronJob" && (
                <div className="grid gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
                  <FormField label="Schedule" hint={scheduleError ?? undefined}>
                    <input
                      data-testid="create-workload-schedule"
                      value={values.schedule}
                      onChange={(event) =>
                        updateValue("schedule", event.target.value)
                      }
                      placeholder="*/5 * * * *"
                      className={inputClass}
                    />
                  </FormField>
                  <FormField
                    label="Time zone"
                    hint="Optional, e.g. Asia/Phnom_Penh."
                  >
                    <input
                      value={values.timeZone}
                      onChange={(event) =>
                        updateValue("timeZone", event.target.value)
                      }
                      placeholder="UTC"
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="Concurrency policy">
                    <select
                      value={values.concurrencyPolicy}
                      onChange={(event) =>
                        updateValue(
                          "concurrencyPolicy",
                          event.target
                            .value as WorkloadCreateValues["concurrencyPolicy"],
                        )
                      }
                      className={inputClass}
                    >
                      <option value="Forbid">Forbid</option>
                      <option value="Allow">Allow</option>
                      <option value="Replace">Replace</option>
                    </select>
                  </FormField>
                  <FormField label="History limits" hint="Successful / failed.">
                    <div className="flex items-center gap-2">
                      <input
                        value={values.successfulJobsHistoryLimit}
                        onChange={(event) =>
                          updateValue(
                            "successfulJobsHistoryLimit",
                            event.target.value,
                          )
                        }
                        className={inputClass}
                        placeholder="3"
                      />
                      <input
                        value={values.failedJobsHistoryLimit}
                        onChange={(event) =>
                          updateValue(
                            "failedJobsHistoryLimit",
                            event.target.value,
                          )
                        }
                        className={inputClass}
                        placeholder="1"
                      />
                    </div>
                  </FormField>
                  <FormField
                    label="Starting deadline"
                    hint="Seconds; optional."
                  >
                    <input
                      value={values.startingDeadlineSeconds}
                      onChange={(event) =>
                        updateValue(
                          "startingDeadlineSeconds",
                          event.target.value,
                        )
                      }
                      placeholder="200"
                      className={inputClass}
                    />
                  </FormField>
                </div>
              )}

              <div className="grid gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-3">
                <FormField label="Backoff limit">
                  <input
                    value={values.backoffLimit}
                    onChange={(event) =>
                      updateValue("backoffLimit", event.target.value)
                    }
                    placeholder="3"
                    className={inputClass}
                  />
                </FormField>
                {kind === "Job" && (
                  <>
                    <FormField label="Completions">
                      <input
                        value={values.completions}
                        onChange={(event) =>
                          updateValue("completions", event.target.value)
                        }
                        placeholder="1"
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Parallelism">
                      <input
                        value={values.parallelism}
                        onChange={(event) =>
                          updateValue("parallelism", event.target.value)
                        }
                        placeholder="1"
                        className={inputClass}
                      />
                    </FormField>
                  </>
                )}
                <FormField label="Restart policy">
                  <select
                    value={values.restartPolicy}
                    onChange={(event) =>
                      updateValue(
                        "restartPolicy",
                        event.target
                          .value as WorkloadCreateValues["restartPolicy"],
                      )
                    }
                    className={inputClass}
                  >
                    <option value="Never">Never</option>
                    <option value="OnFailure">OnFailure</option>
                  </select>
                </FormField>
                <FormField label="TTL after finish" hint="Seconds; optional.">
                  <input
                    value={values.ttlSecondsAfterFinished}
                    onChange={(event) =>
                      updateValue("ttlSecondsAfterFinished", event.target.value)
                    }
                    placeholder="3600"
                    className={inputClass}
                  />
                </FormField>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={values.suspend}
                  onChange={(event) =>
                    updateValue("suspend", event.target.checked)
                  }
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                Start suspended
              </label>
            </div>
          ) : (
            <YamlEditor
              value={activeYaml}
              onChange={(next) => {
                setYaml(next);
                setYamlDirty(true);
              }}
              onSubmit={() => void apply(false)}
              ariaLabel={`${kind} manifest preview`}
              testId="create-workload-yaml"
              className="h-[45vh] min-h-[300px]"
            />
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-5">
          <span className="font-mono text-[9px] text-[var(--muted)]">
            create-only · kubeview field manager
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="create-workload-cancel"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="create-workload-validate"
              onClick={() => void apply(true)}
              disabled={
                isValidating ||
                isSaving ||
                !canCreate ||
                Boolean(nameError) ||
                Boolean(scheduleError) ||
                !yamlMatchesKind
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50 cursor-pointer"
            >
              {isValidating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Validate
            </button>
            <button
              type="button"
              data-testid="create-workload-submit"
              onClick={() => void apply(false)}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create {kind}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
