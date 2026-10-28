"use client";

import * as React from "react";
import { ScanSearch, ShieldCheck } from "lucide-react";
import type { PermissionOperation } from "@kubeview/contracts";

const VERBS = [
  "get",
  "list",
  "watch",
  "create",
  "update",
  "patch",
  "delete",
  "deletecollection",
];

interface OperationFormState {
  namespace: string;
  verb: string;
  apiGroup: string;
  resource: string;
  subresource: string;
  resourceName: string;
  nonResourceURL: string;
  clusterScoped: boolean;
}

function initialState(defaultNamespace: string): OperationFormState {
  return {
    namespace: defaultNamespace,
    verb: "get",
    apiGroup: "",
    resource: "pods",
    subresource: "",
    resourceName: "",
    nonResourceURL: "",
    clusterScoped: false,
  };
}

const fieldClass =
  "w-full rounded-lg border border-[var(--border)] bg-slate-50 px-2 py-1.5 font-mono text-[11px] text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30";
const labelClass =
  "block font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]";

export function PermissionCheckForm({
  defaultNamespace,
  initialOperation,
  isChecking,
  onCheck,
}: {
  defaultNamespace: string;
  initialOperation?: PermissionOperation;
  isChecking: boolean;
  onCheck: (operation: PermissionOperation) => void;
}) {
  const [operation, setOperation] = React.useState<OperationFormState>(() =>
    initialState(defaultNamespace),
  );

  React.useEffect(() => {
    setOperation((current) => ({
      ...current,
      namespace: defaultNamespace,
    }));
  }, [defaultNamespace]);

  React.useEffect(() => {
    if (!initialOperation) return;
    setOperation({
      namespace: initialOperation.namespace ?? defaultNamespace,
      verb: initialOperation.verb || "get",
      apiGroup: initialOperation.apiGroup ?? "",
      resource: initialOperation.resource ?? "",
      subresource: initialOperation.subresource ?? "",
      resourceName: initialOperation.resourceName ?? "",
      nonResourceURL: initialOperation.nonResourceURL ?? "",
      clusterScoped: Boolean(initialOperation.clusterScoped),
    });
  }, [initialOperation, defaultNamespace]);

  const update = <K extends keyof OperationFormState>(
    key: K,
    value: OperationFormState[K],
  ) => setOperation((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onCheck({
      namespace: operation.clusterScoped
        ? undefined
        : operation.namespace.trim() || undefined,
      verb: operation.verb,
      apiGroup: operation.apiGroup.trim() || undefined,
      resource: operation.nonResourceURL.trim()
        ? undefined
        : operation.resource.trim() || undefined,
      subresource: operation.subresource.trim() || undefined,
      resourceName: operation.resourceName.trim() || undefined,
      nonResourceURL: operation.nonResourceURL.trim() || undefined,
      clusterScoped: operation.clusterScoped,
    });
  };

  return (
    <form
      data-testid="permission-check-form"
      onSubmit={submit}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)]">
        <ScanSearch className="h-3.5 w-3.5 text-[var(--accent)]" />
        Check an operation
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
        Evaluates RBAC locally, then asks the cluster with a SubjectAccessReview
        when permitted.
      </p>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1">
          <span className={labelClass}>Namespace</span>
          <input
            data-testid="permission-check-namespace"
            value={operation.namespace}
            onChange={(event) => update("namespace", event.target.value)}
            disabled={operation.clusterScoped}
            placeholder="default"
            className={fieldClass}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Verb</span>
          <select
            data-testid="permission-check-verb"
            value={operation.verb}
            onChange={(event) => update("verb", event.target.value)}
            className={fieldClass}
          >
            {VERBS.map((verb) => (
              <option key={verb} value={verb}>
                {verb}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Resource</span>
          <input
            data-testid="permission-check-resource"
            value={operation.resource}
            onChange={(event) => update("resource", event.target.value)}
            placeholder="pods"
            className={fieldClass}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>API group</span>
          <input
            data-testid="permission-check-api-group"
            value={operation.apiGroup}
            onChange={(event) => update("apiGroup", event.target.value)}
            placeholder="core API (blank)"
            className={fieldClass}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Subresource</span>
          <input
            data-testid="permission-check-subresource"
            value={operation.subresource}
            onChange={(event) => update("subresource", event.target.value)}
            placeholder="optional, e.g. logs"
            className={fieldClass}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Resource name</span>
          <input
            data-testid="permission-check-resource-name"
            value={operation.resourceName}
            onChange={(event) => update("resourceName", event.target.value)}
            placeholder="optional, e.g. my-pod"
            className={fieldClass}
          />
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className={labelClass}>Non-resource URL</span>
          <input
            data-testid="permission-check-non-resource"
            value={operation.nonResourceURL}
            onChange={(event) => update("nonResourceURL", event.target.value)}
            placeholder="optional, e.g. /healthz"
            className={fieldClass}
          />
        </label>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--muted)]">
          <input
            data-testid="permission-check-cluster-scoped"
            type="checkbox"
            checked={operation.clusterScoped}
            onChange={(event) => update("clusterScoped", event.target.checked)}
            className="h-3 w-3 rounded border-[var(--border)] accent-[var(--accent)]"
          />
          Cluster-scoped request
        </label>
        <button
          type="submit"
          data-testid="permission-check"
          disabled={
            isChecking ||
            (!operation.nonResourceURL.trim() && !operation.resource.trim())
          }
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-50"
        >
          <ShieldCheck className="h-3 w-3" />
          {isChecking ? "Checking..." : "Check access"}
        </button>
      </div>
    </form>
  );
}
