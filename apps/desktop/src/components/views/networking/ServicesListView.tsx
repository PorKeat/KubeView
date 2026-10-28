"use client";

import * as React from "react";
import { Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import { useResourceActions } from "../shared/useResourceActions";
import type { ServiceSummary } from "@kubeview/contracts";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
} from "./NetworkingResourcePage";

const SERVICE_TYPE_TONES: Record<string, string> = {
  ClusterIP: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  NodePort:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  LoadBalancer:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  ExternalName:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

function shortSelectorKey(key: string): string {
  const slash = key.lastIndexOf("/");
  return slash >= 0 ? key.slice(slash + 1) : key;
}

function selectorTitle(selector: Record<string, string>): string {
  return Object.entries(selector)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

const SERVICE_TYPES = [
  "ClusterIP",
  "NodePort",
  "LoadBalancer",
  "ExternalName",
] as const;

function serviceMatchesSearch(service: ServiceSummary, query: string): boolean {
  if (!query) return true;
  const selector = service.selector ?? {};
  const externalValues = [
    ...(service.externalIPs ?? []),
    ...(service.loadBalancerIPs ?? []),
    service.externalName ?? "",
  ];
  return (
    service.name.toLowerCase().includes(query) ||
    service.namespace.toLowerCase().includes(query) ||
    service.type.toLowerCase().includes(query) ||
    service.status.toLowerCase().includes(query) ||
    (service.clusterIP ?? "").toLowerCase().includes(query) ||
    externalValues.some((value) => value.toLowerCase().includes(query)) ||
    service.ports.some((port) =>
      `${port.name ?? ""} ${port.port} ${port.protocol} ${port.targetPort ?? ""} ${port.nodePort ?? ""}`
        .toLowerCase()
        .includes(query),
    ) ||
    Object.entries(selector).some(([key, value]) =>
      `${key}=${value}`.toLowerCase().includes(query),
    )
  );
}

function serviceMatchesFilter(
  service: ServiceSummary,
  filter: string,
): boolean {
  return filter === "all" || service.type === filter;
}

function serviceStatus(service: ServiceSummary) {
  if (service.status === "Pending") {
    return { label: "Pending", variant: "warning" as const, pulse: true };
  }
  if (service.status === "No Endpoints") {
    return { label: "No Endpoints", variant: "warning" as const };
  }
  if (service.status === "Terminating") {
    return { label: "Terminating", variant: "muted" as const };
  }
  return { label: "Active", variant: "healthy" as const };
}

export function ServicesListView() {
  const { editResource, deleteResource, createResource } = useResourceActions();
  const {
    services,
    totalServicesCount,
    isServicesLoading,
    hasLoadedServicesOnce,
    loadServices,
    currentContext,
    currentNamespace,
    openInspector,
    openServiceDiagnostics,
  } = useClusterStore();

  const [filter, setFilter] = React.useState("all");

  React.useEffect(() => {
    if (currentContext) loadServices(currentNamespace);
  }, [currentContext, currentNamespace, loadServices]);

  const refresh = React.useCallback(() => {
    loadServices(currentNamespace);
  }, [loadServices, currentNamespace]);

  const scopedServices = React.useMemo(
    () =>
      currentNamespace === "all"
        ? services
        : services.filter(
            (service) =>
              service.namespace.toLowerCase() ===
              currentNamespace.toLowerCase(),
          ),
    [services, currentNamespace],
  );

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: scopedServices.length },
      ...SERVICE_TYPES.map((type) => ({
        id: type,
        label: type,
        count: scopedServices.filter((service) => service.type === type).length,
      })),
    ],
    [scopedServices],
  );

  const columns = React.useMemo<NetworkingColumn<ServiceSummary>[]>(() => {
    const entries: NetworkingColumn<ServiceSummary>[] = [
      {
        key: "type",
        label: "Type",
        widthClass: "w-[8%]",
        sortValue: (service) => service.type,
        render: (service) => (
          <span
            className={cn(
              "inline-flex items-center whitespace-nowrap px-1 py-0.5 rounded text-[9px] font-mono border",
              SERVICE_TYPE_TONES[service.type] ??
                "bg-black/5 dark:bg-white/5 text-[var(--muted)] border-[var(--border)]",
            )}
            title={`Service type: ${service.type}`}
          >
            {service.type}
          </span>
        ),
      },
      {
        key: "clusterIP",
        label: "Cluster IP",
        widthClass: "w-[9%]",
        sortValue: (service) => service.clusterIP ?? "",
        render: (service) => {
          if (!service.clusterIP) {
            return (
              <span className="text-[10px] text-[var(--muted)] italic">—</span>
            );
          }
          const headless =
            service.clusterIP === "None" ||
            (service.clusterIPs ?? []).includes("None");
          return (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
              <span
                className={
                  headless ? "text-[var(--muted)]" : "text-[var(--foreground)]"
                }
              >
                {service.clusterIP}
              </span>
              {headless && (
                <span className="px-1 py-0.5 rounded text-[9px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  headless
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: "endpoints",
        label: "Endpoints",
        widthClass: "w-[8%]",
        sortValue: (service) => service.readyEndpoints,
        render: (service) => {
          const tone =
            service.readyEndpoints > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : service.totalEndpoints > 0
                ? "text-amber-500"
                : "text-[var(--muted)]";
          return (
            <span
              className="font-mono text-[11px] tabular-nums"
              title={`${service.readyEndpoints} ready of ${service.totalEndpoints} endpoint addresses`}
            >
              <span className={tone}>{service.readyEndpoints}</span>
              <span className="text-[var(--muted)]">
                /{service.totalEndpoints}
              </span>
            </span>
          );
        },
      },
      {
        key: "ports",
        label: "Ports",
        widthClass: "w-[11%]",
        render: (service) => (
          <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
            {service.ports.slice(0, 1).map((port, index) => (
              <span
                key={`${port.name ?? "port"}-${port.port}-${index}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                title={`${port.name ? `${port.name} ` : ""}${port.port}/${port.protocol}${port.targetPort && port.targetPort !== "0" ? ` to ${port.targetPort}` : ""}${(port.nodePort ?? 0) > 0 ? `, nodePort ${port.nodePort}` : ""}`}
              >
                <span className="tabular-nums text-[var(--foreground)]">
                  {port.port}
                </span>
                <span className="opacity-60">/{port.protocol}</span>
                {(port.nodePort ?? 0) > 0 && (
                  <span className="text-sky-600 dark:text-sky-400">
                    :{port.nodePort}
                  </span>
                )}
              </span>
            ))}
            {service.ports.length > 1 && (
              <span className="text-[10px] font-mono text-[var(--muted)]">
                +{service.ports.length - 1}
              </span>
            )}
            {service.ports.length === 0 && (
              <span className="text-[10px] text-[var(--muted)] italic">
                no ports
              </span>
            )}
          </div>
        ),
      },
      {
        key: "selector",
        label: "Selector",
        widthClass: "w-[12%]",
        render: (service) => {
          const entries = Object.entries(service.selector ?? {});
          if (entries.length === 0) {
            return (
              <span
                className="text-[10px] text-[var(--muted)] font-mono italic"
                title="No selector; endpoints are managed manually"
              >
                no selector
              </span>
            );
          }
          return (
            <div
              className="flex flex-nowrap items-center gap-1 overflow-hidden"
              title={selectorTitle(service.selector ?? {})}
            >
              {entries.slice(0, 1).map(([key, value]) => (
                <span
                  key={key}
                  title={`${key}=${value}`}
                  className="inline-flex max-w-full items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  <span className="truncate max-w-[130px]">
                    {shortSelectorKey(key)}={value}
                  </span>
                </span>
              ))}
              {entries.length > 1 && (
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  +{entries.length - 1}
                </span>
              )}
            </div>
          );
        },
      },
    ];
    return entries;
  }, []);

  return (
    <NetworkingResourcePage
      icon={Network}
      nounSingular="Service"
      nounPlural="services"
      items={services}
      totalCount={totalServicesCount}
      isLoading={isServicesLoading}
      hasLoadedOnce={hasLoadedServicesOnce}
      onRefresh={refresh}
      searchPlaceholder="Filter services by name, type, IP, port, selector..."
      matchesSearch={serviceMatchesSearch}
      filterOptions={filterOptions}
      activeFilter={filter}
      setActiveFilter={setFilter}
      matchesFilter={serviceMatchesFilter}
      columns={columns}
      getKey={(service) => `${service.namespace}/${service.name}`}
      getName={(service) => service.name}
      getNamespace={(service) => service.namespace}
      getStatus={serviceStatus}
      getAge={(service) => service.age}
      getCreationTimestamp={(service) => service.creationTimestamp}
      onRowClick={(service) =>
        openInspector({
          kind: "Service",
          name: service.name,
          namespace: service.namespace,
          status: service.status,
          data: service as unknown as Record<string, unknown>,
        })
      }
      describeCommand={(service) =>
        `kubectl describe service ${service.name} -n ${service.namespace}`
      }
      onDiagnose={(service) =>
        openServiceDiagnostics({
          serviceName: service.name,
          namespace: service.namespace,
        })
      }
      onEdit={(service) =>
        editResource(
          "Service",
          service.name,
          service.namespace,
          service.status,
          service as unknown as Record<string, unknown>,
        )
      }
      onDelete={(service) =>
        deleteResource("Service", service.name, service.namespace)
      }
      onCreate={() => createResource("Service", currentNamespace)}
      testIdPrefix="services"
      codeCommand={(namespace) => `kubectl get services -n ${namespace}`}
      emptyDescription="Services expose selected pods through a stable virtual IP, node port, or external load balancer."
    />
  );
}
