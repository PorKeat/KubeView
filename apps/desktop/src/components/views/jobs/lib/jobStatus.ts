import type { JobSummary } from "@kubeview/contracts";

export type JobStatusFilter =
  "all" | "running" | "complete" | "failed" | "suspended";
export type JobBeaconVariant =
  "healthy" | "warning" | "critical" | "pending" | "muted";

export function isJobRunning(job: JobSummary): boolean {
  return job.status === "Running" || job.status === "Pending";
}
export function isJobComplete(job: JobSummary): boolean {
  return job.status === "Complete";
}
export function isJobFailed(job: JobSummary): boolean {
  return job.status === "Failed";
}
export function isJobSuspended(job: JobSummary): boolean {
  return job.status === "Suspended";
}

export function jobMatchesStatus(job: JobSummary, filter: string): boolean {
  switch (filter) {
    case "running":
      return isJobRunning(job);
    case "complete":
      return isJobComplete(job);
    case "failed":
      return isJobFailed(job);
    case "suspended":
      return isJobSuspended(job);
    default:
      return true;
  }
}

export function getJobBeaconVariant(job: JobSummary): JobBeaconVariant {
  switch (job.status) {
    case "Complete":
      return "healthy";
    case "Failed":
      return "critical";
    case "Suspended":
      return "warning";
    case "Running":
      return "pending";
    default:
      return "muted";
  }
}

export function getJobStatusPulse(job: JobSummary): boolean {
  return job.status === "Running";
}

export function jobMatchesSearch(job: JobSummary, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return (
    job.name.toLowerCase().includes(needle) ||
    job.namespace.toLowerCase().includes(needle) ||
    job.status.toLowerCase().includes(needle) ||
    (job.ownerCronJob ?? "").toLowerCase().includes(needle) ||
    job.completionMode.toLowerCase().includes(needle) ||
    (job.images ?? []).some((image) => image.toLowerCase().includes(needle)) ||
    Object.entries(job.selector ?? {}).some(([k, v]) =>
      `${k}=${v}`.toLowerCase().includes(needle),
    )
  );
}
