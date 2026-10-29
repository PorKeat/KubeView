"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Copy,
  Lightbulb,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/stores/tabStore";
import { useLearningStore } from "@/stores/learningStore";
import type { LearningLesson, LearningPath } from "@/features/learning/types";
import { LessonQuiz } from "./LessonQuiz";

export function LessonPanel({
  path,
  lesson,
  onSelectLesson,
}: {
  path: LearningPath;
  lesson: LearningLesson;
  onSelectLesson: (lessonId: string) => void;
}) {
  const level = useLearningStore((state) => state.level);
  const completedLessons = useLearningStore((state) => state.completedLessons);
  const markLessonComplete = useLearningStore(
    (state) => state.markLessonComplete,
  );
  const markLessonIncomplete = useLearningStore(
    (state) => state.markLessonIncomplete,
  );
  const openTab = useTabStore((state) => state.openTab);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setCopied(false);
  }, [lesson.id]);

  const lessonIndex = path.lessons.findIndex((item) => item.id === lesson.id);
  const previousLesson = path.lessons[lessonIndex - 1];
  const nextLesson = path.lessons[lessonIndex + 1];
  const isComplete = completedLessons.includes(lesson.id);
  const pathCompleted = path.lessons.filter((item) =>
    completedLessons.includes(item.id),
  ).length;

  const copyCommand = async () => {
    if (!lesson.command) return;
    try {
      await navigator.clipboard.writeText(lesson.command);
      setCopied(true);
      toast.success("Command copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy the command");
    }
  };

  const toggleComplete = () => {
    if (isComplete) {
      markLessonIncomplete(lesson.id);
      return;
    }
    markLessonComplete(lesson.id);
    toast.success("Lesson complete. Progress is saved on this device.", {
      duration: 1800,
    });
  };

  return (
    <section
      id="learning-lesson-panel"
      data-testid="learning-lesson-panel"
      className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs"
    >
      <div className="border-b border-[var(--border)] px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              {path.title}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
              Lesson {lessonIndex + 1} of {path.lessons.length} ·{" "}
              {pathCompleted}/{path.lessons.length} complete
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-black/[0.02] px-1.5 py-0.5 text-[9px] font-mono text-[var(--muted)] dark:bg-white/[0.03]">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {lesson.minutes} min
          </span>
        </div>

        <div
          className="mt-2.5 flex flex-wrap gap-1"
          aria-label="Lessons in this path"
        >
          {path.lessons.map((item, index) => {
            const done = completedLessons.includes(item.id);
            const isActive = item.id === lesson.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectLesson(item.id)}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Lesson ${index + 1}: ${item.title}${done ? ", complete" : ""}`}
                data-testid={`learning-lesson-${item.id}`}
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-[9px] font-mono transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                  isActive
                    ? "border-[var(--accent)]/35 bg-[var(--accent)]/10 text-[var(--accent)]"
                    : done
                      ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-400"
                      : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
                )}
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current/30">
                  {done ? (
                    <Check className="h-2.5 w-2.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="max-w-[150px] truncate">{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            {lesson.title}
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
            {lesson.summary}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.05] px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Your goal
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--foreground)]">
            {lesson.goal}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            What to do
          </p>
          <ol className="mt-2 space-y-2">
            {lesson.steps.map((step, index) => (
              <li key={step} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] font-mono text-[9px] text-[var(--muted)]">
                  {index + 1}
                </span>
                <span className="text-[11px] leading-relaxed text-[var(--foreground)]/90">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {lesson.command && (
          <div className="rounded-xl border border-[var(--border)] bg-black/[0.02] p-3 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--foreground)]">
                <Terminal
                  className="h-3.5 w-3.5 text-[var(--muted)]"
                  aria-hidden="true"
                />
                Terminal equivalent
              </span>
              <button
                type="button"
                onClick={() => void copyCommand()}
                data-testid={`learning-copy-${lesson.id}`}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
                aria-label="Copy command"
              >
                {copied ? (
                  <Check
                    className="h-3 w-3 text-emerald-500"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy className="h-3 w-3" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 font-mono text-[10px] leading-relaxed text-[var(--foreground)]">
              <code>{lesson.command}</code>
            </pre>
            {lesson.commandNote && (
              <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
                {lesson.commandNote}
              </p>
            )}
          </div>
        )}

        {level === "advanced" && lesson.deepDive && (
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              <Lightbulb className="h-3 w-3" aria-hidden="true" />
              Advanced detail
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
              {lesson.deepDive}
            </p>
          </div>
        )}

        {lesson.action && (
          <button
            type="button"
            onClick={() =>
              openTab({
                id: lesson.action!.tabId,
                title: lesson.action!.tabTitle,
                closable: lesson.action!.tabId !== "overview",
              })
            }
            data-testid="learning-action-open"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            {lesson.action.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        {lesson.check && (
          <LessonQuiz
            key={lesson.id}
            lessonId={lesson.id}
            check={lesson.check}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={toggleComplete}
            aria-pressed={isComplete}
            data-testid={`learning-complete-${lesson.id}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
              isComplete
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-[var(--accent)]/30 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Circle className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isComplete ? "Completed" : "Mark lesson complete"}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!previousLesson}
              onClick={() =>
                previousLesson && onSelectLesson(previousLesson.id)
              }
              data-testid="learning-prev-lesson"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[10px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              disabled={!nextLesson}
              onClick={() => nextLesson && onSelectLesson(nextLesson.id)}
              data-testid="learning-next-lesson"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[10px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              Next
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
