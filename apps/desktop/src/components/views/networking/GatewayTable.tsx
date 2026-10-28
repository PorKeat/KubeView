"use client";

import * as React from "react";
import { Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";
import { resourceTarget } from "@/lib/resourceKinds";
import { useResourceActions } from "@/components/views/shared/useResourceActions";
import { useClusterStore } from "@/stores/clusterStore";
import type { GatewayResourceSummary } from "@kubeview/contracts";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "./NetworkingResourcePage";
import {
  GATEWAY_KINDS,
  GATEWAY_KIND_TONES,
  gatewayMatchesFilter,
  gatewayMatchesSearch,
  gatewayStatus,
} from "./ingressHelpers";

export function GatewayTable({
  filter,
  setFilter,
}: {
  filter: string;
  setFilter: (filter: string) => void;
}) {
  const { createResource } = useResourceActions();
  const {
    gatewayResources,
    totalGatewayResourcesCount,
    isGatewayResourcesLoading,
    hasLoadedGatewayResourcesOnce,
    gatewayApiAvailable,
    loadGatewayResources,
    currentNamespace,
    openInspector,
    openDeleteResource,
  } = useClusterStore();

  const refresh = React.useCallback(() => {
    loadGatewayResources(currentNamespace);
  }, [loadGatewayResources, currentNamespace]);

  const scopedGateways = React.useMemo(
    () =>
      currentNamespace === "all"
        ? gatewayResources
        : gatewayResources.filter(
            (resource) =>
              resource.namespace &&
              resource.namespace.toLowerCase() ===
                currentNamespace.toLowerCase(),
          ),
    [gatewayResources, currentNamespace],
  );

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: scopedGateways.length },
      ...GATEWAY_KINDS.map((kind) => ({
        id: kind,
        label: kind,
        count: scopedGateways.filter((resource) => resource.kind === kind)
          .length,
      })),
    ],
    [scopedGateways],
  );

  const columns = React.useMemo<NetworkingColumn<GatewayResourceSummary>[]>(
    () => [
      {
        key: "kind",
        label: "Kind",
        widthClass: "w-[8%]",
        sortValue: (resource) => resource.kind,
        render: (resource) => (
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border",
              GATEWAY_KIND_TONES[resource.kind] ??
                "bg-black/5 dark:bg-white/5 text-[var(--muted)] border-[var(--border)]",
            )}
            title={`Gateway API kind: ${resource.kind}`}
          >
            {resource.kind}
          </span>
        ),
      },
      {
        key: "class",
        label: "Class / Parents",
        widthClass: "w-[11%]",
        sortValue: (resource) => resource.class ?? "",
        render: (resource) =>
          resource.class ? (
            <span
              className="font-mono text-[10px] text-[var(--foreground)] truncate block"
              title={resource.class}
            >
              {resource.class}
            </span>
          ) : (
            <span className="text-[10px] text-[var(--muted)] italic">—</span>
          ),
      },
      {
        key: "hosts",
        label: "Hosts",
        widthClass: "w-[12%]",
        sortValue: (resource) => resource.hosts.join(","),
        render: (resource) =>
          resource.hosts.length === 0 ? (
            <span className="text-[10px] text-[var(--muted)] italic">—</span>
          ) : (
            <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
              {resource.hosts.slice(0, 1).map((host) => (
                <span
                  key={host}
                  className="inline-flex max-w-full items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 truncate"
                  title={host}
                >
                  {host}
                </span>
              ))}
              {resource.hosts.length > 1 && (
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  +{resource.hosts.length - 1}
                </span>
              )}
            </div>
          ),
      },
      {
        key: "addresses",
        label: "Addresses",
        widthClass: "w-[9%]",
        render: (resource) =>
          resource.addresses.length === 0 ? (
            <span className="text-[10px] text-[var(--muted)] italic">—</span>
          ) : (
            <span
              className="font-mono text-[10px] text-[var(--foreground)] truncate block"
              title={resource.addresses.join(", ")}
            >
              {resource.addresses.join(", ")}
            </span>
          ),
      },
      {
        key: "rules",
        label: "Rules / Listeners",
        widthClass: "w-[9%]",
        sortValue: (resource) => resource.ruleCount || resource.listenerCount,
        render: (resource) =>
          resource.kind === "Gateway" ? (
            <span className="font-mono text-[10px] text-[var(--muted)]">
              {resource.listenerCount} listener
              {resource.listenerCount === 1 ? "" : "s"}
            </span>
          ) : resource.kind === "GatewayClass" ? (
            <span className="text-[10px] text-[var(--muted)] italic">—</span>
          ) : (
            <span className="font-mono text-[10px] text-[var(--muted)]">
              {resource.ruleCount} rule
              {resource.ruleCount === 1 ? "" : "s"}
            </span>
          ),
      },
    ],
    [],
  );

  return (
    <NetworkingResourcePage
      key="gateways"
      icon={Waypoints}
      nounSingular="Gateway resource"
      nounPlural="Gateway API resources"
      items={gatewayResources}
      totalCount={totalGatewayResourcesCount}
      isLoading={isGatewayResourcesLoading}
      hasLoadedOnce={hasLoadedGatewayResourcesOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter Gateway API resources by kind, name, class, host..."
      matchesSearch={gatewayMatchesSearch}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={gatewayMatchesFilter}
      columns={columns}
      getKey={(resource) =>
        `${resource.kind}/${resource.namespace ?? "cluster"}/${resource.name}`
      }
      getName={(resource) => resource.name}
      getNamespace={(resource) => resource.namespace ?? "Cluster Scope"}
      getStatus={gatewayStatus}
      getAge={(resource) => resource.age}
      getCreationTimestamp={(resource) => resource.creationTimestamp}
      onRowClick={(resource) =>
        openInspector({
          kind: resource.kind,
          name: resource.name,
          namespace: resource.namespace || "Cluster Scope",
          status: resource.status,
          data: resource as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(resource) =>
        `kubectl describe ${resource.kind.toLowerCase()} ${resource.name}${resource.namespace ? ` -n ${resource.namespace}` : ""}`
      }
      onEdit={(resource) =>
        openInspector({
          kind: resource.kind,
          name: resource.name,
          namespace: resource.namespace || "Cluster Scope",
          status: resource.status,
          data: resource as unknown as Record<string, unknown>,
          initialTab: "edit",
        })
      }
      onDelete={(resource) => {
        const target = resourceTarget(
          resource.kind,
          resource.name,
          resource.namespace,
        );
        if (target) openDeleteResource(target);
      }}
      onCreate={() => createResource("Gateway", currentNamespace)}
      testIdPrefix="gateways"
      codeCommand={(namespace) => `kubectl get gateways -n ${namespace}`}
      emptyDescription={
        gatewayApiAvailable
          ? "GatewayClass, Gateway, HTTPRoute and GRPCRoute resources are not present in this scope."
          : "Gateway API CRDs (GatewayClass, Gateway, HTTPRoute, GRPCRoute) were not detected on the connected cluster."
      }
    />
  );
}
