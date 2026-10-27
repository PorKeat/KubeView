"use client";

import * as React from "react";
import { Radio } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
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
        widthClass: "w-[6%]",
        sortValue: (item) => item.readyCount,
        render: (item) => {
          const tone =
            item.readyCount > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : item.notReadyCount > 0
                ? "text-amber-500"
                : "text-[var(--muted)]";
          return (
            <span
              className={`font-mono text-xs tabular-nums ${tone}`}
              title={`${item.readyCount} ready addresses`}
            >
              {item.readyCount}
            </span>
          );
        },
      },
      {
        key: "notReady",
        label: "Not Ready",
        widthClass: "w-[7%]",
        sortValue: (item) => item.notReadyCount,
        render: (item) => (
          <span
            className={
              item.notReadyCount > 0
                ? "font-mono text-xs tabular-nums text-amber-500 font-semibold"
                : "font-mono text-xs tabular-nums text-[var(--muted)]"
            }
            title={`${item.notReadyCount} not-ready addresses`}
          >
            {item.notReadyCount}
          </span>
        ),
      },
      {
        key: "addresses",
        label: "Addresses",
        widthClass: "w-[15%]",
        render: (item) => {
          if (item.addresses.length === 0) {
            return (
              <span className="text-[10px] text-[var(--muted)] italic">
                no addresses
              </span>
            );
          }
          return (
            <div
              className="flex flex-nowrap items-center gap-1 overflow-hidden"
              title={item.addresses
                .map(
                  (address) =>
                    `${address.ip}${address.targetName ? ` → ${address.targetKind ?? "Pod"}/${address.targetName}` : ""}`,
                )
                .join("\n")}
            >
              {item.addresses.slice(0, 1).map((address, index) => (
                <span
                  key={`${address.ip}-${index}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)]"
                  title={`${address.ip}${address.targetName ? ` → ${address.targetKind ?? "Pod"}/${address.targetName}` : ""}${address.nodeName ? ` on ${address.nodeName}` : ""}`}
                >
                  <span
                    className={
                      address.ready
                        ? "w-1.5 h-1.5 rounded-full bg-emerald-500"
                        : "w-1.5 h-1.5 rounded-full bg-amber-500"
                    }
                  />
                  <span className="text-[var(--foreground)]">{address.ip}</span>
                </span>
              ))}
              {item.addresses.length > 1 && (
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  +{item.addresses.length - 1}
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
          return (
            <div
              className="flex flex-nowrap items-center gap-1 overflow-hidden"
              title={targets
                .map(
                  (address) =>
                    `${address.targetKind ?? "Pod"}/${address.targetName}`,
                )
                .join("\n")}
            >
              {targets.slice(0, 1).map((address, index) => (
                <span
                  key={`${address.targetName}-${index}`}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                  title={`${address.targetKind ?? "Pod"}/${address.targetName}${address.nodeName ? ` on ${address.nodeName}` : ""}`}
                >
                  {address.targetKind ?? "Pod"}/{address.targetName}
                </span>
              ))}
              {targets.length > 1 && (
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  +{targets.length - 1}
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
        render: (item) =>
          item.ports.length === 0 ? (
            <span className="text-[10px] text-[var(--muted)] italic">
              no ports
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {item.ports.slice(0, 2).map((port, index) => (
                <span
                  key={`${port.name ?? "port"}-${port.port}-${index}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                >
                  {port.name && (
                    <span className="text-[var(--foreground)]">
                      {port.name}:
                    </span>
                  )}
                  <span className="tabular-nums text-[var(--foreground)]">
                    {port.port}
                  </span>
                  <span className="opacity-60">{port.protocol}</span>
                </span>
              ))}
              {item.ports.length > 2 && (
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  +{item.ports.length - 2}
                </span>
              )}
            </div>
          ),
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
      testIdPrefix="endpoints"
      codeCommand={(namespace) => `kubectl get endpoints -n ${namespace}`}
      emptyDescription="Endpoints track the ready pod addresses behind each Service selector."
    />
  );
}
