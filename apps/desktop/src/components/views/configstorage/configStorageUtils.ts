import type {
  ConfigMapSummary,
  SecretSummary,
  PersistentVolumeSummary,
  StorageClassSummary,
} from "@kubeview/contracts";
import type { NetworkingStatusDescriptor } from "../networking/NetworkingResourcePage";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function configMapMatches(cm: ConfigMapSummary, query: string): boolean {
  if (!query) return true;
  return (
    cm.name.toLowerCase().includes(query) ||
    cm.namespace.toLowerCase().includes(query) ||
    cm.keys.some((key) => key.toLowerCase().includes(query)) ||
    Object.entries(cm.labels ?? {}).some(([key, value]) =>
      `${key}=${value}`.toLowerCase().includes(query),
    )
  );
}

export function secretMatches(secret: SecretSummary, query: string): boolean {
  if (!query) return true;
  return (
    secret.name.toLowerCase().includes(query) ||
    secret.namespace.toLowerCase().includes(query) ||
    secret.type.toLowerCase().includes(query) ||
    secret.keys.some((key) => key.toLowerCase().includes(query))
  );
}

export function volumeMatches(
  volume: PersistentVolumeSummary,
  query: string,
): boolean {
  if (!query) return true;
  return (
    volume.name.toLowerCase().includes(query) ||
    (volume.claim ?? "").toLowerCase().includes(query) ||
    (volume.storageClass ?? "").toLowerCase().includes(query) ||
    volume.status.toLowerCase().includes(query) ||
    volume.reclaimPolicy.toLowerCase().includes(query) ||
    volume.accessModes.some((mode) => mode.toLowerCase().includes(query))
  );
}

export function storageClassMatches(
  storageClass: StorageClassSummary,
  query: string,
): boolean {
  if (!query) return true;
  return (
    storageClass.name.toLowerCase().includes(query) ||
    storageClass.provisioner.toLowerCase().includes(query) ||
    storageClass.reclaimPolicy.toLowerCase().includes(query) ||
    storageClass.volumeBindingMode.toLowerCase().includes(query)
  );
}

const SECRET_TYPE_META: Record<string, { label: string; className: string }> = {
  Opaque: {
    label: "Opaque",
    className:
      "border-[var(--border)] bg-black/5 text-[var(--muted)] dark:bg-white/5",
  },
  "kubernetes.io/tls": {
    label: "TLS",
    className:
      "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  "kubernetes.io/dockerconfigjson": {
    label: "Docker config",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "kubernetes.io/dockercfg": {
    label: "Docker config",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "kubernetes.io/service-account-token": {
    label: "SA token",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  "kubernetes.io/basic-auth": {
    label: "Basic auth",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "kubernetes.io/ssh-auth": {
    label: "SSH auth",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "bootstrap.kubernetes.io/token": {
    label: "Bootstrap",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  "helm.sh/release.v1": {
    label: "Helm release",
    className:
      "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
};

export function secretTypeMeta(type: string) {
  const normalized = type || "Opaque";
  const known = SECRET_TYPE_META[normalized];
  if (known) return known;
  const short = normalized.split("/").pop() || normalized;
  return {
    label: short.length > 18 ? `${short.slice(0, 16)}…` : short,
    className:
      "border-[var(--border)] bg-black/5 text-[var(--muted)] dark:bg-white/5",
  };
}

export function immutableStatus(value: boolean): NetworkingStatusDescriptor {
  return value
    ? { label: "Immutable", variant: "warning" }
    : { label: "Active", variant: "healthy" };
}

export function volumeStatus(status: string): NetworkingStatusDescriptor {
  switch (status) {
    case "Bound":
      return { label: "Bound", variant: "healthy" };
    case "Available":
      return { label: "Available", variant: "pending" };
    case "Released":
      return { label: "Released", variant: "warning" };
    case "Failed":
      return { label: "Failed", variant: "critical" };
    default:
      return { label: status || "Unknown", variant: "muted" };
  }
}

export function storageClassStatus(
  storageClass: StorageClassSummary,
): NetworkingStatusDescriptor {
  return storageClass.default
    ? { label: "Default", variant: "healthy" }
    : { label: "Available", variant: "muted" };
}
