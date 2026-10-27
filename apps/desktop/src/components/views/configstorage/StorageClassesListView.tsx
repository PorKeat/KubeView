"use client";

import * as React from "react";
import { Database } from "lucide-react";
import type { StorageClassSummary } from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "../networking/NetworkingResourcePage";
import { storageClassMatches, storageClassStatus } from "./configStorageUtils";

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
