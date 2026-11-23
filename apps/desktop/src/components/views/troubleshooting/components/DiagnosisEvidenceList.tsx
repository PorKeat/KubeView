"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  MinusCircle,
  XCircle,
} from "lucide-react";
import type {
  PodDiagnosisEvidence,
  PodDiagnosisResult,
  PodDiagnosisStatus,
} from "@kubeview/contracts";
import { cn } from "@/lib/utils";
import { statusMeta } from "../lib/diagnosis";

const statusIcon: Record<
  PodDiagnosisStatus,
  { Icon: typeof CheckCircle2; className: string }
> = {
  pass: {
    Icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    Icon: AlertTriangle,
    className: "text-amber-600 dark:text-amber-400",
  },
  fail: {
    Icon: XCircle,
    className: "text-rose-600 dark:text-rose-400",
  },
  skipped: {
    Icon: MinusCircle,
    className: "text-[var(--muted)]",
  },
};

const NOISE_DETAILS = new Set(["", ":", "No condition message."]);

function visibleDetails(item: PodDiagnosisEvidence): string[] {
  return (item.details ?? [])
    .map((detail) => detail.trim())
    .filter(
      (detail) => !NOISE_DETAILS.has(detail) && !/^[:;,\-–—]+$/.test(detail),
    );
}

function summaryText(item: PodDiagnosisEvidence): string | null {
  const summary = item.summary.trim();
  if (!summary) return null;

  // Condition summaries repeat the label ("Ready=True"). The status column
  // already reports the outcome, so the condition name is enough.
  if (item.id.startsWith("condition-")) return null;

  const labelPrefix = `${item.label}=`;
  return summary.startsWith(labelPrefix)
    ? summary.slice(labelPrefix.length)
    : summary;
}

function EvidenceRow({ item }: { item: PodDiagnosisEvidence }) {
  const status = statusMeta(item.status);
  const { Icon, className } = statusIcon[item.status];
  const summary = summaryText(item);
  const details = visibleDetails(item);

  return (
    <li className="flex min-w-0 items-start gap-2 py-1.5">
      <Icon
        className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", className)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <span className="min-w-0 break-words text-[11px] font-medium leading-snug text-[var(--foreground)]">
            {item.label}
          </span>
          <span className={cn("shrink-0 text-[10px] font-semibold", className)}>
            {status.label}
          </span>
        </div>
        {summary && (
          <p className="mt-0.5 break-words font-mono text-[10px] leading-relaxed text-[var(--muted)]">
            {summary}
          </p>
        )}
        {details.length > 0 && (
          <p className="mt-0.5 whitespace-pre-line break-words font-mono text-[10px] leading-relaxed text-[var(--muted)]">
            {details.join("\n")}
          </p>
        )}
      </div>
    </li>
  );
}

function EvidenceGroup({
  title,
  items,
}: {
  title: string;
  items: PodDiagnosisEvidence[];
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-[var(--muted)]">
        {title}
      </div>
      <ul className="mt-0.5 divide-y divide-[var(--border)]/60">
        {items.map((item, index) => (
          <EvidenceRow key={`${item.id}-${index}`} item={item} />
        ))}
      </ul>
    </div>
  );
}

export function DiagnosisEvidenceList({
  result,
}: {
  result: PodDiagnosisResult;
}) {
  if (result.evidence.length === 0) return null;

  const passed = result.evidence.filter((item) => item.status === "pass");
  const attention = result.evidence.filter((item) => item.status !== "pass");
  const hasFailure = attention.some((item) => item.status === "fail");
  const mixed = passed.length > 0 && attention.length > 0;

  return (
    <section
      data-testid="pod-diagnosis-evidence"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
    >
      <div className="flex items-center gap-2">
        <ClipboardList
          className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
          aria-hidden="true"
        />
        <h3 className="text-[11px] font-semibold text-[var(--foreground)]">
          Evidence collected
        </h3>
        <span
          className={cn(
            "ml-auto shrink-0 font-mono text-[10px]",
            attention.length === 0
              ? "text-emerald-600 dark:text-emerald-400"
              : hasFailure
                ? "text-rose-600 dark:text-rose-400"
                : "text-amber-600 dark:text-amber-400",
          )}
        >
          {attention.length === 0
            ? `All ${passed.length} passed`
            : `${attention.length} need attention`}
        </span>
      </div>

      {mixed ? (
        <div className="mt-2 space-y-2.5">
          <EvidenceGroup title="Needs attention" items={attention} />
          <EvidenceGroup title="Passed checks" items={passed} />
        </div>
      ) : (
        <ul className="mt-1.5 divide-y divide-[var(--border)]/60">
          {result.evidence.map((item, index) => (
            <EvidenceRow key={`${item.id}-${index}`} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
