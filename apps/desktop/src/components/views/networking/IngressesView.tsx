"use client";

import * as React from "react";
import { Globe, Waypoints } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import type {
  GatewayResourceSummary,
  IngressSummary,
} from "@kubeview/contracts";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "./NetworkingResourcePage";

type IngressMode = "ingresses" | "gateways";

const GATEWAY_KINDS = [
  "GatewayClass",
  "Gateway",
  "HTTPRoute",
  "GRPCRoute",
] as const;

function ingressMatchesSearch(ingress: IngressSummary, query: string): boolean {
  if (!query) return true;
  return (
    ingress.name.toLowerCase().includes(query) ||
    ingress.namespace.toLowerCase().includes(query) ||
    (ingress.className ?? "").toLowerCase().includes(query) ||
    ingress.status.toLowerCase().includes(query) ||
    ingress.hosts.some((host) => host.toLowerCase().includes(query)) ||
    ingress.addresses.some((address) =>
      address.toLowerCase().includes(query),
    ) ||
    ingress.paths.some((path) =>
      `${path.host ?? ""} ${path.path} ${path.serviceName ?? ""} ${path.servicePort ?? ""}`
        .toLowerCase()
        .includes(query),
    ) ||
    ingress.tls.some((tls) =>
      `${tls.secretName ?? ""} ${tls.hosts.join(" ")}`
        .toLowerCase()
        .includes(query),
    )
  );
}

function ingressMatchesFilter(ingress: IngressSummary, filter: string) {
  return filter === "all" || ingress.status.toLowerCase() === filter;
}

function ingressStatus(ingress: IngressSummary) {
  if (ingress.status === "Ready") {
    return { label: "Ready", variant: "healthy" as const };
  }
  if (ingress.status === "Terminating") {
    return { label: "Terminating", variant: "muted" as const };
  }
  return { label: "Pending", variant: "warning" as const, pulse: true };
}

function gatewayMatchesSearch(
  resource: GatewayResourceSummary,
  query: string,
): boolean {
  if (!query) return true;
  return (
    resource.kind.toLowerCase().includes(query) ||
    resource.name.toLowerCase().includes(query) ||
    (resource.namespace ?? "").toLowerCase().includes(query) ||
    (resource.class ?? "").toLowerCase().includes(query) ||
    resource.status.toLowerCase().includes(query) ||
    resource.hosts.some((host) => host.toLowerCase().includes(query)) ||
    resource.addresses.some((address) => address.toLowerCase().includes(query))
  );
}

function gatewayMatchesFilter(
  resource: GatewayResourceSummary,
  filter: string,
) {
  return filter === "all" || resource.kind === filter;
}

const GATEWAY_KIND_TONES: Record<string, string> = {
  GatewayClass:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  Gateway: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  HTTPRoute:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  GRPCRoute:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

function gatewayStatus(resource: GatewayResourceSummary) {
  switch (resource.status) {
    case "Programmed":
    case "Accepted":
      return { label: resource.status, variant: "healthy" as const };
    case "Not Accepted":
    case "Not Programmed":
      return {
        label: resource.status,
        variant: "critical" as const,
        pulse: true,
      };
    case "Unknown":
      return { label: resource.status, variant: "muted" as const };
    default:
      return {
        label: resource.status,
        variant: "warning" as const,
        pulse: true,
      };
  }
}

export function IngressesView() {
  const {
    ingresses,
    totalIngressesCount,
    isIngressesLoading,
    hasLoadedIngressesOnce,
    loadIngresses,
    gatewayResources,
    totalGatewayResourcesCount,
    isGatewayResourcesLoading,
    hasLoadedGatewayResourcesOnce,
    gatewayApiAvailable,
    loadGatewayResources,
    currentContext,
    currentNamespace,
    openInspector,
    openResourceEditor,
    openDeleteResource,
  } = useClusterStore();

  const [mode, setMode] = React.useState<IngressMode>("ingresses");
  const [ingressFilter, setIngressFilter] = React.useState("all");
  const [gatewayFilter, setGatewayFilter] = React.useState("all");

  React.useEffect(() => {
    if (!currentContext) return;
    loadIngresses(currentNamespace);
    loadGatewayResources(currentNamespace);
  }, [currentContext, currentNamespace, loadIngresses, loadGatewayResources]);

  const refreshIngresses = React.useCallback(() => {
    loadIngresses(currentNamespace);
  }, [loadIngresses, currentNamespace]);
  const refreshGateways = React.useCallback(() => {
    loadGatewayResources(currentNamespace);
  }, [loadGatewayResources, currentNamespace]);

  const scopedIngresses = React.useMemo(
    () =>
      currentNamespace === "all"
        ? ingresses
        : ingresses.filter(
            (ingress) =>
              ingress.namespace.toLowerCase() ===
              currentNamespace.toLowerCase(),
          ),
    [ingresses, currentNamespace],
  );
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

  const ingressFilterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: scopedIngresses.length },
      {
        id: "ready",
        label: "Ready",
        count: scopedIngresses.filter((ingress) => ingress.status === "Ready")
          .length,
      },
      {
        id: "pending",
        label: "Pending",
        count: scopedIngresses.filter((ingress) => ingress.status === "Pending")
          .length,
        warn: true,
      },
    ],
    [scopedIngresses],
  );

  const gatewayFilterOptions = React.useMemo<NetworkingFilterOption[]>(
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

  const ingressColumns = React.useMemo<NetworkingColumn<IngressSummary>[]>(
    () => [
      {
        key: "class",
        label: "Class",
        widthClass: "w-[8%]",
        sortValue: (ingress) => ingress.className ?? "",
        render: (ingress) =>
          ingress.className ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              {ingress.className}
            </span>
          ) : (
            <span className="text-[10px] text-[var(--muted)] italic">—</span>
          ),
      },
      {
        key: "hosts",
        label: "Hosts",
        widthClass: "w-[11%]",
        sortValue: (ingress) => ingress.hosts.join(","),
        render: (ingress) => (
          <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
            {ingress.hosts.slice(0, 1).map((host) => (
              <span
                key={host}
                className="inline-flex max-w-full items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 truncate"
                title={host}
              >
                {host}
              </span>
            ))}
            {ingress.hosts.length > 1 && (
              <span className="text-[10px] font-mono text-[var(--muted)]">
                +{ingress.hosts.length - 1}
              </span>
            )}
            {ingress.hosts.length === 0 && (
              <span className="text-[10px] text-[var(--muted)] italic">
                wildcard
              </span>
            )}
          </div>
        ),
      },
      {
        key: "tls",
        label: "TLS",
        widthClass: "w-[10%]",
        render: (ingress) =>
          ingress.tls.length === 0 ? (
            <span className="text-[10px] text-[var(--muted)] italic">—</span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border truncate",
                ingress.tls[0].status === "Valid" &&
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                ingress.tls[0].status === "Expiring" &&
                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
                (ingress.tls[0].status === "Expired" ||
                  ingress.tls[0].status === "Invalid" ||
                  ingress.tls[0].status === "Unreadable") &&
                  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
                (!ingress.tls[0].status ||
                  ingress.tls[0].status === "Missing") &&
                  "bg-black/5 dark:bg-white/5 text-[var(--muted)] border-[var(--border)]",
              )}
              title={ingress.tls
                .map(
                  (tls) =>
                    `${tls.status || "TLS"}: ${tls.secretName || tls.hosts.join(", ")}${tls.notAfter ? ` (expires ${tls.notAfter})` : ""}${tls.issuer ? `\nissuer: ${tls.issuer}` : ""}${tls.dnsNames?.length ? `\ndns: ${tls.dnsNames.join(", ")}` : ""}`,
                )
                .join("\n")}
            >
              <Globe className="w-2.5 h-2.5 shrink-0" />
              <span>{ingress.tls[0].status || "TLS"}</span>
              <span className="opacity-60 truncate max-w-[120px]">
                {ingress.tls[0].secretName ||
                  `${ingress.tls[0].hosts.length} hosts`}
              </span>
              {ingress.tls.length > 1 ? ` +${ingress.tls.length - 1}` : ""}
            </span>
          ),
      },
      {
        key: "addresses",
        label: "Addresses",
        widthClass: "w-[8%]",
        render: (ingress) =>
          ingress.addresses.length === 0 ? (
            <span className="text-[10px] text-amber-500 font-mono">
              pending
            </span>
          ) : (
            <span
              className="font-mono text-[10px] text-[var(--foreground)] truncate block"
              title={ingress.addresses.join(", ")}
            >
              {ingress.addresses.slice(0, 2).join(", ")}
              {ingress.addresses.length > 2
                ? ` +${ingress.addresses.length - 2}`
                : ""}
            </span>
          ),
      },
      {
        key: "paths",
        label: "Paths",
        widthClass: "w-[10%]",
        sortValue: (ingress) => ingress.paths.length,
        render: (ingress) => {
          if (ingress.paths.length === 0) {
            return (
              <span className="text-[10px] text-[var(--muted)] italic">
                no rules
              </span>
            );
          }
          const first = ingress.paths[0];
          return (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] truncate max-w-full"
              title={ingress.paths
                .map(
                  (path) =>
                    `${path.host ?? "*"}${path.path} → ${path.serviceName ?? "?"}:${path.servicePort ?? "?"}`,
                )
                .join("\n")}
            >
              <span className="text-[var(--foreground)] truncate">
                {first.path}
              </span>
              <span className="opacity-50">→</span>
              <span className="text-[var(--muted)] truncate">
                {first.serviceName ?? "?"}:{first.servicePort ?? "?"}
              </span>
              {ingress.paths.length > 1 && (
                <span className="text-[var(--muted)]">
                  +{ingress.paths.length - 1}
                </span>
              )}
            </span>
          );
        },
      },
    ],
    [],
  );

  const gatewayColumns = React.useMemo<
    NetworkingColumn<GatewayResourceSummary>[]
  >(
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
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <div className="h-11 border-b border-[var(--border)] px-3 flex items-center justify-between shrink-0 bg-[var(--surface)] gap-3">
        <div className="relative flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] border border-[var(--border)] text-xs">
          <button
            type="button"
            data-testid="ingresses-view-tab"
            onClick={() => setMode("ingresses")}
            className={cn(
              "relative px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              mode === "ingresses"
                ? "text-[var(--foreground)] font-semibold"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {mode === "ingresses" && (
              <motion.span
                layoutId="ingresses-resource-tab"
                className="absolute inset-0 rounded-md bg-[var(--surface-elevated)] dark:bg-white/10 shadow-xs border border-[var(--border)] -z-10"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <Globe className="w-3.5 h-3.5" />
            <span>Ingresses</span>
            <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/5 text-[var(--muted)]">
              {totalIngressesCount}
            </span>
          </button>
          <button
            type="button"
            data-testid="gateways-view-tab"
            onClick={() => setMode("gateways")}
            className={cn(
              "relative px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              mode === "gateways"
                ? "text-[var(--foreground)] font-semibold"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {mode === "gateways" && (
              <motion.span
                layoutId="ingresses-resource-tab"
                className="absolute inset-0 rounded-md bg-[var(--surface-elevated)] dark:bg-white/10 shadow-xs border border-[var(--border)] -z-10"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <Waypoints className="w-3.5 h-3.5" />
            <span>Gateway API</span>
            <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/5 text-[var(--muted)]">
              {totalGatewayResourcesCount}
            </span>
          </button>
        </div>
        <span className="text-[11px] text-[var(--muted)] font-mono hidden sm:block">
          Ingress and Gateway API traffic routing
        </span>
      </div>

      {mode === "ingresses" ? (
        <NetworkingResourcePage
          key="ingresses"
          icon={Globe}
          nounSingular="Ingress"
          nounPlural="ingresses"
          items={ingresses}
          totalCount={totalIngressesCount}
          isLoading={isIngressesLoading}
          hasLoadedOnce={hasLoadedIngressesOnce}
          onRefresh={refreshIngresses}
          searchPlaceholder="Filter ingresses by name, class, host, address, backend..."
          matchesSearch={ingressMatchesSearch}
          filterOptions={ingressFilterOptions}
          activeFilter={ingressFilter}
          setActiveFilter={setIngressFilter}
          matchesFilter={ingressMatchesFilter}
          columns={ingressColumns}
          getKey={(ingress) => `${ingress.namespace}/${ingress.name}`}
          getName={(ingress) => ingress.name}
          getNamespace={(ingress) => ingress.namespace}
          getStatus={ingressStatus}
          getAge={(ingress) => ingress.age}
          getCreationTimestamp={(ingress) => ingress.creationTimestamp}
          onRowClick={(ingress) =>
            openInspector({
              kind: "Ingress",
              name: ingress.name,
              namespace: ingress.namespace,
              status: ingress.status,
              data: ingress as unknown as Record<string, unknown>,
            })
          }
          describeCommand={(ingress) =>
            `kubectl describe ingress ${ingress.name} -n ${ingress.namespace}`
          }
          onEdit={(ingress) =>
            void openResourceEditor({
              kind: "Ingress",
              name: ingress.name,
              namespace: ingress.namespace,
            })
          }
          onDelete={(ingress) =>
            openDeleteResource({
              kind: "Ingress",
              name: ingress.name,
              namespace: ingress.namespace,
            })
          }
          testIdPrefix="ingresses"
          codeCommand={(namespace) => `kubectl get ingress -n ${namespace}`}
          emptyDescription="Ingresses route external HTTP and HTTPS traffic to Services inside the cluster."
        />
      ) : (
        <NetworkingResourcePage
          key="gateways"
          icon={Waypoints}
          nounSingular="Gateway resource"
          nounPlural="Gateway API resources"
          items={gatewayResources}
          totalCount={totalGatewayResourcesCount}
          isLoading={isGatewayResourcesLoading}
          hasLoadedOnce={hasLoadedGatewayResourcesOnce}
          onRefresh={refreshGateways}
          searchPlaceholder="Filter Gateway API resources by kind, name, class, host..."
          matchesSearch={gatewayMatchesSearch}
          filterOptions={gatewayFilterOptions}
          activeFilter={gatewayFilter}
          setActiveFilter={setGatewayFilter}
          matchesFilter={gatewayMatchesFilter}
          columns={gatewayColumns}
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
            void openResourceEditor({
              kind: resource.kind as
                "GatewayClass" | "Gateway" | "HTTPRoute" | "GRPCRoute",
              name: resource.name,
              namespace: resource.namespace || "Cluster Scope",
            })
          }
          onDelete={(resource) =>
            openDeleteResource({
              kind: resource.kind as
                "GatewayClass" | "Gateway" | "HTTPRoute" | "GRPCRoute",
              name: resource.name,
              namespace: resource.namespace || "Cluster Scope",
            })
          }
          testIdPrefix="gateways"
          codeCommand={(namespace) => `kubectl get gateways -n ${namespace}`}
          emptyDescription={
            gatewayApiAvailable
              ? "GatewayClass, Gateway, HTTPRoute and GRPCRoute resources are not present in this scope."
              : "Gateway API CRDs (GatewayClass, Gateway, HTTPRoute, GRPCRoute) were not detected on the connected cluster."
          }
        />
      )}
    </div>
  );
}
