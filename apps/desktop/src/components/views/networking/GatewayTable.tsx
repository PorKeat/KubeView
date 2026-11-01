"use client";

import * as React from "react";
import { Waypoints, X } from "lucide-react";
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
  const [showCreatePicker, setShowCreatePicker] = React.useState(false);
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
    <>
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
        onCreate={() => setShowCreatePicker(true)}
        testIdPrefix="gateways"
        codeCommand={(namespace) => `kubectl get gateways -n ${namespace}`}
        emptyDescription={
          gatewayApiAvailable
            ? "GatewayClass, Gateway, HTTPRoute and GRPCRoute resources are not present in this scope."
            : "Gateway API CRDs (GatewayClass, Gateway, HTTPRoute, GRPCRoute) were not detected on the connected cluster."
        }
      />

      {showCreatePicker && (
        <div
          data-testid="gateway-create-picker"
          role="dialog"
          aria-modal="true"
          aria-label="Create Gateway API resource"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
        >
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setShowCreatePicker(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Create Gateway API resource
              </h2>
              <button
                type="button"
                onClick={() => setShowCreatePicker(false)}
                aria-label="Close create picker"
                className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-1.5 p-3">
              {[
                {
                  kind: "GatewayClass",
                  description: "Cluster-scoped controller class for Gateways.",
                },
                {
                  kind: "Gateway",
                  description: "A load balancer listener in this namespace.",
                },
                {
                  kind: "HTTPRoute",
                  description: "HTTP host/path routing to Services.",
                },
                {
                  kind: "GRPCRoute",
                  description: "gRPC method routing to Services.",
                },
              ].map((option) => (
                <button
                  key={option.kind}
                  type="button"
                  data-testid={`gateway-create-${option.kind}`}
                  onClick={() => {
                    setShowCreatePicker(false);
                    createResource(
                      option.kind,
                      option.kind === "GatewayClass" ? "" : currentNamespace,
                    );
                  }}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-left transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  <span className="block text-xs font-semibold text-[var(--foreground)]">
                    {option.kind}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-[var(--muted)]">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
