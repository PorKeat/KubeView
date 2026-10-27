"use client";

import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { ErrorBanner } from "@/components/ui";
import { DiagnosisCommands } from "./components/DiagnosisCommands";
import { DiagnosisContainers } from "./components/DiagnosisContainers";
import { DiagnosisEvents } from "./components/DiagnosisEvents";
import { DiagnosisEvidenceList } from "./components/DiagnosisEvidenceList";
import { DiagnosisFixes } from "./components/DiagnosisFixes";
import { DiagnosisHeader } from "./components/DiagnosisHeader";
import { DiagnosisSummary } from "./components/DiagnosisSummary";
import { usePodDiagnosis } from "./hooks/usePodDiagnosis";

export interface PodTroubleshootingAssistantProps {
  contextName?: string;
  namespace: string;
  podName: string;
}

export function PodTroubleshootingAssistant({
  contextName,
  namespace,
  podName,
}: PodTroubleshootingAssistantProps) {
  const { result, isLoading, error, refresh } = usePodDiagnosis({
    contextName,
    namespace,
    podName,
  });

  return (
    <div
      data-testid="pod-troubleshooting-assistant"
      className="space-y-3 text-xs"
    >
      <DiagnosisHeader
        result={result}
        isLoading={isLoading}
        onRefresh={() => void refresh()}
      />

      {error && result && (
        <ErrorBanner
          message={`Diagnosis refresh failed: ${error}`}
          actionLabel="Retry"
          onAction={() => void refresh()}
        />
      )}

      {!result && isLoading && (
        <div
          data-testid="pod-diagnosis-loading"
          className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)]">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-[var(--accent)]" />
            Correlating pod evidence...
          </div>
          <div className="h-14 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
          <div className="h-20 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
        </div>
      )}

      {!result && !isLoading && error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.04] p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
            Unable to build a diagnosis
          </div>
          <p className="mt-1 break-words font-mono text-[10px] leading-relaxed text-[var(--muted)]">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--foreground)]"
          >
            <RefreshCw className="h-3 w-3" />
            Retry diagnosis
          </button>
        </div>
      )}

      {!result && !isLoading && !error && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[10px] text-[var(--muted)]">
          No diagnosis is available for this pod.
        </div>
      )}

      {result && (
        <>
          <DiagnosisSummary result={result} />
          <DiagnosisFixes result={result} />
          <DiagnosisEvidenceList result={result} />
          <DiagnosisContainers containers={result.containers} />
          <DiagnosisEvents events={result.events} />
          <DiagnosisCommands commands={result.suggestedCommands} />
        </>
      )}
    </div>
  );
}
