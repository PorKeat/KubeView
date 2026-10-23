import type { ReplicaSetSummary } from "@kubeview/contracts";

export type ReplicaSetStatusFilter =
  "all" | "healthy" | "progressing" | "degraded" | "scaleddown";

export type ReplicaSetBeaconVariant =
  "healthy" | "warning" | "critical" | "pending" | "muted";

export function isReplicaSetHealthy(replicaSet: ReplicaSetSummary): boolean {
  return replicaSet.status === "Healthy";
}

export function isReplicaSetProgressing(
  replicaSet: ReplicaSetSummary,
): boolean {
  return replicaSet.status === "Progressing";
}

export function isReplicaSetDegraded(replicaSet: ReplicaSetSummary): boolean {
  return replicaSet.status === "Degraded";
}

export function isReplicaSetScaledDown(replicaSet: ReplicaSetSummary): boolean {
  return replicaSet.status === "Scaled Down";
}

export function replicaSetMatchesStatus(
  replicaSet: ReplicaSetSummary,
  filter: string,
): boolean {
  switch (filter) {
    case "healthy":
      return isReplicaSetHealthy(replicaSet);
    case "progressing":
      return isReplicaSetProgressing(replicaSet);
    case "degraded":
      return isReplicaSetDegraded(replicaSet);
    case "scaleddown":
      return isReplicaSetScaledDown(replicaSet);
    default:
      return true;
  }
}

export function getReplicaSetBeaconVariant(
  replicaSet: ReplicaSetSummary,
): ReplicaSetBeaconVariant {
  switch (replicaSet.status) {
    case "Healthy":
      return "healthy";
    case "Degraded":
      return "critical";
    case "Progressing":
      return "pending";
    case "Scaled Down":
      return "muted";
    default:
      return "muted";
  }
}

export function getReplicaSetStatusPulse(
  replicaSet: ReplicaSetSummary,
): boolean {
  return (
    replicaSet.status === "Progressing" || replicaSet.status === "Degraded"
  );
}

export function replicaSetMatchesSearch(
  replicaSet: ReplicaSetSummary,
  query: string,
): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  const images = replicaSet.images ?? [];
  const selector = replicaSet.selector ?? {};
  return (
    replicaSet.name.toLowerCase().includes(needle) ||
    replicaSet.namespace.toLowerCase().includes(needle) ||
    replicaSet.status.toLowerCase().includes(needle) ||
    (replicaSet.ownerDeployment ?? "").toLowerCase().includes(needle) ||
    images.some((image) => image.toLowerCase().includes(needle)) ||
    Object.entries(selector).some(([key, value]) =>
      `${key}=${value}`.toLowerCase().includes(needle),
    )
  );
}
