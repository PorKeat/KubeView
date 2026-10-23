import type { StatefulSetSummary } from "@kubeview/contracts";

export type StatefulSetStatusFilter =
  "all" | "healthy" | "progressing" | "degraded" | "scaleddown";

export type StatefulSetBeaconVariant =
  "healthy" | "warning" | "critical" | "pending" | "muted";

export function isStatefulSetHealthy(statefulSet: StatefulSetSummary): boolean {
  return statefulSet.status === "Healthy";
}

export function isStatefulSetProgressing(
  statefulSet: StatefulSetSummary,
): boolean {
  return statefulSet.status === "Progressing";
}

export function isStatefulSetDegraded(
  statefulSet: StatefulSetSummary,
): boolean {
  return statefulSet.status === "Degraded";
}

export function isStatefulSetScaledDown(
  statefulSet: StatefulSetSummary,
): boolean {
  return statefulSet.status === "Scaled Down";
}

export function statefulSetMatchesStatus(
  statefulSet: StatefulSetSummary,
  filter: string,
): boolean {
  switch (filter) {
    case "healthy":
      return isStatefulSetHealthy(statefulSet);
    case "progressing":
      return isStatefulSetProgressing(statefulSet);
    case "degraded":
      return isStatefulSetDegraded(statefulSet);
    case "scaleddown":
      return isStatefulSetScaledDown(statefulSet);
    default:
      return true;
  }
}

export function getStatefulSetBeaconVariant(
  statefulSet: StatefulSetSummary,
): StatefulSetBeaconVariant {
  switch (statefulSet.status) {
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

export function getStatefulSetStatusPulse(
  statefulSet: StatefulSetSummary,
): boolean {
  return (
    statefulSet.status === "Progressing" || statefulSet.status === "Degraded"
  );
}

export function statefulSetMatchesSearch(
  statefulSet: StatefulSetSummary,
  query: string,
): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  const images = statefulSet.images ?? [];
  const selector = statefulSet.selector ?? {};
  return (
    statefulSet.name.toLowerCase().includes(needle) ||
    statefulSet.namespace.toLowerCase().includes(needle) ||
    statefulSet.status.toLowerCase().includes(needle) ||
    (statefulSet.serviceName ?? "").toLowerCase().includes(needle) ||
    (statefulSet.currentRevision ?? "").toLowerCase().includes(needle) ||
    (statefulSet.updateRevision ?? "").toLowerCase().includes(needle) ||
    statefulSet.podManagementPolicy.toLowerCase().includes(needle) ||
    statefulSet.updateStrategy.toLowerCase().includes(needle) ||
    images.some((image) => image.toLowerCase().includes(needle)) ||
    Object.entries(selector).some(([key, value]) =>
      `${key}=${value}`.toLowerCase().includes(needle),
    )
  );
}
