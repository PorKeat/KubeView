import type { DaemonSetSummary } from "@kubeview/contracts";

export type DaemonSetStatusFilter =
  | "all"
  | "healthy"
  | "progressing"
  | "degraded";

export type DaemonSetBeaconVariant = "healthy" | "warning" | "critical" | "pending" | "muted";

export function isDaemonSetHealthy(ds: DaemonSetSummary): boolean {
  return ds.status === "Healthy";
}
export function isDaemonSetProgressing(ds: DaemonSetSummary): boolean {
  return ds.status === "Progressing";
}
export function isDaemonSetDegraded(ds: DaemonSetSummary): boolean {
  return ds.status === "Degraded";
}

export function daemonSetMatchesStatus(ds: DaemonSetSummary, filter: string): boolean {
  switch (filter) {
    case "healthy":
      return isDaemonSetHealthy(ds);
    case "progressing":
      return isDaemonSetProgressing(ds);
    case "degraded":
      return isDaemonSetDegraded(ds);
    default:
      return true;
  }
}

export function getDaemonSetBeaconVariant(ds: DaemonSetSummary): DaemonSetBeaconVariant {
  switch (ds.status) {
    case "Healthy":
      return "healthy";
    case "Degraded":
      return "critical";
    case "Progressing":
      return "pending";
    default:
      return "muted";
  }
}

export function getDaemonSetStatusPulse(ds: DaemonSetSummary): boolean {
  return ds.status === "Progressing" || ds.status === "Degraded";
}

export function daemonSetMatchesSearch(ds: DaemonSetSummary, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  const nodeSelector = ds.nodeSelector ?? {};
  const selector = ds.selector ?? {};
  return (
    ds.name.toLowerCase().includes(needle) ||
    ds.namespace.toLowerCase().includes(needle) ||
    ds.status.toLowerCase().includes(needle) ||
    ds.updateStrategy.toLowerCase().includes(needle) ||
    (ds.images ?? []).some((image) => image.toLowerCase().includes(needle)) ||
    Object.entries(nodeSelector).some(([k, v]) => `${k}=${v}`.toLowerCase().includes(needle)) ||
    Object.entries(selector).some(([k, v]) => `${k}=${v}`.toLowerCase().includes(needle))
  );
}
