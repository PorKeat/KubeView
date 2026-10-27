"use client";

import { Wrench } from "lucide-react";
import type { PodDiagnosisResult } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";
import { severityMeta } from "../lib/diagnosis";

export function DiagnosisFixes({ result }: { result: PodDiagnosisResult }) {
  if (result.suggestedFixes.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)]">
          <Wrench className="h-3.5 w-3.5 text-[var(--accent)]" />
          Suggested fixes
        </div>
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          No remediation is suggested for this pod.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="pod-diagnosis-fixes"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)]">
        <Wrench className="h-3.5 w-3.5 text-[var(--accent)]" />
        Suggested fixes
      </div>
      <div className="mt-2 space-y-2">
        {result.suggestedFixes.map((fix) => {
          const severity = severityMeta(fix.severity);
          return (
            <div
              key={fix.id}
              className="rounded-lg border border-[var(--border)]/80 bg-black/[0.02] p-2.5 dark:bg-white/[0.02]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--foreground)]">
                  {fix.title}
                </span>
                <StatusBeacon
                  size="xs"
                  variant={severity.variant}
                  label={severity.label}
                />
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
                {fix.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
