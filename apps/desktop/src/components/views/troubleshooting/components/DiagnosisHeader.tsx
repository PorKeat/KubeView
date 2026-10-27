"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import type { PodDiagnosisResult } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatGeneratedAt, severityMeta } from "../lib/diagnosis";

export function DiagnosisHeader({
  result,
  isLoading,
  onRefresh,
}: {
  result: PodDiagnosisResult | null;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const severity = result ? severityMeta(result.severity) : null;

  return (
    <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              Troubleshooting Assistant
            </h2>
            {severity && (
              <StatusBeacon
                size="xs"
                variant={severity.variant}
                label={severity.label}
                data-testid="pod-diagnosis-severity"
              />
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            Correlates pod status, events, logs, probes, and resource limits.
          </p>
          {result && (
            <span className="mt-1 block font-mono text-[9px] text-[var(--muted)]">
              Generated {formatGeneratedAt(result.generatedAt)}
              {result.nodeName ? ` · node ${result.nodeName}` : ""}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        data-testid="pod-diagnosis-refresh"
        onClick={onRefresh}
        disabled={isLoading}
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-wait disabled:opacity-60 sm:self-auto"
      >
        <RefreshCw
          className={cn("h-3 w-3", isLoading && "animate-spin")}
          aria-hidden="true"
        />
        <span>Refresh diagnosis</span>
      </button>
    </div>
  );
}
