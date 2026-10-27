"use client";

import * as React from "react";
import { FolderLock } from "lucide-react";
import type { SecretSummary } from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "../networking/NetworkingResourcePage";
import {
  immutableStatus,
  secretMatches,
  secretTypeMeta,
} from "./configStorageUtils";

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
