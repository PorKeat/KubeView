"use client";

import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";
import {
  LEARNING_LEVEL_LABELS,
  type LearningLevel,
} from "@/features/learning/types";

const LEVELS: LearningLevel[] = ["beginner", "intermediate", "advanced"];

export function LearningModeControls({
  testIdPrefix = "learning",
  className,
  compact = false,
}: {
  testIdPrefix?: string;
  className?: string;
  compact?: boolean;
}) {
  const learningMode = useLearningStore((state) => state.learningMode);
  const level = useLearningStore((state) => state.level);
  const setLearningMode = useLearningStore((state) => state.setLearningMode);
  const setLevel = useLearningStore((state) => state.setLevel);

  return (
    <div
      data-testid={`${testIdPrefix}-controls`}
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs",
        compact ? "p-2.5" : "p-3.5",
        className,
      )}
    >
      <div
        className={cn(
          "flex justify-between gap-3",
          compact ? "items-center" : "items-start",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 gap-2.5",
            compact ? "items-center" : "items-start",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]",
              compact ? "h-6 w-6" : "mt-0.5 h-7 w-7",
            )}
          >
            <GraduationCap
              className={compact ? "h-3 w-3" : "h-3.5 w-3.5"}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "font-semibold text-[var(--foreground)]",
                compact ? "text-[10px]" : "text-[11px]",
              )}
            >
              Learning mode
            </p>
            <p
              className={cn(
                "mt-0.5 leading-relaxed text-[var(--muted)]",
                compact ? "text-[9px]" : "text-[10px]",
              )}
            >
              {compact
                ? learningMode
                  ? "Guides on"
                  : "Guides off"
                : learningMode
                  ? "Plain-language guides and field help are shown while you work."
                  : "Contextual guides are hidden. The Learning Center stays available."}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={learningMode}
          aria-label="Learning mode"
          data-testid={`${testIdPrefix}-mode-toggle`}
          onClick={() => setLearningMode(!learningMode)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
            learningMode
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[var(--border)] bg-black/10 dark:bg-white/10",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
              learningMode ? "translate-x-[22px]" : "translate-x-[3px]",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className={compact ? "mt-2" : "mt-3"}>
        <div
          role="group"
          aria-label="Explanation depth"
          className={cn(
            "grid grid-cols-3 gap-1 rounded-lg border border-[var(--border)] bg-black/[0.025] dark:bg-white/[0.03]",
            compact ? "p-0.5" : "p-1",
          )}
        >
          {LEVELS.map((option) => {
            const isActive = level === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isActive}
                data-testid={`${testIdPrefix}-level-${option}`}
                onClick={() => setLevel(option)}
                className={cn(
                  "rounded-md font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                  compact
                    ? "px-1.5 py-1 text-[9px]"
                    : "px-2 py-1.5 text-[10px]",
                  isActive
                    ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-2xs"
                    : "border border-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {LEARNING_LEVEL_LABELS[option].shortLabel}
              </button>
            );
          })}
        </div>
        {!compact && (
          <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
            {LEARNING_LEVEL_LABELS[level].description}
          </p>
        )}
      </div>
    </div>
  );
}
