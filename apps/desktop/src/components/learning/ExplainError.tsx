"use client";

import * as React from "react";
import { ArrowRight, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLearningStore } from "@/stores/learningStore";
import { useTabStore } from "@/stores/tabStore";
import { explainKubernetesError } from "@/features/learning/content/errorHelp";

export function ErrorExplanationContent({
  code,
  title,
  message,
  className,
}: {
  code?: string;
  title?: string;
  message?: string;
  className?: string;
}) {
  const openTab = useTabStore((state) => state.openTab);
  const explanation = explainKubernetesError({ code, title, message });
  const action = explanation.action;

  return (
    <div
      data-testid="error-explanation-content"
      className={cn("space-y-2.5 text-left", className)}
    >
      <div>
        <p className="text-[11px] font-semibold text-[var(--foreground)]">
          {explanation.title}
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
          {explanation.meaning}
        </p>
      </div>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Common causes
        </p>
        <ul className="mt-1 space-y-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
          {explanation.commonCauses.map((cause) => (
            <li key={cause} className="flex gap-1.5">
              <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-amber-500/70" />
              <span>{cause}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          What to do next
        </p>
        <ol className="mt-1 space-y-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
          {explanation.nextSteps.map((step, index) => (
            <li key={step} className="flex gap-1.5">
              <span className="font-mono text-[9px] text-amber-600 dark:text-amber-400">
                {index + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      {action && (
        <button
          type="button"
          onClick={() =>
            openTab({
              id: action.tabId,
              title: action.tabTitle,
              closable: true,
            })
          }
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
        >
          {action.label}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function ExplainError({
  code,
  title,
  message,
}: {
  code?: string;
  title?: string;
  message?: string;
}) {
  const learningMode = useLearningStore((state) => state.learningMode);
  const [expanded, setExpanded] = React.useState(false);

  if (!learningMode) return null;

  return (
    <div
      data-testid="error-explainer"
      className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] text-left"
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        data-testid="error-explainer-toggle"
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
      >
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          What does this error mean?
        </span>
        {expanded ? (
          <ChevronUp
            className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
        )}
      </button>

      {expanded && (
        <div className="border-t border-amber-500/15 px-3 py-2.5">
          <ErrorExplanationContent
            code={code}
            title={title}
            message={message}
          />
        </div>
      )}
    </div>
  );
}
