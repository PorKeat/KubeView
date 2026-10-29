"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check, Compass, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getPageTourById } from "@/features/learning/content/tours";
import type { PageTour } from "@/features/learning/types";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CardSize {
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

const CARD_MAX_WIDTH = 380;
const VIEWPORT_MARGIN = 14;
const TARGET_GAP = 14;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function readTargetRect(selector: string): TargetRect | null {
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

export function GuidedTour() {
  const activeTourId = useLearningStore((state) => state.activeTourId);
  const tour = activeTourId ? getPageTourById(activeTourId) : undefined;

  if (!tour) return null;

  return <GuidedTourSession key={tour.id} tour={tour} />;
}

function GuidedTourSession({ tour }: { tour: PageTour }) {
  const closeTour = useLearningStore((state) => state.closeTour);
  const markTourComplete = useLearningStore((state) => state.markTourComplete);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [targetRect, setTargetRect] = React.useState<TargetRect | null>(null);
  const [isMissing, setIsMissing] = React.useState(false);
  const [cardSize, setCardSize] = React.useState<CardSize>({
    width: CARD_MAX_WIDTH,
    height: 260,
  });
  const [viewport, setViewport] = React.useState<ViewportSize>(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  const cardRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const step = tour.steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === tour.steps.length - 1;

  const measureTarget = React.useCallback(() => {
    const rect = readTargetRect(step.target);
    setTargetRect(rect);
    setIsMissing(rect === null);
  }, [step.target]);

  React.useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  React.useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  React.useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const updateCardSize = () => {
      const width = card.offsetWidth;
      const height = card.offsetHeight;
      setCardSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    updateCardSize();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateCardSize);
    observer?.observe(card);
    window.addEventListener("resize", updateCardSize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateCardSize);
    };
  }, [stepIndex]);

  React.useEffect(() => {
    const target = document.querySelector<HTMLElement>(step.target);
    if (!target) {
      setTargetRect(null);
      setIsMissing(true);
      return;
    }

    target.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
      inline: "center",
    });

    const frame = window.requestAnimationFrame(measureTarget);
    const followUp = window.setTimeout(measureTarget, reducedMotion ? 50 : 450);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measureTarget);
    observer?.observe(target);
    const handleViewportChange = () => measureTarget();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(followUp);
      observer?.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [measureTarget, reducedMotion, step.target]);

  React.useEffect(() => {
    cardRef.current?.focus();
  }, [stepIndex]);

  const finishTour = React.useCallback(() => {
    markTourComplete(tour.id);
    toast.success("Walkthrough complete");
  }, [markTourComplete, tour.id]);

  const goNext = React.useCallback(() => {
    if (isLastStep) {
      finishTour();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, tour.steps.length - 1));
  }, [finishTour, isLastStep, tour.steps.length]);

  const goBack = React.useCallback(() => {
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeTour();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        goNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        goBack();
        return;
      }
      if (event.key !== "Tab") return;

      const card = cardRef.current;
      if (!card) return;
      const focusable = Array.from(
        card.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        card.focus();
        return;
      }
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !card.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !card.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [closeTour, goBack, goNext]);

  const position = React.useMemo(() => {
    const width = Math.min(
      CARD_MAX_WIDTH,
      viewport.width - VIEWPORT_MARGIN * 2,
    );
    const height = Math.min(
      cardSize.height,
      viewport.height - VIEWPORT_MARGIN * 2,
    );

    if (!targetRect) {
      return {
        width,
        left: Math.max(VIEWPORT_MARGIN, (viewport.width - width) / 2),
        top: Math.max(VIEWPORT_MARGIN, (viewport.height - height) / 2),
      };
    }

    const left = clamp(
      targetRect.left + targetRect.width / 2 - width / 2,
      VIEWPORT_MARGIN,
      viewport.width - width - VIEWPORT_MARGIN,
    );
    const below = targetRect.top + targetRect.height + TARGET_GAP;
    const above = targetRect.top - TARGET_GAP - cardSize.height;
    const top =
      below + cardSize.height <= viewport.height - VIEWPORT_MARGIN
        ? below
        : above >= VIEWPORT_MARGIN
          ? above
          : clamp(
              viewport.height - cardSize.height - VIEWPORT_MARGIN,
              VIEWPORT_MARGIN,
              viewport.height - cardSize.height - VIEWPORT_MARGIN,
            );

    return { width, left, top };
  }, [cardSize.height, targetRect, viewport.height, viewport.width]);

  return (
    <div
      data-testid="guided-tour-overlay"
      className="fixed inset-0 z-[300] select-none"
    >
      <div
        className="absolute inset-0"
        onClick={closeTour}
        aria-hidden="true"
      />

      {isMissing && (
        <div
          className="pointer-events-none absolute inset-0 bg-black/70"
          aria-hidden="true"
        />
      )}

      {targetRect && (
        <div
          data-testid="guided-tour-highlight"
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl border-2 border-[var(--accent)]"
          style={{
            top: Math.max(0, targetRect.top - 6),
            left: Math.max(0, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: "0 0 0 9999px rgba(3, 7, 18, 0.72)",
          }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
        aria-describedby="guided-tour-body"
        tabIndex={-1}
        data-testid="guided-tour-card"
        style={{
          left: position.left,
          top: position.top,
          width: position.width,
        }}
        className={cn(
          "absolute z-10 max-h-[calc(100vh-28px)] overflow-y-auto modern-scrollbar rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-2xl shadow-black/50 outline-hidden",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                Guided tour
              </p>
              <p className="mt-0.5 truncate font-mono text-[9px] text-[var(--muted)]">
                {tour.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeTour}
            aria-label="End guided tour"
            data-testid="guided-tour-close"
            className="rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            data-testid="guided-tour-step-label"
            className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]"
          >
            Step {stepIndex + 1} of {tour.steps.length}
          </span>
          <div className="flex items-center gap-1" aria-hidden="true">
            {tour.steps.map((item, index) => (
              <span
                key={item.title}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === stepIndex
                    ? "w-4 bg-[var(--accent)]"
                    : index < stepIndex
                      ? "w-1.5 bg-emerald-500/70"
                      : "w-1.5 bg-black/15 dark:bg-white/20",
                )}
              />
            ))}
          </div>
        </div>

        <div aria-live="polite">
          <h2
            id="guided-tour-title"
            className="mt-3 text-sm font-semibold tracking-tight text-[var(--foreground)]"
          >
            {step.title}
          </h2>
          <p
            id="guided-tour-body"
            className="mt-1.5 text-[11px] leading-relaxed text-[var(--muted)]"
          >
            {step.body}
          </p>
        </div>

        {isMissing && (
          <p className="mt-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-2 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
            This section is not visible right now. You can continue to the next
            step, and the guidance will still apply when the data loads.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={closeTour}
            data-testid="guided-tour-skip"
            className="rounded-md px-1.5 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goBack}
              disabled={isFirstStep}
              data-testid="guided-tour-back"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[10px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              data-testid="guided-tour-next"
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              {isLastStep ? "Finish" : "Next"}
              {isLastStep ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <p className="mt-2 text-center text-[9px] text-[var(--muted)]/70">
          Use arrow keys to move, Esc to exit.
        </p>
      </div>
    </div>
  );
}
