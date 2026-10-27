"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PodDiagnosisResult } from "@kubeview/contracts";
import { cn } from "@/lib/utils";
import { issueSeverityClasses, severityMeta } from "../lib/diagnosis";

export function DiagnosisSummary({ result }: { result: PodDiagnosisResult }) {
  const severity = severityMeta(result.severity);
  const healthy = result.healthy;

  return (
    <section
      data-testid="pod-diagnosis-summary"
      className={cn(
        "rounded-xl border p-3.5 shadow-xs",
        issueSeverityClasses(result.severity),
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
            healthy
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
              : "border-rose-500/25 bg-rose-500/10 text-rose-500",
          )}
        >
          {healthy ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold text-[var(--foreground)]">
              {result.title}
            </h3>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
              {severity.label} · {result.issueType}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--foreground)]">
            {result.summary}
          </p>
          <div className="mt-2 rounded-lg border border-[var(--border)]/70 bg-black/[0.03] px-2.5 py-2 dark:bg-black/20">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
              Root cause
            </span>
            <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-[var(--foreground)]">
              {result.rootCause}
            </p>
          </div>
          {(result.ownerKind || result.ownerName) && (
            <div className="mt-2 font-mono text-[9px] text-[var(--muted)]">
              owner: {result.ownerKind || "—"}
              {result.ownerName ? `/${result.ownerName}` : ""}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
