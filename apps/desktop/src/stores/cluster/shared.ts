import type { ClusterOverviewResult } from "@kubeview/contracts";

import type { ClusterState } from "./types/cluster";

export const inFlightResourcePromises = new Map<string, Promise<void>>();
export const inFlightOverviewPromises = new Map<
  string,
  Promise<ClusterOverviewResult | null>
>();

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
