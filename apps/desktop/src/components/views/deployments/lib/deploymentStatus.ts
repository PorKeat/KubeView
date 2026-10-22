import type { DeploymentSummary } from "@kubeview/contracts";

export type DeploymentStatusFilter =
  "all" | "healthy" | "progressing" | "degraded" | "paused";

export type DeploymentBeaconVariant =
  "healthy" | "warning" | "critical" | "pending" | "muted";

export function isDeploymentHealthy(deployment: DeploymentSummary): boolean {
  return deployment.status === "Healthy" || deployment.status === "Scaled Down";
}

export function isDeploymentProgressing(
  deployment: DeploymentSummary,
): boolean {
  return deployment.status === "Progressing";
}

export function isDeploymentDegraded(deployment: DeploymentSummary): boolean {
  return deployment.status === "Degraded";
}

export function isDeploymentPaused(deployment: DeploymentSummary): boolean {
  return deployment.status === "Paused" || deployment.paused;
}

export function deploymentMatchesStatus(
  deployment: DeploymentSummary,
  filter: string,
): boolean {
  switch (filter) {
    case "healthy":
      return isDeploymentHealthy(deployment);
    case "progressing":
      return isDeploymentProgressing(deployment);
    case "degraded":
      return isDeploymentDegraded(deployment);
    case "paused":
      return isDeploymentPaused(deployment);
    default:
      return true;
  }
}

export function getDeploymentBeaconVariant(
  deployment: DeploymentSummary,
): DeploymentBeaconVariant {
  if (isDeploymentPaused(deployment)) return "warning";
  switch (deployment.status) {
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

export function getDeploymentStatusPulse(
  deployment: DeploymentSummary,
): boolean {
  return (
    deployment.status === "Progressing" || deployment.status === "Degraded"
  );
}

export function deploymentMatchesSearch(
  deployment: DeploymentSummary,
  query: string,
): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  const images = deployment.images ?? [];
  const selector = deployment.selector ?? {};
  return (
    deployment.name.toLowerCase().includes(needle) ||
    deployment.namespace.toLowerCase().includes(needle) ||
    deployment.status.toLowerCase().includes(needle) ||
    images.some((image) => image.toLowerCase().includes(needle)) ||
    Object.entries(selector).some(([key, value]) =>
      `${key}=${value}`.toLowerCase().includes(needle),
    )
  );
}
