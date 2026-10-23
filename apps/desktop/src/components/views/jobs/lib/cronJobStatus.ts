import type { CronJobSummary } from "@kubeview/contracts";

export type CronJobStatusFilter = "all" | "active" | "idle" | "suspended";
export type CronJobBeaconVariant = "healthy" | "warning" | "critical" | "pending" | "muted";

export function isCronJobActive(cj: CronJobSummary): boolean { return cj.status === "Active"; }
export function isCronJobIdle(cj: CronJobSummary): boolean { return cj.status === "Idle"; }
export function isCronJobSuspended(cj: CronJobSummary): boolean { return cj.status === "Suspended"; }

export function cronJobMatchesStatus(cj: CronJobSummary, filter: string): boolean {
  switch (filter) {
    case "active": return isCronJobActive(cj);
    case "idle": return isCronJobIdle(cj);
    case "suspended": return isCronJobSuspended(cj);
    default: return true;
  }
}

export function getCronJobBeaconVariant(cj: CronJobSummary): CronJobBeaconVariant {
  switch (cj.status) {
    case "Active": return "healthy";
    case "Suspended": return "warning";
    case "Idle": return "muted";
    default: return "muted";
  }
}

export function getCronJobStatusPulse(cj: CronJobSummary): boolean { return cj.status === "Active"; }

export function cronJobMatchesSearch(cj: CronJobSummary, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return (
    cj.name.toLowerCase().includes(needle) ||
    cj.namespace.toLowerCase().includes(needle) ||
    cj.status.toLowerCase().includes(needle) ||
    cj.schedule.toLowerCase().includes(needle) ||
    (cj.timeZone ?? "").toLowerCase().includes(needle) ||
    cj.concurrencyPolicy.toLowerCase().includes(needle) ||
    (cj.images ?? []).some((image) => image.toLowerCase().includes(needle)) ||
    Object.entries(cj.selector ?? {}).some(([k, v]) => `${k}=${v}`.toLowerCase().includes(needle))
  );
}
