import type { LearningPath } from "../types";
import { firstStepsPath } from "./paths/firstSteps";
import { workloadsPath } from "./paths/workloads";
import { networkingPath } from "./paths/networking";
import { configStoragePath } from "./paths/configStorage";
import { troubleshootingPath } from "./paths/troubleshooting";
import { accessPath } from "./paths/access";

export const LEARNING_PATHS: LearningPath[] = [
  firstStepsPath,
  workloadsPath,
  networkingPath,
  configStoragePath,
  troubleshootingPath,
  accessPath,
];

export const LEARNING_LESSONS = LEARNING_PATHS.flatMap((path) =>
  path.lessons.map((lesson) => ({ path, lesson })),
);

export function findLearningPath(pathId: string): LearningPath | undefined {
  return LEARNING_PATHS.find((path) => path.id === pathId);
}

export function findLearningLesson(
  lessonId: string,
): { path: LearningPath; lesson: LearningPath["lessons"][number] } | undefined {
  return LEARNING_LESSONS.find((entry) => entry.lesson.id === lessonId);
}
