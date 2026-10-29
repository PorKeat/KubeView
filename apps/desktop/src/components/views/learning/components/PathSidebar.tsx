"use client";

import type * as React from "react";
import {
  Boxes,
  Compass,
  Database,
  Network,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearningIcon, LearningPath } from "@/features/learning/types";

const PATH_ICONS: Record<LearningIcon, React.ElementType> = {
  compass: Compass,
  boxes: Boxes,
  network: Network,
  database: Database,
  wrench: Wrench,
  shield: ShieldCheck,
};

export function PathSidebar({
  paths,
  activePathId,
  completedLessons,
  onSelect,
}: {
  paths: LearningPath[];
  activePathId: string;
  completedLessons: string[];
  onSelect: (pathId: string) => void;
}) {
  return (
    <nav
      data-testid="learning-path-list"
      aria-label="Learning paths"
      className={cn(
        "scrollbar-none sticky top-3 z-20 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden bg-[var(--background)]/95 px-1 py-2 backdrop-blur-sm",
        "xl:top-4 xl:mx-0 xl:max-h-[calc(100vh-8rem)] xl:flex-col xl:overflow-x-hidden xl:overflow-y-auto xl:bg-transparent xl:px-0 xl:py-0 xl:backdrop-blur-none modern-scrollbar",
      )}
    >
      {paths.map((path) => {
        const Icon = PATH_ICONS[path.icon];
        const completed = path.lessons.filter((lesson) =>
          completedLessons.includes(lesson.id),
        ).length;
        const percent = Math.round((completed / path.lessons.length) * 100);
        const isActive = path.id === activePathId;

        return (
          <button
            key={path.id}
            type="button"
            onClick={() => onSelect(path.id)}
            aria-current={isActive ? "true" : undefined}
            aria-label={`${path.title}, ${completed} of ${path.lessons.length} lessons complete`}
            data-testid={`learning-path-card-${path.id}`}
            className={cn(
              "group flex min-h-[112px] w-[248px] shrink-0 snap-start flex-col rounded-xl border p-3 text-left transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden sm:w-[260px] xl:w-auto xl:shrink",
              isActive
                ? "border-[var(--accent)]/40 bg-[var(--accent)]/[0.06] shadow-2xs"
                : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]",
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                  isActive
                    ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--border)] bg-black/[0.02] text-[var(--muted)] dark:bg-white/[0.03]",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold leading-snug text-[var(--foreground)]">
                  {path.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--muted)]">
                  {path.description}
                </p>
              </div>
            </div>
            <div className="mt-auto flex items-center gap-2 pt-2.5">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="shrink-0 font-mono text-[9px] text-[var(--muted)]">
                {completed}/{path.lessons.length}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
