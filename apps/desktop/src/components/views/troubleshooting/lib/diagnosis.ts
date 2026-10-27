import type {
  PodDiagnosisSeverity,
  PodDiagnosisStatus,
} from "@kubeview/contracts";

export function severityMeta(severity: PodDiagnosisSeverity) {
  switch (severity) {
    case "critical":
      return { label: "Critical", variant: "critical" as const };
    case "warning":
      return { label: "Needs attention", variant: "warning" as const };
    case "info":
      return { label: "Informational", variant: "pending" as const };
    default:
      return { label: "Healthy", variant: "healthy" as const };
  }
}

export function statusMeta(status: PodDiagnosisStatus) {
  switch (status) {
    case "pass":
      return { label: "Pass", variant: "healthy" as const };
    case "warning":
      return { label: "Warning", variant: "warning" as const };
    case "fail":
      return { label: "Fail", variant: "critical" as const };
    default:
      return { label: "Skipped", variant: "muted" as const };
  }
}

export function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "just now";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatBytes(value?: number): string {
  if (!value || value <= 0) return "—";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatMillicores(value?: number): string {
  if (value === undefined) return "—";
  return `${value}m`;
}

export function issueSeverityClasses(severity: PodDiagnosisSeverity): string {
  switch (severity) {
    case "critical":
      return "border-rose-500/25 bg-rose-500/[0.04]";
    case "warning":
      return "border-amber-500/25 bg-amber-500/[0.04]";
    case "info":
      return "border-sky-500/20 bg-sky-500/[0.03]";
    default:
      return "border-emerald-500/20 bg-emerald-500/[0.03]";
  }
}
