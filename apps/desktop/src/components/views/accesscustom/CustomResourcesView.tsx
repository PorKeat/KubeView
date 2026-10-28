"use client";

import * as React from "react";
import { Boxes } from "lucide-react";
import type { CRDSummary } from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import { useResourceActions } from "../shared/useResourceActions";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
  type NetworkingStatusDescriptor,
} from "../networking/NetworkingResourcePage";

function crdMatches(item: CRDSummary, query: string): boolean {
  if (!query) return true;
  return (
    item.name.toLowerCase().includes(query) ||
    item.group.toLowerCase().includes(query) ||
    item.kind.toLowerCase().includes(query) ||
    item.plural.toLowerCase().includes(query) ||
    item.scope.toLowerCase().includes(query) ||
    item.versions.some((version) => version.name.toLowerCase().includes(query))
  );
}

function scopeStatus(scope: string): NetworkingStatusDescriptor {
  return scope.toLowerCase() === "cluster"
    ? { label: "Cluster", variant: "muted" }
    : { label: "Namespaced", variant: "pending" };
}

export function CustomResourcesView() {
  const [filter, setFilter] = React.useState("all");
  const { editResource, deleteResource, createResource } = useResourceActions();
  const {
    crds,
    totalCRDsCount,
    isCRDsLoading,
    hasLoadedCRDsOnce,
    loadCRDs,
    currentContext,
    openInspector,
  } = useClusterStore();

  React.useEffect(() => {
    if (currentContext) void loadCRDs();
  }, [currentContext, loadCRDs]);

  const refresh = React.useCallback(() => {
    void loadCRDs();
  }, [loadCRDs]);

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: crds.length },
      {
        id: "Namespaced",
        label: "Namespaced",
        count: crds.filter((item) => item.scope === "Namespaced").length,
      },
      {
        id: "Cluster",
        label: "Cluster",
        count: crds.filter((item) => item.scope === "Cluster").length,
      },
    ],
    [crds],
  );

  const columns = React.useMemo<NetworkingColumn<CRDSummary>[]>(
    () => [
      {
        key: "group",
        label: "Group",
        widthClass: "w-[18%]",
        sortValue: (item) => item.group,
        render: (item) => (
          <span
            className="block truncate font-mono text-[10px] text-[var(--muted)]"
            title={item.group}
          >
            {item.group}
          </span>
        ),
      },
      {
        key: "kind",
        label: "Kind",
        widthClass: "w-[12%]",
        sortValue: (item) => item.kind,
        render: (item) => (
          <span className="font-mono text-[10px] text-[var(--foreground)]">
            {item.kind}
          </span>
        ),
      },
      {
        key: "versions",
        label: "Versions",
        widthClass: "w-[20%]",
        render: (item) => (
          <span
            className="block truncate font-mono text-[10px] text-[var(--muted)]"
            title={item.versions.map((version) => version.name).join(", ")}
          >
            {item.versions
              .filter((version) => version.served)
              .map((version) => version.name)
              .join(", ") || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <NetworkingResourcePage
      icon={Boxes}
      nounSingular="CRD"
      nounPlural="CRDs"
      items={crds}
      totalCount={totalCRDsCount}
      isLoading={isCRDsLoading}
      hasLoadedOnce={hasLoadedCRDsOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter CRDs by group, kind, plural, scope..."
      matchesSearch={crdMatches}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={(item, value) => value === "all" || item.scope === value}
      columns={columns}
      getKey={(item) => item.name}
      getName={(item) => item.name}
      getNamespace={() => ""}
      getStatus={(item) => scopeStatus(item.scope)}
      getAge={(item) => item.age}
      getCreationTimestamp={(item) => item.creationTimestamp}
      onRowClick={(item) =>
        openInspector({
          kind: "CustomResourceDefinition",
          name: item.name,
          namespace: "",
          status: item.scope,
          data: item as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(item) => `kubectl describe crd ${item.name}`}
      onEdit={(item) =>
        editResource(
          "CustomResourceDefinition",
          item.name,
          "",
          item.scope,
          item as unknown as Record<string, unknown>,
        )
      }
      onDelete={(item) => deleteResource("CustomResourceDefinition", item.name)}
      onCreate={() => createResource("CustomResourceDefinition")}
      testIdPrefix="crds"
      clusterScoped
      autoRefresh={false}
      codeCommand={() => "kubectl get crds"}
      emptyDescription="CustomResourceDefinitions extend Kubernetes with additional API resources."
    />
  );
}
