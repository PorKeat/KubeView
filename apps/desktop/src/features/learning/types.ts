export type LearningLevel = "beginner" | "intermediate" | "advanced";

export type LearningTab = "paths" | "glossary";

export type LearningIcon =
  "compass" | "boxes" | "network" | "database" | "wrench" | "shield";

export interface LearningAction {
  label: string;
  tabId: string;
  tabTitle: string;
}

export interface LessonCheckOption {
  id: string;
  label: string;
}

export interface LessonCheck {
  question: string;
  options: LessonCheckOption[];
  correctOptionId: string;
  explanation: string;
}

export interface LearningLesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  goal: string;
  steps: string[];
  command?: string;
  commandNote?: string;
  deepDive?: string;
  action?: LearningAction;
  check?: LessonCheck;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: LearningIcon;
  lessons: LearningLesson[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  category:
    | "Core"
    | "Workloads"
    | "Networking"
    | "Configuration"
    | "Storage"
    | "Access"
    | "Troubleshooting";
  plain: string;
  analogy?: string;
  command?: string;
  aliases?: string[];
}

export interface PageGuide {
  title: string;
  beginner: string;
  intermediate: string;
  advanced: string;
  command?: string;
  pathId?: string;
  lessonId?: string;
}

export interface ErrorExplanation {
  id: string;
  title: string;
  meaning: string;
  commonCauses: string[];
  nextSteps: string[];
  action?: LearningAction;
}

export interface PageTourStep {
  target: string;
  title: string;
  body: string;
}

export interface PageTour {
  id: string;
  pageId: string;
  title: string;
  description: string;
  steps: PageTourStep[];
}

export const LEARNING_LEVEL_LABELS: Record<
  LearningLevel,
  { label: string; shortLabel: string; description: string }
> = {
  beginner: {
    label: "Easy",
    shortLabel: "Easy",
    description: "Plain English. No Kubernetes knowledge assumed.",
  },
  intermediate: {
    label: "Working",
    shortLabel: "Working",
    description: "Adds commands and the signals worth watching.",
  },
  advanced: {
    label: "Advanced",
    shortLabel: "Advanced",
    description: "Adds deeper behavior and operational detail.",
  },
};
