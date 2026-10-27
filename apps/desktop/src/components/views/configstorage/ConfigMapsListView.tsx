"use client";

import * as React from "react";
import { FileCode } from "lucide-react";
import type { ConfigMapSummary } from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "../networking/NetworkingResourcePage";
import {
  configMapMatches,
  formatBytes,
  immutableStatus,
} from "./configStorageUtils";

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
