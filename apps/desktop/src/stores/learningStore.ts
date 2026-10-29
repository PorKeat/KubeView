import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LearningLevel } from "@/features/learning/types";

interface LearningState {
  learningMode: boolean;
  level: LearningLevel;
  completedLessons: string[];
  lastLessonId: string | null;
  completedTours: string[];
  activeTourId: string | null;
  selectedPathId: string | null;
  selectedLessonId: string | null;
  setLearningMode: (enabled: boolean) => void;
  setLevel: (level: LearningLevel) => void;
  markLessonComplete: (lessonId: string) => void;
  markLessonIncomplete: (lessonId: string) => void;
  startTour: (tourId: string) => void;
  closeTour: () => void;
  markTourComplete: (tourId: string) => void;
  setSelection: (pathId: string, lessonId: string | null) => void;
  resetProgress: () => void;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set) => ({
      learningMode: true,
      level: "beginner",
      completedLessons: [],
      lastLessonId: null,
      completedTours: [],
      activeTourId: null,
      selectedPathId: null,
      selectedLessonId: null,
      setLearningMode: (learningMode) =>
        set((state) => ({
          learningMode,
          activeTourId: learningMode ? state.activeTourId : null,
        })),
      setLevel: (level) => set({ level }),
      markLessonComplete: (lessonId) =>
        set((state) => ({
          completedLessons: state.completedLessons.includes(lessonId)
            ? state.completedLessons
            : [...state.completedLessons, lessonId],
          lastLessonId: lessonId,
        })),
      markLessonIncomplete: (lessonId) =>
        set((state) => ({
          completedLessons: state.completedLessons.filter(
            (id) => id !== lessonId,
          ),
        })),
      startTour: (activeTourId) => set({ activeTourId }),
      closeTour: () => set({ activeTourId: null }),
      markTourComplete: (tourId) =>
        set((state) => ({
          completedTours: state.completedTours.includes(tourId)
            ? state.completedTours
            : [...state.completedTours, tourId],
          activeTourId: null,
        })),
      setSelection: (selectedPathId, selectedLessonId) =>
        set({ selectedPathId, selectedLessonId }),
      resetProgress: () =>
        set({
          completedLessons: [],
          lastLessonId: null,
          completedTours: [],
          activeTourId: null,
        }),
    }),
    {
      name: "kubeview-learning",
      partialize: (state) => ({
        learningMode: state.learningMode,
        level: state.level,
        completedLessons: state.completedLessons,
        lastLessonId: state.lastLessonId,
        completedTours: state.completedTours,
      }),
    },
  ),
);

export function isLessonComplete(
  completedLessons: string[],
  lessonId: string,
): boolean {
  return completedLessons.includes(lessonId);
}
