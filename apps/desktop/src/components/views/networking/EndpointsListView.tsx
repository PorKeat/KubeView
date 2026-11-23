"use client";

import * as React from "react";
import { Radio } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { cn } from "@/lib/utils";
import { useResourceActions } from "../shared/useResourceActions";
import type { EndpointsSummary } from "@kubeview/contracts";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "./NetworkingResourcePage";

function endpointsMatchesSearch(
  endpoints: EndpointsSummary,
  query: string,
): boolean {
  if (!query) return true;
  return (
    endpoints.name.toLowerCase().includes(query) ||
    endpoints.namespace.toLowerCase().includes(query) ||
    endpoints.status.toLowerCase().includes(query) ||
    endpoints.addresses.some((address) =>
      `${address.ip} ${address.hostname ?? ""} ${address.nodeName ?? ""} ${address.targetKind ?? ""} ${address.targetName ?? ""}`
        .toLowerCase()
        .includes(query),
    ) ||
    endpoints.ports.some((port) =>
      `${port.name ?? ""} ${port.port} ${port.protocol}`
        .toLowerCase()
        .includes(query),
    )
  );
}

function endpointsMatchesFilter(
  endpoints: EndpointsSummary,
  filter: string,
): boolean {
  switch (filter) {
    case "ready":
      return endpoints.readyCount > 0;
    case "not-ready":
      return endpoints.notReadyCount > 0;
    case "empty":
      return endpoints.readyCount === 0 && endpoints.notReadyCount === 0;
    default:
      return true;
  }
}

function endpointsStatus(endpoints: EndpointsSummary) {
  switch (endpoints.status) {
    case "Ready":
      return { label: "Ready", variant: "healthy" as const };
    case "Not Ready":
      return { label: "Not Ready", variant: "warning" as const, pulse: true };
    default:
      return { label: "Empty", variant: "muted" as const };
  }
}

export function EndpointsListView() {
  const { editResource, deleteResource, createResource } = useResourceActions();
  const {
    endpoints,
    totalEndpointsCount,
    isEndpointsLoading,
    hasLoadedEndpointsOnce,
    loadEndpoints,
    currentContext,
    currentNamespace,
    openInspector,
  } = useClusterStore();

  const [filter, setFilter] = React.useState("all");

  React.useEffect(() => {
    if (currentContext) loadEndpoints(currentNamespace);
  }, [currentContext, currentNamespace, loadEndpoints]);

  const refresh = React.useCallback(() => {
    loadEndpoints(currentNamespace);
  }, [loadEndpoints, currentNamespace]);

  const scopedEndpoints = React.useMemo(
    () =>
      currentNamespace === "all"
        ? endpoints
        : endpoints.filter(
            (item) =>
              item.namespace.toLowerCase() === currentNamespace.toLowerCase(),
          ),
    [endpoints, currentNamespace],
  );

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: scopedEndpoints.length },
      {
        id: "ready",
        label: "Ready",
        count: scopedEndpoints.filter((item) => item.readyCount > 0).length,
      },
      {
        id: "not-ready",
        label: "Not Ready",
        count: scopedEndpoints.filter((item) => item.notReadyCount > 0).length,
        warn: true,
      },
      {
        id: "empty",
        label: "Empty",
        count: scopedEndpoints.filter(
          (item) => item.readyCount === 0 && item.notReadyCount === 0,
        ).length,
      },
    ],
    [scopedEndpoints],
  );

  const columns = React.useMemo<NetworkingColumn<EndpointsSummary>[]>(
    () => [
      {
        key: "ready",
        label: "Ready",
        widthClass: "w-[12%]",
        sortValue: (item) => item.readyCount,
        render: (item) => (
          <div
            className={cn(
              "flex min-w-0 gap-0.5 font-mono text-[10px] tabular-nums",
              item.notReadyCount > 0 ? "flex-col items-start" : "items-center",
            )}
            title={`${item.readyCount} ready, ${item.notReadyCount} not ready`}
          >
            <span
              className={
                item.readyCount > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-[var(--muted)]"
              }
            >
              {item.readyCount} ready
            </span>
            {item.notReadyCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {item.notReadyCount} not ready
              </span>
            )}
          </div>
        ),
      },
      {
        key: "addresses",
        label: "Addresses",
        widthClass: "w-[14%]",
        render: (item) => {
          if (item.addresses.length === 0) {
            return (
              <span className="text-[10px] text-[var(--muted)] italic">
                no addresses
              </span>
            );
          }
          const first = item.addresses[0];
          const extra = item.addresses.length - 1;
          return (
            <div
              className="flex min-w-0 items-center gap-1.5"
              title={item.addresses
                .map(
                  (address) =>
                    `${address.ip}${address.targetName ? ` → ${address.targetKind ?? "Pod"}/${address.targetName}` : ""}`,
                )
                .join("\n")}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  first.ready ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              <span
                className="truncate font-mono text-[11px] text-[var(--foreground)]"
                title={`${first.ip}${first.nodeName ? ` on ${first.nodeName}` : ""}`}
              >
                {first.ip}
              </span>
              {extra > 0 && (
                <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
                  +{extra}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "targets",
        label: "Targets",
        widthClass: "w-[13%]",
        render: (item) => {
          const targets = item.addresses.filter(
            (address) => address.targetName,
          );
          if (targets.length === 0) {
            return (
              <span className="text-[10px] text-[var(--muted)] italic">—</span>
            );
          }
          const first = targets[0];
          const extra = targets.length - 1;
          return (
            <div
              className="flex min-w-0 items-center gap-1"
              title={targets
                .map(
                  (address) =>
                    `${address.targetKind ?? "Pod"}/${address.targetName}`,
                )
                .join("\n")}
            >
              <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
                {first.targetKind && first.targetKind !== "Pod"
                  ? `${first.targetKind}/`
                  : ""}
              </span>
              <span
                className="truncate font-mono text-[11px] text-[var(--foreground)]"
                title={`${first.targetKind ?? "Pod"}/${first.targetName}${first.nodeName ? ` on ${first.nodeName}` : ""}`}
              >
                {first.targetName}
              </span>
              {extra > 0 && (
                <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
                  +{extra}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "ports",
        label: "Ports",
        widthClass: "w-[11%]",
        render: (item) => {
          if (item.ports.length === 0) {
            return (
              <span className="text-[10px] text-[var(--muted)] italic">
                no ports
              </span>
            );
          }
          const first = item.ports[0];
          const extra = item.ports.length - 1;
          const allPorts = item.ports
            .map(
              (port) =>
                `${port.name ? `${port.name}:` : ""}${port.port} ${port.protocol}`,
            )
            .join("\n");
          return (
            <div className="flex min-w-0 items-center gap-1.5" title={allPorts}>
              <span className="truncate font-mono text-[11px] text-[var(--foreground)]">
                {first.port}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
                {first.protocol}
              </span>
              {extra > 0 && (
                <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
                  +{extra}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <NetworkingResourcePage
      icon={Radio}
      nounSingular="Endpoints"
      nounPlural="endpoints"
      items={endpoints}
      totalCount={totalEndpointsCount}
      isLoading={isEndpointsLoading}
      hasLoadedOnce={hasLoadedEndpointsOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter endpoints by name, IP, target, node, port..."
      matchesSearch={endpointsMatchesSearch}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={endpointsMatchesFilter}
      columns={columns}
      getKey={(item) => `${item.namespace}/${item.name}`}
      getName={(item) => item.name}
      getNamespace={(item) => item.namespace}
      getStatus={endpointsStatus}
      getAge={(item) => item.age}
      getCreationTimestamp={(item) => item.creationTimestamp}
      onRowClick={(item) =>
        openInspector({
          kind: "Endpoints",
          name: item.name,
          namespace: item.namespace,
          status: item.status,
          data: item as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(item) =>
        `kubectl describe endpoints ${item.name} -n ${item.namespace}`
      }
      onEdit={(item) =>
        editResource(
          "Endpoints",
          item.name,
          item.namespace,
          item.status,
          item as unknown as Record<string, unknown>,
        )
      }
      onDelete={(item) =>
        deleteResource("Endpoints", item.name, item.namespace)
      }
      onCreate={() => createResource("Endpoints", currentNamespace)}
      bulkDeleteKind="Endpoints"
      testIdPrefix="endpoints"
      codeCommand={(namespace) => `kubectl get endpoints -n ${namespace}`}
      emptyDescription="Endpoints track the ready pod addresses behind each Service selector."
    />
  );
}
