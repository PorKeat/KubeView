"use client";

import * as React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Braces,
  ClipboardList,
  FileCode,
  LockKeyhole,
  RotateCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { YamlEditor } from "@/components/editor/YamlEditor";
import { useClusterStore } from "@/stores/clusterStore";
import { cn } from "@/lib/utils";
import {
  buildCreateFormManifest,
  createFormSpecFor,
  initialCreateFormValues,
  type CreateFormSpec,
  type CreateFormValues,
} from "@/lib/resourceCreateForms";

const NAME_PATTERN = /^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/;

function validateCreateName(value: string): string | null {
  const name = value.trim();
  if (!name) return "Name is required.";
  if (name.length > 253) return "Use 253 characters or fewer.";
  if (!NAME_PATTERN.test(name)) {
    return "Use lowercase letters, numbers, dots, and hyphens; start and end with a letter or number.";
  }
  return null;
}

function CreateFormFields({
  spec,
  values,
  showNamespace,
  nameError,
  specError,
  onChange,
}: {
  spec: CreateFormSpec;
  values: CreateFormValues;
  showNamespace: boolean;
  nameError: string | null;
  specError: string | null;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">
            Name
          </span>
          <input
            value={values.name ?? ""}
            onChange={(event) => onChange("name", event.target.value)}
            autoFocus
            data-testid="create-resource-name"
            aria-invalid={Boolean(nameError)}
            className={cn(
              "h-9 w-full rounded-lg border bg-[var(--background)] px-2.5 font-mono text-xs text-[var(--foreground)] outline-hidden transition-colors focus:border-[var(--accent)]",
              nameError ? "border-rose-500/50" : "border-[var(--border)]",
            )}
          />
          {nameError ? (
            <span className="mt-1 block text-[10px] text-rose-500">
              {nameError}
            </span>
          ) : (
            <span className="mt-1 block text-[9px] text-[var(--muted)]">
              Lowercase DNS name. Dots are allowed for cluster-scoped names.
            </span>
          )}
        </label>
        {showNamespace && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">
              Namespace
            </span>
            <input
              value={values.namespace ?? ""}
              onChange={(event) => onChange("namespace", event.target.value)}
              data-testid="create-resource-namespace"
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 font-mono text-xs text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
            />
          </label>
        )}
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">
            Labels{" "}
            <span className="font-normal text-[var(--muted)]">(optional)</span>
          </span>
          <textarea
            value={values.labels ?? ""}
            onChange={(event) => onChange("labels", event.target.value)}
            rows={2}
            spellCheck={false}
            placeholder={"team=payments\nenvironment=staging"}
            data-testid="create-resource-labels"
            className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
          />
          <span className="mt-1 block text-[9px] text-[var(--muted)]">
            One key=value pair per line.
          </span>
        </label>
      </div>

      {spec.fields.length > 0 && (
        <div className="space-y-3 border-t border-[var(--border)] pt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {spec.fields.length} {spec.fields.length === 1 ? "field" : "fields"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {spec.fields.map((field) => {
              const value = values[field.key] ?? "";
              const isWide = field.type === "textarea";
              return (
                <label
                  key={field.key}
                  className={cn("block", isWide && "sm:col-span-2")}
                >
                  <span className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">
                    {field.label}
                  </span>
                  {field.type === "select" ? (
                    <select
                      value={value}
                      onChange={(event) =>
                        onChange(field.key, event.target.value)
                      }
                      data-testid={`create-resource-field-${field.key}`}
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 font-mono text-xs text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={value}
                      onChange={(event) =>
                        onChange(field.key, event.target.value)
                      }
                      rows={4}
                      spellCheck={false}
                      placeholder={field.placeholder}
                      data-testid={`create-resource-field-${field.key}`}
                      className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
                    />
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={value}
                      onChange={(event) =>
                        onChange(field.key, event.target.value)
                      }
                      placeholder={field.placeholder}
                      data-testid={`create-resource-field-${field.key}`}
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 font-mono text-xs text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)]/60 focus:border-[var(--accent)]"
                    />
                  )}
                  {field.hint && (
                    <span className="mt-1 block text-[9px] leading-relaxed text-[var(--muted)]">
                      {field.hint}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {specError && (
        <p role="alert" className="text-[10px] text-rose-500">
          {specError}
        </p>
      )}
    </div>
  );
}

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

  const [tab, setTab] = React.useState<"form" | "yaml">("form");
  const [formValues, setFormValues] = React.useState<CreateFormValues>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = React.useState(false);
  const createSpec = React.useMemo(
    () =>
      resourceEditorTarget?.mode === "create"
        ? createFormSpecFor(resourceEditorTarget)
        : null,
    [resourceEditorTarget],
  );
  const generatedFormYaml = React.useMemo(
    () =>
      resourceEditorTarget?.mode === "create"
        ? buildCreateFormManifest(resourceEditorTarget, formValues)
        : "",
    [formValues, resourceEditorTarget],
  );

  React.useEffect(() => {
    if (!resourceEditorTarget) return;
    if (resourceEditorTarget.mode !== "create") {
      setTab("yaml");
      setShowDiscardConfirm(false);
      return;
    }
    setFormValues(initialCreateFormValues(resourceEditorTarget));
    setTab("form");
    setShowDiscardConfirm(false);
  }, [resourceEditorTarget]);

  React.useEffect(() => {
    if (
      !resourceEditorTarget ||
      resourceEditorTarget.mode !== "create" ||
      tab !== "form" ||
      formValues.name === undefined
    ) {
      return;
    }
    setResourceEditorYaml(generatedFormYaml);
  }, [
    formValues.name,
    generatedFormYaml,
    resourceEditorTarget,
    setResourceEditorYaml,
    tab,
  ]);

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
  const formNameError =
    isCreate && createSpec ? validateCreateName(formValues.name ?? "") : null;
  const formSpecError =
    isCreate && createSpec ? (createSpec.validate?.(formValues) ?? null) : null;
  const formBlocks =
    isCreate && Boolean(createSpec) && tab === "form"
      ? Boolean(formNameError || formSpecError)
      : false;

  const yamlDiffers =
    isCreate &&
    Boolean(createSpec) &&
    tab === "yaml" &&
    resourceEditorYaml !== generatedFormYaml;

  const switchTab = (next: "form" | "yaml") => {
    if (!isCreate || !createSpec) return;
    if (next === "yaml") {
      setShowDiscardConfirm(false);
      setResourceEditorYaml(generatedFormYaml);
      setTab("yaml");
      return;
    }
    if (yamlDiffers) {
      setShowDiscardConfirm(true);
      return;
    }
    setShowDiscardConfirm(false);
    setTab("form");
  };

  const updateFormValue = (key: string, value: string) => {
    setFormValues((previous) => ({ ...previous, [key]: value }));
  };
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
      formBlocks ||
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
          {isCreate && createSpec && (
            <div className="flex items-center gap-1 border-b border-[var(--border)]">
              {(
                [
                  ["form", "Form", ClipboardList],
                  ["yaml", "Advanced YAML", Braces],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`create-resource-tab-${id}`}
                  onClick={() => switchTab(id)}
                  disabled={isResourceEditorSaving}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors disabled:opacity-50",
                    tab === id
                      ? "border-[var(--accent)] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
              <span className="ml-auto hidden pb-1 font-mono text-[9px] text-[var(--muted)] lg:block">
                Form changes generate YAML live.
              </span>
            </div>
          )}

          {showDiscardConfirm && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <span className="text-[11px] text-amber-700 dark:text-amber-400">
                Discard Advanced YAML edits and regenerate from the form fields?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="create-resource-discard-yaml"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    setTab("form");
                  }}
                  className="rounded-md bg-amber-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-amber-500 cursor-pointer"
                >
                  Discard edits
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
                >
                  Keep editing
                </button>
              </div>
            </div>
          )}

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

          {isCreate && createSpec && tab === "form" ? (
            <CreateFormFields
              spec={createSpec}
              values={formValues}
              showNamespace={Boolean(target.namespace)}
              nameError={formNameError}
              specError={formSpecError}
              onChange={updateFormValue}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-[var(--muted)]">
                <span>
                  kubeview field manager · managedFields stripped on read
                </span>
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
            </>
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
                formBlocks ||
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
                formBlocks ||
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
