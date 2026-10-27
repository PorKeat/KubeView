import type {
  FleetClusterOverview,
  FleetOverviewTotals,
} from "@kubeview/contracts";

export type FleetFilter = "all" | "healthy" | "attention" | "offline";

export interface FleetFilterOption {
  id: FleetFilter;
  label: string;
  count: number;
}

export const EMPTY_FLEET_TOTALS: FleetOverviewTotals = {
  total: 0,
  healthy: 0,
  degraded: 0,
  offline: 0,
  totalNodes: 0,
  readyNodes: 0,
  totalPods: 0,
  runningPods: 0,
  failedPods: 0,
  degradedWorkloads: 0,
  warningCount: 0,
};

const PROVIDER_LABELS: Record<string, string> = {
  eks: "Amazon EKS",
  gke: "Google GKE",
  aks: "Azure AKS",
  kind: "Kind",
  minikube: "Minikube",
  generic: "Kubernetes",
};

const AUTH_LABELS: Record<string, string> = {
  cert: "client cert",
  token: "token",
  exec: "exec",
  oidc: "OIDC",
  unknown: "auth",
};

const WORKLOAD_LABELS = [
  ["deployments", "Deployment", "Deployments"],
  ["replicaSets", "ReplicaSet", "ReplicaSets"],
  ["statefulSets", "StatefulSet", "StatefulSets"],
  ["daemonSets", "DaemonSet", "DaemonSets"],
  ["jobs", "Job", "Jobs"],
  ["cronJobs", "CronJob", "CronJobs"],
] as const;

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function authLabel(authType: string): string {
  return AUTH_LABELS[authType] ?? authType;
}

export function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "just now";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function fleetStatusMeta(status: FleetClusterOverview["status"]) {
  switch (status) {
    case "healthy":
      return { label: "Healthy", variant: "healthy" as const };
    case "degraded":
      return { label: "Needs attention", variant: "warning" as const };
    default:
      return { label: "Offline", variant: "offline" as const };
  }
}

export function sortFleetClusters(
  clusters: FleetClusterOverview[],
  currentContext: string,
): FleetClusterOverview[] {
  const statusOrder: Record<FleetClusterOverview["status"], number> = {
    degraded: 0,
    offline: 1,
    healthy: 2,
  };
  return [...clusters].sort((a, b) => {
    const aActive = a.contextName === currentContext;
    const bActive = b.contextName === currentContext;
    if (aActive !== bActive) return aActive ? -1 : 1;
    const statusDelta = statusOrder[a.status] - statusOrder[b.status];
    if (statusDelta !== 0) return statusDelta;
    return a.contextName.localeCompare(b.contextName);
  });
}

export function filterFleetClusters(
  clusters: FleetClusterOverview[],
  search: string,
  filter: FleetFilter,
): FleetClusterOverview[] {
  const query = search.trim().toLowerCase();
  return clusters.filter((cluster) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "attention"
        ? cluster.status === "degraded"
        : cluster.status === filter);
    if (!matchesFilter) return false;
    if (!query) return true;
    return `${cluster.contextName} ${cluster.cluster} ${cluster.server} ${cluster.provider}`
      .toLowerCase()
      .includes(query);
  });
}

export function fleetFilterOptions(
  totals: FleetOverviewTotals,
): FleetFilterOption[] {
  return [
    { id: "all", label: "All", count: totals.total },
    { id: "healthy", label: "Healthy", count: totals.healthy },
    { id: "attention", label: "Needs attention", count: totals.degraded },
    { id: "offline", label: "Offline", count: totals.offline },
  ];
}

export function degradedWorkloadLabels(
  cluster: FleetClusterOverview,
): string[] {
  const breakdown = cluster.degradedWorkloadsByKind;
  const labels = WORKLOAD_LABELS.flatMap(([key, singular, plural]) => {
    const count = breakdown?.[key] ?? 0;
    if (count <= 0) return [];
    return [`${count} ${count === 1 ? singular : plural}`];
  });
  if (labels.length === 0 && cluster.degradedWorkloads > 0) {
    return [
      `${cluster.degradedWorkloads} workload${
        cluster.degradedWorkloads === 1 ? "" : "s"
      }`,
    ];
  }
  return labels;
}
