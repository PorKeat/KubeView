"use client";

import * as React from "react";
import { FileCode, FolderLock, HardDrive, Database } from "lucide-react";
import type {
  ConfigMapSummary,
  SecretSummary,
  PersistentVolumeSummary,
  StorageClassSummary,
} from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
  type NetworkingStatusDescriptor,
} from "../networking/NetworkingResourcePage";

function formatBytes(bytes: number): string {
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

function configMapMatches(cm: ConfigMapSummary, query: string): boolean {
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

function secretMatches(secret: SecretSummary, query: string): boolean {
  if (!query) return true;
  return (
    secret.name.toLowerCase().includes(query) ||
    secret.namespace.toLowerCase().includes(query) ||
    secret.type.toLowerCase().includes(query) ||
    secret.keys.some((key) => key.toLowerCase().includes(query))
  );
}

function volumeMatches(
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

function storageClassMatches(
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

function secretTypeMeta(type: string) {
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

function immutableStatus(value: boolean): NetworkingStatusDescriptor {
  return value
    ? { label: "Immutable", variant: "warning" }
    : { label: "Active", variant: "healthy" };
}

function volumeStatus(status: string): NetworkingStatusDescriptor {
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

function storageClassStatus(
  storageClass: StorageClassSummary,
): NetworkingStatusDescriptor {
  return storageClass.default
    ? { label: "Default", variant: "healthy" }
    : { label: "Available", variant: "muted" };
}

export function ConfigMapsListView() {
  const [filter, setFilter] = React.useState("all");
  const {
    configMaps,
    totalConfigMapsCount,
    isConfigMapsLoading,
    hasLoadedConfigMapsOnce,
    loadConfigMaps,
    currentContext,
    currentNamespace,
    openInspector,
  } = useClusterStore();

  React.useEffect(() => {
    if (currentContext) void loadConfigMaps(currentNamespace);
  }, [currentContext, currentNamespace, loadConfigMaps]);

  const refresh = React.useCallback(() => {
    void loadConfigMaps(currentNamespace);
  }, [currentNamespace, loadConfigMaps]);

  const scoped = React.useMemo(
    () =>
      currentNamespace === "all"
        ? configMaps
        : configMaps.filter(
            (item) =>
              item.namespace.toLowerCase() === currentNamespace.toLowerCase(),
          ),
    [configMaps, currentNamespace],
  );

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: scoped.length },
      {
        id: "immutable",
        label: "Immutable",
        count: scoped.filter((item) => item.immutable).length,
      },
      {
        id: "mutable",
        label: "Mutable",
        count: scoped.filter((item) => !item.immutable).length,
      },
    ],
    [scoped],
  );

  const columns = React.useMemo<NetworkingColumn<ConfigMapSummary>[]>(
    () => [
      {
        key: "keys",
        label: "Keys",
        widthClass: "w-[9%]",
        sortValue: (item) => item.dataKeyCount + item.binaryKeyCount,
        render: (item) => (
          <span className="font-mono tabular-nums text-[var(--foreground)]">
            {item.dataKeyCount + item.binaryKeyCount}
            {item.binaryKeyCount > 0 && (
              <span className="ml-1 text-[10px] text-[var(--muted)]">
                ({item.binaryKeyCount} bin)
              </span>
            )}
          </span>
        ),
      },
      {
        key: "size",
        label: "Size",
        widthClass: "w-[9%]",
        sortValue: (item) => item.sizeBytes,
        render: (item) => (
          <span className="font-mono text-[var(--muted)]">
            {formatBytes(item.sizeBytes)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <NetworkingResourcePage
      icon={FileCode}
      nounSingular="ConfigMap"
      nounPlural="configmaps"
      items={configMaps}
      totalCount={totalConfigMapsCount}
      isLoading={isConfigMapsLoading}
      hasLoadedOnce={hasLoadedConfigMapsOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter configmaps by name, namespace, key..."
      matchesSearch={configMapMatches}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={(item, filter) =>
        filter === "all" ||
        (filter === "immutable" ? item.immutable : !item.immutable)
      }
      columns={columns}
      getKey={(item) => `${item.namespace}/${item.name}`}
      getName={(item) => item.name}
      getNamespace={(item) => item.namespace}
      getStatus={(item) => immutableStatus(item.immutable)}
      getAge={(item) => item.age}
      getCreationTimestamp={(item) => item.creationTimestamp}
      onRowClick={(item) =>
        openInspector({
          kind: "ConfigMap",
          name: item.name,
          namespace: item.namespace,
          status: item.immutable ? "Immutable" : "Active",
          data: item as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(item) =>
        `kubectl describe configmap ${item.name} -n ${item.namespace}`
      }
      onEdit={(item) =>
        openInspector({
          kind: "ConfigMap",
          name: item.name,
          namespace: item.namespace,
          status: item.immutable ? "Immutable" : "Active",
          data: item as unknown as Record<string, unknown>,
          initialTab: "edit",
        })
      }
      testIdPrefix="configmaps"
      autoRefresh={false}
      codeCommand={(namespace) => `kubectl get configmaps -n ${namespace}`}
      emptyDescription="ConfigMaps provide non-sensitive configuration data to pods."
    />
  );
}

export function SecretsListView() {
  const [filter, setFilter] = React.useState("all");
  const {
    secrets,
    totalSecretsCount,
    isSecretsLoading,
    hasLoadedSecretsOnce,
    loadSecrets,
    currentContext,
    currentNamespace,
    openInspector,
  } = useClusterStore();

  React.useEffect(() => {
    if (currentContext) void loadSecrets(currentNamespace);
  }, [currentContext, currentNamespace, loadSecrets]);

  const refresh = React.useCallback(() => {
    void loadSecrets(currentNamespace);
  }, [currentNamespace, loadSecrets]);

  const scoped = React.useMemo(
    () =>
      currentNamespace === "all"
        ? secrets
        : secrets.filter(
            (item) =>
              item.namespace.toLowerCase() === currentNamespace.toLowerCase(),
          ),
    [secrets, currentNamespace],
  );

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(() => {
    const typeCounts = new Map<string, number>();
    for (const item of scoped) {
      const type = item.type || "Opaque";
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }
    return [
      { id: "all", label: "All", count: scoped.length },
      ...Array.from(typeCounts.entries())
        .sort(
          (left, right) =>
            right[1] - left[1] || left[0].localeCompare(right[0]),
        )
        .map(([type, count]) => ({
          id: type,
          label: secretTypeMeta(type).label,
          count,
        })),
    ];
  }, [scoped]);

  const columns = React.useMemo<NetworkingColumn<SecretSummary>[]>(
    () => [
      {
        key: "type",
        label: "Type",
        widthClass: "w-[18%]",
        sortValue: (item) => item.type,
        render: (item) => {
          const meta = secretTypeMeta(item.type);
          return (
            <span
              className={`inline-flex h-4 max-w-full items-center truncate rounded border px-1.5 font-mono text-[9px] leading-none ${meta.className}`}
              title={item.type || "Opaque"}
            >
              {meta.label}
            </span>
          );
        },
      },
      {
        key: "keys",
        label: "Keys",
        widthClass: "w-[8%]",
        sortValue: (item) => item.dataKeyCount,
        render: (item) => (
          <span className="font-mono text-[11px] tabular-nums text-[var(--foreground)]">
            {item.dataKeyCount}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <NetworkingResourcePage
      icon={FolderLock}
      nounSingular="Secret"
      nounPlural="secrets"
      items={secrets}
      totalCount={totalSecretsCount}
      isLoading={isSecretsLoading}
      hasLoadedOnce={hasLoadedSecretsOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter secrets by name, namespace, type..."
      matchesSearch={secretMatches}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={(item, filter) =>
        filter === "all" || (item.type || "Opaque") === filter
      }
      columns={columns}
      getKey={(item) => `${item.namespace}/${item.name}`}
      getName={(item) => item.name}
      getNamespace={(item) => item.namespace}
      getStatus={(item) => immutableStatus(item.immutable)}
      getAge={(item) => item.age}
      getCreationTimestamp={(item) => item.creationTimestamp}
      onRowClick={(item) =>
        openInspector({
          kind: "Secret",
          name: item.name,
          namespace: item.namespace,
          status: item.immutable ? "Immutable" : "Active",
          data: item as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(item) =>
        `kubectl describe secret ${item.name} -n ${item.namespace}`
      }
      onEdit={(item) =>
        openInspector({
          kind: "Secret",
          name: item.name,
          namespace: item.namespace,
          status: item.immutable ? "Immutable" : "Active",
          data: item as unknown as Record<string, unknown>,
          initialTab: "edit",
        })
      }
      testIdPrefix="secrets"
      autoRefresh={false}
      codeCommand={(namespace) => `kubectl get secrets -n ${namespace}`}
      emptyDescription="Secret values are never shown in this view. Only name, namespace, type, key count, and age are listed."
    />
  );
}

export function PersistentVolumesView() {
  const [filter, setFilter] = React.useState("all");
  const {
    persistentVolumes,
    totalPersistentVolumesCount,
    isPersistentVolumesLoading,
    hasLoadedPersistentVolumesOnce,
    loadPersistentVolumes,
    currentContext,
    openInspector,
  } = useClusterStore();

  React.useEffect(() => {
    if (currentContext) void loadPersistentVolumes();
  }, [currentContext, loadPersistentVolumes]);

  const refresh = React.useCallback(() => {
    void loadPersistentVolumes();
  }, [loadPersistentVolumes]);

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: persistentVolumes.length },
      {
        id: "bound",
        label: "Bound",
        count: persistentVolumes.filter((item) => item.status === "Bound")
          .length,
      },
      {
        id: "available",
        label: "Available",
        count: persistentVolumes.filter((item) => item.status === "Available")
          .length,
      },
      {
        id: "released",
        label: "Released",
        count: persistentVolumes.filter((item) => item.status === "Released")
          .length,
        warn: true,
      },
    ],
    [persistentVolumes],
  );

  const columns = React.useMemo<NetworkingColumn<PersistentVolumeSummary>[]>(
    () => [
      {
        key: "capacity",
        label: "Capacity",
        widthClass: "w-[8%]",
        sortValue: (item) => item.capacity,
        render: (item) => (
          <span className="font-mono text-[var(--foreground)]">
            {item.capacity}
          </span>
        ),
      },
      {
        key: "accessModes",
        label: "Access",
        widthClass: "w-[12%]",
        render: (item) => (
          <span
            className="block truncate font-mono text-[10px] text-[var(--muted)]"
            title={item.accessModes.join(", ")}
          >
            {item.accessModes.join(", ") || "—"}
          </span>
        ),
      },
      {
        key: "reclaim",
        label: "Reclaim",
        widthClass: "w-[8%]",
        sortValue: (item) => item.reclaimPolicy,
        render: (item) => (
          <span className="font-mono text-[10px] text-[var(--muted)]">
            {item.reclaimPolicy}
          </span>
        ),
      },
      {
        key: "claim",
        label: "Claim",
        widthClass: "w-[14%]",
        sortValue: (item) => item.claim ?? "",
        render: (item) => (
          <span
            className="block truncate font-mono text-[10px] text-[var(--muted)]"
            title={item.claim}
          >
            {item.claim || "—"}
          </span>
        ),
      },
      {
        key: "class",
        label: "Storage class",
        widthClass: "w-[9%]",
        sortValue: (item) => item.storageClass ?? "",
        render: (item) => (
          <span
            className="block truncate font-mono text-[10px] text-[var(--muted)]"
            title={item.storageClass}
          >
            {item.storageClass || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <NetworkingResourcePage
      icon={HardDrive}
      nounSingular="PersistentVolume"
      nounPlural="persistent volumes"
      items={persistentVolumes}
      totalCount={totalPersistentVolumesCount}
      isLoading={isPersistentVolumesLoading}
      hasLoadedOnce={hasLoadedPersistentVolumesOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter persistent volumes by name, claim, class..."
      matchesSearch={volumeMatches}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={(item, filter) =>
        filter === "all" || item.status.toLowerCase() === filter
      }
      columns={columns}
      getKey={(item) => item.name}
      getName={(item) => item.name}
      getNamespace={() => ""}
      getStatus={(item) => volumeStatus(item.status)}
      getAge={(item) => item.age}
      getCreationTimestamp={(item) => item.creationTimestamp}
      onRowClick={(item) =>
        openInspector({
          kind: "PersistentVolume",
          name: item.name,
          namespace: "",
          status: item.status,
          data: item as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(item) => `kubectl describe pv ${item.name}`}
      testIdPrefix="persistentvolumes"
      autoRefresh={false}
      clusterScoped
      codeCommand={() => "kubectl get pv"}
      emptyDescription="PersistentVolumes are cluster-scoped storage resources."
    />
  );
}

export function StorageClassesView() {
  const [filter, setFilter] = React.useState("all");
  const {
    storageClasses,
    totalStorageClassesCount,
    isStorageClassesLoading,
    hasLoadedStorageClassesOnce,
    loadStorageClasses,
    currentContext,
    openInspector,
  } = useClusterStore();

  React.useEffect(() => {
    if (currentContext) void loadStorageClasses();
  }, [currentContext, loadStorageClasses]);

  const refresh = React.useCallback(() => {
    void loadStorageClasses();
  }, [loadStorageClasses]);

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: storageClasses.length },
      {
        id: "default",
        label: "Default",
        count: storageClasses.filter((item) => item.default).length,
      },
      {
        id: "custom",
        label: "Custom",
        count: storageClasses.filter((item) => !item.default).length,
      },
    ],
    [storageClasses],
  );

  const columns = React.useMemo<NetworkingColumn<StorageClassSummary>[]>(
    () => [
      {
        key: "provisioner",
        label: "Provisioner",
        widthClass: "w-[16%]",
        sortValue: (item) => item.provisioner,
        render: (item) => (
          <span
            className="block truncate font-mono text-[10px] text-[var(--muted)]"
            title={item.provisioner}
          >
            {item.provisioner}
          </span>
        ),
      },
      {
        key: "reclaim",
        label: "Reclaim",
        widthClass: "w-[8%]",
        sortValue: (item) => item.reclaimPolicy,
        render: (item) => (
          <span className="font-mono text-[10px] text-[var(--muted)]">
            {item.reclaimPolicy}
          </span>
        ),
      },
      {
        key: "binding",
        label: "Binding",
        widthClass: "w-[10%]",
        sortValue: (item) => item.volumeBindingMode,
        render: (item) => (
          <span className="font-mono text-[10px] text-[var(--muted)]">
            {item.volumeBindingMode}
          </span>
        ),
      },
      {
        key: "expansion",
        label: "Expansion",
        widthClass: "w-[8%]",
        sortValue: (item) => (item.allowVolumeExpansion ? 1 : 0),
        render: (item) => (
          <span className="font-mono text-[10px] text-[var(--muted)]">
            {item.allowVolumeExpansion ? "Allowed" : "Off"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <NetworkingResourcePage
      icon={Database}
      nounSingular="StorageClass"
      nounPlural="storage classes"
      items={storageClasses}
      totalCount={totalStorageClassesCount}
      isLoading={isStorageClassesLoading}
      hasLoadedOnce={hasLoadedStorageClassesOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter storage classes by name, provisioner..."
      matchesSearch={storageClassMatches}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={(item, filter) =>
        filter === "all" ||
        (filter === "default" ? item.default : !item.default)
      }
      columns={columns}
      getKey={(item) => item.name}
      getName={(item) => item.name}
      getNamespace={() => ""}
      getStatus={storageClassStatus}
      getAge={(item) => item.age}
      getCreationTimestamp={(item) => item.creationTimestamp}
      onRowClick={(item) =>
        openInspector({
          kind: "StorageClass",
          name: item.name,
          namespace: "",
          status: item.default ? "Default" : "Available",
          data: item as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(item) => `kubectl describe storageclass ${item.name}`}
      testIdPrefix="storageclasses"
      autoRefresh={false}
      clusterScoped
      codeCommand={() => "kubectl get storageclasses"}
      emptyDescription="StorageClasses define how PersistentVolumes are provisioned."
    />
  );
}
