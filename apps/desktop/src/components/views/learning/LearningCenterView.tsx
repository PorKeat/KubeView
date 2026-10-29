"use client";

import * as React from "react";
import { BookOpen, Route } from "lucide-react";
import { AnimatedTabs } from "@/components/ui/AnimatedTabs";
import { useLearningStore } from "@/stores/learningStore";
import {
  LEARNING_PATHS,
  findLearningLesson,
  findLearningPath,
} from "@/features/learning/content/paths";
import type { LearningTab } from "@/features/learning/types";
import { LearningHeader } from "./components/LearningHeader";
import { PathSidebar } from "./components/PathSidebar";
import { LessonPanel } from "./components/LessonPanel";
import { GlossaryPanel } from "./components/GlossaryPanel";

export function LearningCenterView() {
  const [activeTab, setActiveTab] = React.useState<LearningTab>("paths");
  const selectedPathId = useLearningStore((state) => state.selectedPathId);
  const selectedLessonId = useLearningStore((state) => state.selectedLessonId);
  const lastLessonId = useLearningStore((state) => state.lastLessonId);
  const completedLessons = useLearningStore((state) => state.completedLessons);
  const setSelection = useLearningStore((state) => state.setSelection);

  const lastEntry = lastLessonId ? findLearningLesson(lastLessonId) : undefined;
  const activePath =
    findLearningPath(selectedPathId ?? "") ??
    lastEntry?.path ??
    LEARNING_PATHS[0];
  const activeLesson =
    activePath.lessons.find((lesson) => lesson.id === selectedLessonId) ??
    activePath.lessons.find(
      (lesson) => !completedLessons.includes(lesson.id),
    ) ??
    activePath.lessons[0];

  React.useEffect(() => {
    if (
      selectedPathId !== activePath.id ||
      selectedLessonId !== activeLesson.id
    ) {
      setSelection(activePath.id, activeLesson.id);
    }
  }, [
    activeLesson.id,
    activePath.id,
    selectedLessonId,
    selectedPathId,
    setSelection,
  ]);

  return (
    <div
      data-testid="learning-center-view"
      className="flex-1 flex flex-col h-full overflow-hidden select-none"
    >
      <div
        data-testid="learning-center-scroll"
        className="flex-1 overflow-y-auto modern-scrollbar"
      >
        <div className="w-full space-y-3 p-4 sm:p-5 lg:p-6">
          <LearningHeader />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <AnimatedTabs<LearningTab>
              tabs={[
                { id: "paths", label: "Guided paths", icon: Route },
                { id: "glossary", label: "Glossary", icon: BookOpen },
              ]}
              activeId={activeTab}
              onChange={setActiveTab}
              ariaLabel="Learning center sections"
              layoutId="learning-center-tab"
              size="sm"
              className="w-full sm:w-auto"
            />
            <p className="text-[10px] font-mono text-[var(--muted)]">
              Progress is stored only on this device.
            </p>
          </div>

          {activeTab === "paths" ? (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <PathSidebar
                paths={LEARNING_PATHS}
                activePathId={activePath.id}
                completedLessons={completedLessons}
                onSelect={(pathId) => setSelection(pathId, null)}
              />
              <LessonPanel
                key={activeLesson.id}
                path={activePath}
                lesson={activeLesson}
                onSelectLesson={(lessonId) =>
                  setSelection(activePath.id, lessonId)
                }
              />
            </div>
          ) : (
            <GlossaryPanel />
          )}
        </div>
      </div>
    </div>
  );
}
