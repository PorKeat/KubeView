"use client";

import { AlertTriangle, Layers, Network } from "lucide-react";
import type { PermissionEffectiveResult } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";
import { PermissionBindingList } from "./PermissionBindingList";
import { PermissionRuleTable } from "./PermissionRuleTable";

function subjectLabel(result: PermissionEffectiveResult): string {
  const subject = result.subject;
  if (subject.kind === "ServiceAccount") {
    return `${subject.kind} ${subject.namespace}/${subject.name}`;
  }
  return `${subject.kind} ${subject.name}`;
}

export function PermissionEffectivePanel({
  result,
}: {
  result: PermissionEffectiveResult;
}) {
  return (
    <section
      data-testid="permission-effective"
      className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-[var(--accent)]" />
          <h2 className="text-[11px] font-semibold text-[var(--foreground)]">
            Effective permissions
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBeacon
            size="xs"
            variant="muted"
            label={`${result.bindings.length} bindings`}
          />
          <StatusBeacon
            size="xs"
            variant="muted"
            label={`${result.clusterRules.length + result.namespaceRules.length} rules`}
          />
          <span className="font-mono text-[9px] text-[var(--muted)]">
            {new Date(result.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)]/70 bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.02]">
        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
          Subject
        </span>
        <div className="mt-0.5 font-mono text-[11px] font-semibold text-[var(--foreground)]">
          {subjectLabel(result)}
        </div>
        {result.subject.groups && result.subject.groups.length > 0 && (
          <div className="mt-0.5 truncate font-mono text-[9px] text-[var(--muted)]">
            groups: {result.subject.groups.join(", ")}
          </div>
        )}
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Evaluation warnings
          </div>
          {result.warnings.map((warning, index) => (
            <p
              key={`${warning}-${index}`}
              className="mt-1 break-words font-mono text-[9px] leading-relaxed text-[var(--muted)]"
            >
              {warning}
            </p>
          ))}
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
          <Network className="h-3 w-3" />
          Namespace access
        </div>
        {result.namespaces.length === 0 ? (
          <p className="text-[10px] text-[var(--muted)]">
            No namespaced access was found. Cluster-scoped rules may still
            apply.
          </p>
        ) : (
          <div
            data-testid="permission-namespace-access"
            className="flex flex-wrap gap-1.5"
          >
            {result.namespaces.map((namespace) => (
              <span
                key={namespace.namespace}
                className="rounded-md border border-[var(--border)] bg-black/[0.03] px-2 py-1 font-mono text-[9px] text-[var(--foreground)] dark:bg-white/[0.03]"
                title={`verbs: ${namespace.verbs.join(", ")}`}
              >
                {namespace.namespace}
                {namespace.clusterWide ? " · cluster-wide" : ""}
                <span className="ml-1 text-[var(--muted)]">
                  {namespace.ruleCount} rules
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
          Cluster-wide rules
        </div>
        <PermissionRuleTable
          rules={result.clusterRules}
          empty="No cluster-scoped grants apply to this subject."
        />
      </div>

      <div>
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
          Namespaced rules
        </div>
        <PermissionRuleTable
          rules={result.namespaceRules}
          empty="No namespaced grants apply to this subject."
        />
      </div>

      <div>
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
          Matching bindings
        </div>
        <PermissionBindingList bindings={result.bindings} />
      </div>
    </section>
  );
}
