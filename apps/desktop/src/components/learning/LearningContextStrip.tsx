"use client";

import * as React from "react";
import { ArrowRight, Compass, GraduationCap, Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/stores/tabStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useLearningStore } from "@/stores/learningStore";
import { getPageGuide } from "@/features/learning/content/contextHelp";
import { getPageTour } from "@/features/learning/content/tours";
import { LEARNING_LEVEL_LABELS } from "@/features/learning/types";

export function LearningContextStrip() {
  const activeTabId = useTabStore((state) => state.activeTabId);
  const fleetCatalogSection = useLayoutStore(
    (state) => state.fleetCatalogSection,
  );
  const openTab = useTabStore((state) => state.openTab);
  const learningMode = useLearningStore((state) => state.learningMode);
  const level = useLearningStore((state) => state.level);
  const setSelection = useLearningStore((state) => state.setSelection);
  const startTour = useLearningStore((state) => state.startTour);
  const completedTours = useLearningStore((state) => state.completedTours);
  const [dismissedTabs, setDismissedTabs] = React.useState<string[]>([]);

  const guideKey =
    activeTabId === "fleet"
      ? fleetCatalogSection === "health"
        ? "fleet"
        : fleetCatalogSection === "kubeconfigs"
          ? "fleet-kubeconfigs"
          : fleetCatalogSection === "links"
            ? "fleet-links"
            : "fleet-catalog"
      : activeTabId;
  const guide = getPageGuide(guideKey);
  const pageTour = getPageTour(guideKey);
  const isDismissed = dismissedTabs.includes(activeTabId);

  if (
    !learningMode ||
    !guide ||
    isDismissed ||
    activeTabId === "learning" ||
    activeTabId === "settings"
  ) {
    return null;
  }

  const body =
    level === "beginner"
      ? guide.beginner
      : level === "intermediate"
        ? guide.intermediate
        : guide.advanced;

  const openGuide = () => {
    if (!guide.pathId) return;
    setSelection(guide.pathId, guide.lessonId ?? null);
    openTab({ id: "learning", title: "Learning Center", closable: true });
  };

  return (
    <div
      data-testid="learning-context-strip"
      role="note"
      aria-label={`${guide.title} learning guide`}
      className={cn(
        "border-b border-[var(--border)] bg-[var(--surface)]/80 px-3 py-2.5 backdrop-blur-sm sm:px-4",
        "select-none",
      )}
    >
      <div className="flex items-start gap-2.5 sm:items-center">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)] sm:mt-0">
          {level === "beginner" ? (
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              {LEARNING_LEVEL_LABELS[level].shortLabel} guide
            </span>
            <span className="text-[10px] font-mono text-[var(--muted)]">
              {guide.title}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--foreground)]/90">
            {body}
          </p>
          {level !== "beginner" && guide.command ? (
            <code className="mt-1 block w-fit max-w-full overflow-x-auto rounded border border-[var(--border)] bg-black/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)] dark:bg-white/[0.04]">
              {guide.command}
            </code>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {pageTour && (
            <button
              type="button"
              onClick={() => startTour(pageTour.id)}
              data-testid="learning-guide-me"
              aria-label={
                completedTours.includes(pageTour.id)
                  ? `Replay the ${pageTour.title}`
                  : `Guide me through the ${guide.title} page`
              }
              className="inline-flex items-center gap-1 rounded-md border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2 py-1 text-[10px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/15 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              <Compass className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">
                {completedTours.includes(pageTour.id)
                  ? "Tour again"
                  : "Guide me"}
              </span>
              <span className="sm:hidden">Tour</span>
            </button>
          )}
          {guide.pathId ? (
            <button
              type="button"
              onClick={openGuide}
              data-testid="learning-context-open"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              <span className="hidden sm:inline">
                {guide.lessonId ? "Open lesson" : "Open path"}
              </span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              setDismissedTabs((current) => [...current, activeTabId])
            }
            aria-label="Dismiss this page guide"
            data-testid="learning-context-dismiss"
            className="rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
