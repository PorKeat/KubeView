"use client";

import { AlertTriangle, ShieldCheck, ShieldX } from "lucide-react";
import type { PermissionDecision } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";
import { PermissionBindingList } from "./PermissionBindingList";
import { PermissionRuleTable } from "./PermissionRuleTable";

export function PermissionDecisionPanel({
  decision,
}: {
  decision: PermissionDecision;
}) {
  const variant = decision.allowed ? "healthy" : "critical";

  return (
    <section
      data-testid="permission-decision"
      className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs"
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${
          decision.allowed
            ? "border-emerald-500/25 bg-emerald-500/5"
            : "border-rose-500/25 bg-rose-500/5"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {decision.allowed ? (
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ShieldX className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          )}
          <div>
            <div className="text-sm font-semibold text-[var(--foreground)]">
              {decision.allowed ? "Operation allowed" : "Operation denied"}
            </div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
              reason: {decision.reason}
            </div>
          </div>
        </div>
        <StatusBeacon
          size="sm"
          variant={variant}
          label={decision.allowed ? "allowed" : "denied"}
        />
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--foreground)]">
        {decision.summary}
      </p>

      {decision.sar && (
        <div className="rounded-lg border border-[var(--border)]/70 bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
              SubjectAccessReview
            </span>
            <StatusBeacon
              size="xs"
              variant={decision.sar.allowed ? "healthy" : "critical"}
              label={decision.sar.allowed ? "allowed" : "denied"}
            />
            <StatusBeacon
              size="xs"
              variant={decision.sar.authoritative ? "muted" : "warning"}
              label={
                decision.sar.authoritative ? "authoritative" : "advisory only"
              }
            />
          </div>
          {decision.sar.reason && (
            <div className="mt-1 break-words font-mono text-[9px] text-[var(--muted)]">
              {decision.sar.reason}
            </div>
          )}
          {decision.sar.evaluationError && (
            <div className="mt-1 break-words font-mono text-[9px] text-rose-600 dark:text-rose-400">
              {decision.sar.evaluationError}
            </div>
          )}
        </div>
      )}

      {decision.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Warnings
          </div>
          {decision.warnings.map((warning, index) => (
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
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
          Matched rules ({decision.matchedRules.length})
        </div>
        <PermissionRuleTable
          rules={decision.matchedRules}
          empty="No RBAC rule matched this operation."
        />
      </div>

      <div>
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
          Matched bindings ({decision.matchedBindings.length})
        </div>
        <PermissionBindingList
          bindings={decision.matchedBindings}
          empty="No binding attaches this subject to a matching role."
        />
      </div>
    </section>
  );
}
