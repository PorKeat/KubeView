"use client";

import type { PermissionBindingEvidence } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";

export function PermissionBindingList({
  bindings,
  empty = "No matching RBAC bindings.",
}: {
  bindings: PermissionBindingEvidence[];
  empty?: string;
}) {
  if (bindings.length === 0) {
    return <p className="text-[10px] text-[var(--muted)]">{empty}</p>;
  }

  return (
    <div className="space-y-1.5">
      {bindings.map((binding) => (
        <div
          key={`${binding.kind}-${binding.namespace ?? ""}-${binding.name}`}
          className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-[var(--border)]/70 bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.02]"
        >
          <StatusBeacon size="xs" variant="muted" label={binding.kind} />
          <span className="min-w-0 truncate font-mono text-[10px] font-semibold text-[var(--foreground)]">
            {binding.name}
          </span>
          {binding.namespace && (
            <span className="font-mono text-[9px] text-[var(--muted)]">
              ns: {binding.namespace}
            </span>
          )}
          <span className="font-mono text-[9px] text-[var(--muted)]">
            → {binding.roleKind}/{binding.roleName}
          </span>
          <span className="w-full truncate font-mono text-[9px] text-[var(--muted)]">
            subjects:{" "}
            {binding.subjects.length > 0
              ? binding.subjects
                  .map(
                    (subject) =>
                      `${subject.kind}:${subject.name}${
                        subject.namespace ? `/${subject.namespace}` : ""
                      }`,
                  )
                  .join(", ")
              : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
