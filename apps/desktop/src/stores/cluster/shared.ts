import type { ClusterOverviewResult } from "@kubeview/contracts";

import type { ClusterState } from "./types/cluster";

export const inFlightResourcePromises = new Map<string, Promise<void>>();
export const inFlightOverviewPromises = new Map<
  string,
  Promise<ClusterOverviewResult | null>
>();

const recentResponses = new Map<string, { at: number; value: unknown }>();

export function getRecentResponse<T>(
  key: string,
  maxAgeMs: number,
): T | undefined {
  const entry = recentResponses.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > maxAgeMs) {
    recentResponses.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setRecentResponse(key: string, value: unknown): void {
  recentResponses.set(key, { at: Date.now(), value });
}

export function clearRecentResponses(prefix?: string): void {
  if (!prefix) {
    recentResponses.clear();
    return;
  }
  for (const key of recentResponses.keys()) {
    if (key.startsWith(prefix)) recentResponses.delete(key);
  }
}

let contextSwitchSeq = 0;

export function beginContextSwitch(): number {
  contextSwitchSeq += 1;
  return contextSwitchSeq;
}

export function isContextSwitchStale(seq: number): boolean {
  return seq !== contextSwitchSeq;
}

export function dedupeResourceFetch(
  key: string,
  task: () => Promise<void>,
): Promise<void> {
  const existing = inFlightResourcePromises.get(key);
  if (existing) return existing;
  const promise = task().finally(() => {
    inFlightResourcePromises.delete(key);
  });
  inFlightResourcePromises.set(key, promise);
  return promise;
}

export function resolveQueryNamespace(
  state: Pick<ClusterState, "rbacMode" | "availableContexts">,
  contextName: string,
  namespace: string,
): string {
  if (state.rbacMode !== "namespace-scoped") return "";
  if (namespace !== "all") return namespace;
  return (
    state.availableContexts.find((context) => context.name === contextName)
      ?.namespace || "default"
  );
}
