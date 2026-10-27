"use client";

import { ClipboardList } from "lucide-react";
import type { PodDiagnosisResult } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";
import { statusMeta } from "../lib/diagnosis";

export function DiagnosisEvidenceList({
  result,
}: {
  result: PodDiagnosisResult;
}) {
  if (result.evidence.length === 0) return null;

  return (
    <section
      data-testid="pod-diagnosis-evidence"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)]">
        <ClipboardList className="h-3.5 w-3.5 text-[var(--accent)]" />
        Evidence collected
      </div>
      <div className="mt-2 divide-y divide-[var(--border)]/70">
        {result.evidence.map((item) => {
          const status = statusMeta(item.status);
          return (
            <div key={item.id} className="min-w-0 py-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate font-mono text-[10px] font-semibold text-[var(--foreground)]">
                  {item.label}
                </span>
                <StatusBeacon
                  size="xs"
                  variant={status.variant}
                  label={status.label}
                />
              </div>
              <p className="mt-0.5 break-words font-mono text-[10px] leading-relaxed text-[var(--muted)]">
                {item.summary}
              </p>
              {item.details && item.details.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {item.details.map((detail, index) => (
                    <pre
                      key={`${item.id}-${index}`}
                      className="whitespace-pre-wrap break-words font-mono text-[9px] leading-relaxed text-[var(--muted)]/80"
                    >
                      {detail}
                    </pre>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
