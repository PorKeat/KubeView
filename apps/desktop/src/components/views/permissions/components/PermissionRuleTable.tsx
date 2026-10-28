"use client";

import type { PermissionRuleEvidence } from "@kubeview/contracts";

function list(values: string[] | null | undefined, fallback = "—"): string {
  return values && values.length > 0 ? values.join(", ") : fallback;
}

function source(rule: PermissionRuleEvidence): string {
  const scope =
    rule.scope === "cluster" ? "Cluster" : rule.namespace || "Namespace";
  return `${scope} · ${rule.bindingKind} ${rule.bindingName}`;
}

export function PermissionRuleTable({
  rules,
  empty = "No effective rules.",
}: {
  rules: PermissionRuleEvidence[];
  empty?: string;
}) {
  if (rules.length === 0) {
    return <p className="text-[10px] text-[var(--muted)]">{empty}</p>;
  }

  return (
    <div
      data-testid="permission-rule-table"
      className="overflow-x-auto rounded-lg border border-[var(--border)]"
    >
      <table className="w-full min-w-[680px] text-left text-[10px]">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-hover)]/40 text-[9px] uppercase tracking-wider text-[var(--muted)]">
          <tr>
            <th className="px-2.5 py-2 font-medium">Scope</th>
            <th className="px-2.5 py-2 font-medium">Role</th>
            <th className="px-2.5 py-2 font-medium">Verbs</th>
            <th className="px-2.5 py-2 font-medium">Resources</th>
            <th className="px-2.5 py-2 font-medium">API groups</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]/70">
          {rules.map((rule) => (
            <tr
              key={`${rule.bindingKind}-${rule.bindingName}-${rule.ruleIndex}`}
            >
              <td className="max-w-[160px] px-2.5 py-2 font-mono text-[var(--muted)]">
                {source(rule)}
              </td>
              <td className="px-2.5 py-2 font-mono text-[var(--foreground)]">
                {rule.roleKind}/{rule.roleName}
              </td>
              <td className="px-2.5 py-2 font-mono text-emerald-600 dark:text-emerald-400">
                {list(rule.verbs)}
              </td>
              <td className="px-2.5 py-2 font-mono text-[var(--foreground)]">
                {list(rule.resources, list(rule.nonResourceURLs))}
                {rule.resourceNames.length > 0
                  ? ` · names: ${list(rule.resourceNames)}`
                  : ""}
              </td>
              <td className="px-2.5 py-2 font-mono text-[var(--muted)]">
                {rule.apiGroups.length > 0
                  ? `groups: ${list(rule.apiGroups)}`
                  : "core API"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
