"use client";

import * as React from "react";
import { ArrowRight, GraduationCap, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTabStore } from "@/stores/tabStore";
import { useLearningStore } from "@/stores/learningStore";
import { LEARNING_LESSONS } from "@/features/learning/content/paths";
import { LearningModeControls } from "@/components/learning/LearningModeControls";
import { SettingsSectionCard } from "./SettingsSectionCard";

export function LearningSettingsPanel() {
  const completedLessons = useLearningStore((state) => state.completedLessons);
  const resetProgress = useLearningStore((state) => state.resetProgress);
  const openTab = useTabStore((state) => state.openTab);
  const [confirmReset, setConfirmReset] = React.useState(false);

  React.useEffect(() => {
    if (!confirmReset) return;
    const timer = window.setTimeout(() => setConfirmReset(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);

  const totalLessons = LEARNING_LESSONS.length;
  const completedCount = LEARNING_LESSONS.filter((entry) =>
    completedLessons.includes(entry.lesson.id),
  ).length;
  const progress =
    totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetProgress();
    setConfirmReset(false);
    toast.success("Learning progress reset");
  };

  return (
    <SettingsSectionCard
      id="settings-learning"
      icon={GraduationCap}
      title="Learning"
      description="Choose how much explanation appears around you. Learning mode never changes cluster data."
    >
      <LearningModeControls testIdPrefix="settings-learning" />

      <div
        data-testid="settings-learning-panel"
        className="rounded-xl border border-[var(--border)] bg-black/[0.02] p-3.5 dark:bg-white/[0.02]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-[var(--foreground)]">
              Learning progress
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              {completedCount} of {totalLessons} lessons complete
            </p>
          </div>
          <span className="font-mono text-[10px] text-[var(--muted)]">
            {progress}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              openTab({
                id: "learning",
                title: "Learning Center",
                closable: true,
              })
            }
            data-testid="settings-open-learning"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)] px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            Open Learning Center
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            data-testid="settings-reset-learning"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            {confirmReset ? "Confirm reset" : "Reset progress"}
          </button>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-[var(--muted)]">
        Easy is written for someone who has never used Kubernetes. Working adds
        commands and signals to watch. Advanced adds deeper behavior and
        operational detail. All progress stays in this browser.
      </p>
    </SettingsSectionCard>
  );
}
