"use client";

import type { GitOpsResourceDrift } from "@kubeview/contracts";
import { gitOpsStatusTone } from "../hooks/useGitOps";

function key(resource: GitOpsResourceDrift): string {
  return `${resource.apiVersion}/${resource.kind}/${resource.namespace ?? ""}/${resource.name}`;
}

export function GitOpsResourceTable({
  resources,
  selectedKey,
  onSelect,
}: {
  resources: GitOpsResourceDrift[];
  selectedKey: string | null;
  onSelect: (resource: GitOpsResourceDrift) => void;
}) {
  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center">
        <p className="text-[11px] font-medium text-[var(--foreground)]">
          No Kubernetes manifests found
        </p>
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          Check the repository path and confirm it contains .yaml or .yml
          resources.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="gitops-resource-table"
      className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]"
    >
      <table className="w-full min-w-[680px] text-left text-[10px]">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-hover)]/40 text-[9px] uppercase tracking-wider text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Kind</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Namespace</th>
            <th className="px-3 py-2 font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]/70">
          {resources.map((resource) => {
            const tone = gitOpsStatusTone(resource.status);
            const resourceKey = key(resource);
            return (
              <tr
                key={resourceKey}
                data-testid="gitops-resource-row"
                onClick={() => onSelect(resource)}
                className={`cursor-pointer transition-colors hover:bg-[var(--surface-hover)] ${
                  selectedKey === resourceKey ? "bg-[var(--accent)]/5" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] font-medium ${tone.className}`}
                  >
                    {tone.label}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[var(--foreground)]">
                  {resource.kind}
                </td>
                <td className="px-3 py-2 font-mono text-[var(--foreground)]">
                  {resource.name}
                </td>
                <td className="px-3 py-2 font-mono text-[var(--muted)]">
                  {resource.namespace || "Cluster"}
                </td>
                <td
                  className="max-w-[220px] truncate px-3 py-2 font-mono text-[9px] text-[var(--muted)]"
                  title={resource.sourceFile}
                >
                  {resource.sourceFile}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
