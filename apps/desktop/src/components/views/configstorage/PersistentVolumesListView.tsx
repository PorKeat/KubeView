"use client";

import * as React from "react";
import { HardDrive } from "lucide-react";
import type { PersistentVolumeSummary } from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import { useResourceActions } from "../shared/useResourceActions";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "../networking/NetworkingResourcePage";
import { volumeMatches, volumeStatus } from "./configStorageUtils";

export function PersistentVolumesView() {
  const [filter, setFilter] = React.useState("all");
  const { editResource, deleteResource, createResource } = useResourceActions();
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
      onEdit={(item) =>
        editResource(
          "PersistentVolume",
          item.name,
          "",
          item.status,
          item as unknown as Record<string, unknown>,
        )
      }
      onDelete={(item) => deleteResource("PersistentVolume", item.name)}
      onCreate={() => createResource("PersistentVolume")}
      testIdPrefix="persistentvolumes"
      autoRefresh={false}
      clusterScoped
      codeCommand={() => "kubectl get pv"}
      emptyDescription="PersistentVolumes are cluster-scoped storage resources."
    />
  );
}
