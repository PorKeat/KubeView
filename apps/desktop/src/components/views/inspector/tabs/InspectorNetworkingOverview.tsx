"use client";

import { Globe, Network, Radio, Shield, Tag, Waypoints } from "lucide-react";
import { StatusBeacon, type StatusBeaconVariant } from "@/components/ui";
import type {
  EndpointsSummary,
  GatewayResourceSummary,
  IngressSummary,
  NetworkPolicySummary,
  ServiceSummary,
} from "@kubeview/contracts";
import { useClusterStore, type SelectedResource } from "@/stores/clusterStore";
import { Chip, SectionTitle } from "./InspectorNetworkingPrimitives";
import {
  EndpointsDetail,
  ServiceDetail,
} from "./InspectorNetworkingServiceDetails";
import {
  GatewayDetail,
  IngressDetail,
  NetworkPolicyDetail,
} from "./InspectorNetworkingRouteDetails";

export interface InspectorNetworkingOverviewProps {
  currentResource: SelectedResource;
  data:
    | ServiceSummary
    | EndpointsSummary
    | IngressSummary
    | GatewayResourceSummary
    | NetworkPolicySummary;
}

function networkingStatusVariant(status: string): StatusBeaconVariant {
  switch (status) {
    case "Active":
    case "Ready":
    case "Accepted":
    case "Programmed":
      return "healthy";
    case "Pending":
    case "Not Ready":
    case "No Endpoints":
      return "warning";
    case "Not Accepted":
    case "Not Programmed":
      return "critical";
    default:
      return "muted";
  }
}

function networkingIcon(kind: string) {
  switch (kind) {
    case "Service":
      return Network;
    case "Endpoints":
      return Radio;
    case "Ingress":
      return Globe;
    case "NetworkPolicy":
      return Shield;
    default:
      return Waypoints;
  }
}

export function InspectorNetworkingOverview({
  currentResource,
  data,
}: InspectorNetworkingOverviewProps) {
  const Icon = networkingIcon(currentResource.kind);
  const service =
    currentResource.kind === "Service" ? (data as ServiceSummary) : null;
  const endpoints =
    currentResource.kind === "Endpoints" ? (data as EndpointsSummary) : null;
  const ingress =
    currentResource.kind === "Ingress" ? (data as IngressSummary) : null;
  const gateway = [
    "GatewayClass",
    "Gateway",
    "HTTPRoute",
    "GRPCRoute",
  ].includes(currentResource.kind)
    ? (data as GatewayResourceSummary)
    : null;
  const policy =
    currentResource.kind === "NetworkPolicy"
      ? (data as NetworkPolicySummary)
      : null;
  const openResourceEditor = useClusterStore(
    (state) => state.openResourceEditor,
  );
  const openDeleteResource = useClusterStore(
    (state) => state.openDeleteResource,
  );
  const openServiceDiagnostics = useClusterStore(
    (state) => state.openServiceDiagnostics,
  );

  const labels = data.labels ?? {};
  const annotations = data.annotations ?? {};
  const createdLabel = data.creationTimestamp
    ? new Date(data.creationTimestamp).toLocaleString()
    : "—";

  return (
    <div className="space-y-4 text-xs">
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-[#F08A42]" />
              {currentResource.kind} Detail
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBeacon
                variant={networkingStatusVariant(currentResource.status)}
                label={currentResource.status}
                size="sm"
              />
              <span className="text-[11px] text-[var(--muted)] font-mono">
                {currentResource.namespace || "Cluster Scope"} · created{" "}
                {createdLabel}
              </span>
            </div>
          </div>
        </div>

        {service && (
          <ServiceDetail
            service={service}
            onDiagnose={() =>
              openServiceDiagnostics({
                serviceName: service.name,
                namespace: service.namespace,
              })
            }
          />
        )}
        {endpoints && <EndpointsDetail endpoints={endpoints} />}
        {ingress && (
          <IngressDetail
            ingress={ingress}
            onEdit={() =>
              void openResourceEditor({
                kind: "Ingress",
                name: ingress.name,
                namespace: ingress.namespace,
              })
            }
            onDelete={() =>
              openDeleteResource({
                kind: "Ingress",
                name: ingress.name,
                namespace: ingress.namespace,
              })
            }
          />
        )}
        {gateway && (
          <GatewayDetail
            gateway={gateway}
            onEdit={() =>
              void openResourceEditor({
                kind: gateway.kind as
                  "GatewayClass" | "Gateway" | "HTTPRoute" | "GRPCRoute",
                name: gateway.name,
                namespace: gateway.namespace || "Cluster Scope",
              })
            }
            onDelete={() =>
              openDeleteResource({
                kind: gateway.kind as
                  "GatewayClass" | "Gateway" | "HTTPRoute" | "GRPCRoute",
                name: gateway.name,
                namespace: gateway.namespace || "Cluster Scope",
              })
            }
          />
        )}
        {policy && <NetworkPolicyDetail policy={policy} />}
      </div>

      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xs space-y-3">
        <div>
          <SectionTitle icon={Tag} label="Labels" />
          {Object.keys(labels).length === 0 ? (
            <div className="text-[11px] text-[var(--muted)] italic">
              No labels.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(labels).map(([key, value]) => (
                <Chip key={key} label={key} value={value} />
              ))}
            </div>
          )}
        </div>
        <div>
          <SectionTitle icon={Tag} label="Annotations" />
          {Object.keys(annotations).length === 0 ? (
            <div className="text-[11px] text-[var(--muted)] italic">
              No annotations.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(annotations)
                .slice(0, 10)
                .map(([key, value]) => (
                  <Chip key={key} label={key} value={value} />
                ))}
              {Object.keys(annotations).length > 10 && (
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  +{Object.keys(annotations).length - 10} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
