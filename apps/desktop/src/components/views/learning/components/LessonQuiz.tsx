"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonCheck } from "@/features/learning/types";

export function LessonQuiz({
  lessonId,
  check,
}: {
  lessonId: string;
  check: LessonCheck;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const answered = selected !== null;
  const isCorrect = selected === check.correctOptionId;

  return (
    <div
      data-testid={`learning-quiz-${lessonId}`}
      className="rounded-xl border border-[var(--border)] bg-black/[0.015] p-3.5 dark:bg-white/[0.02]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Check yourself
        </p>
        {answered && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium",
              isCorrect
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400",
            )}
          >
            {isCorrect ? (
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            ) : (
              <XCircle className="h-3 w-3" aria-hidden="true" />
            )}
            {isCorrect ? "Correct" : "Try another answer"}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[12px] font-medium text-[var(--foreground)]">
        {check.question}
      </p>
      <div className="mt-2.5 grid gap-1.5">
        {check.options.map((option, index) => {
          const isOptionCorrect = option.id === check.correctOptionId;
          const isSelected = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              data-testid={`learning-quiz-option-${lessonId}-${option.id}`}
              aria-pressed={isSelected}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                answered && isOptionCorrect
                  ? "border-emerald-500/35 bg-emerald-500/10 text-[var(--foreground)]"
                  : isSelected
                    ? "border-rose-500/35 bg-rose-500/10 text-[var(--foreground)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]/35 hover:text-[var(--foreground)]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono text-[9px]",
                  answered && isOptionCorrect
                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : isSelected
                      ? "border-rose-500/40 text-rose-600 dark:text-rose-400"
                      : "border-[var(--border)] text-[var(--muted)]",
                )}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className="leading-relaxed">{option.label}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <p
          aria-live="polite"
          className="mt-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--muted)]"
        >
          {check.explanation}
        </p>
      )}
    </div>
  );
}
