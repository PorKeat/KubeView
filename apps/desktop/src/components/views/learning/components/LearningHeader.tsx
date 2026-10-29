"use client";

import { CheckCircle2, Clock3, GraduationCap } from "lucide-react";
import { LearningModeControls } from "@/components/learning/LearningModeControls";
import {
  LEARNING_LESSONS,
  LEARNING_PATHS,
} from "@/features/learning/content/paths";
import { useLearningStore } from "@/stores/learningStore";

export function LearningHeader() {
  const completedLessons = useLearningStore((state) => state.completedLessons);
  const totalLessons = LEARNING_LESSONS.length;
  const completedCount = LEARNING_LESSONS.filter((entry) =>
    completedLessons.includes(entry.lesson.id),
  ).length;
  const progress =
    totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);
  const totalMinutes = LEARNING_LESSONS.reduce(
    (total, entry) => total + entry.lesson.minutes,
    0,
  );
  const startedPaths = LEARNING_PATHS.filter((path) =>
    path.lessons.some((lesson) => completedLessons.includes(lesson.id)),
  ).length;

  return (
    <header className="border-b border-[var(--border)] pb-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                Learning Center
              </h1>
              <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-[var(--muted)]">
                Kubernetes, explained from first principles. Follow a path, open
                the matching screen, and keep your progress on this device.
              </p>
            </div>
          </div>

          <div data-testid="learning-progress" className="mt-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px]">
              <span className="font-medium text-[var(--foreground)]">
                {completedCount} of {totalLessons} lessons complete
              </span>
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[var(--muted)]">
                <span>{progress}%</span>
                <span
                  className="h-2.5 w-px bg-[var(--border)]"
                  aria-hidden="true"
                />
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2
                    className="h-3 w-3 text-emerald-500"
                    aria-hidden="true"
                  />
                  {startedPaths}/{LEARNING_PATHS.length} paths
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />~
                  {totalMinutes} min
                </span>
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Learning progress"
            >
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <LearningModeControls
          compact
          testIdPrefix="learning"
          className="w-full shrink-0 lg:w-[320px]"
        />
      </div>
    </header>
  );
}
