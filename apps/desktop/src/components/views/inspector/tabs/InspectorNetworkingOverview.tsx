"use client";

import * as React from "react";
import {
  Globe,
  Network,
  Radio,
  Shield,
  Tag,
  Waypoints,
  Activity,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBeacon, type StatusBeaconVariant } from "@/components/ui";
import type {
  EndpointsSummary,
  GatewayResourceSummary,
  IngressSummary,
  NetworkPolicySummary,
  ServiceSummary,
} from "@kubeview/contracts";
import { useClusterStore, type SelectedResource } from "@/stores/clusterStore";
import { InspectorNetworkPolicyMatrix } from "./InspectorNetworkPolicyMatrix";

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

function ServiceDetail({
  service,
  onDiagnose,
}: {
  service: ServiceSummary;
  onDiagnose: () => void;
}) {
  const external = [
    ...(service.loadBalancerIPs ?? []),
    ...(service.externalIPs ?? []),
  ];
  return (
    <div className="space-y-3">
      <InspectorActionRow>
        <ActionButton
          icon={Activity}
          label="Run Diagnostics"
          onClick={onDiagnose}
        />
      </InspectorActionRow>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Type" value={service.type} />
        <Tile label="Cluster IP" value={service.clusterIP || "None"} />
        <Tile
          label="Ready Endpoints"
          value={`${service.readyEndpoints}/${service.totalEndpoints}`}
          tone={service.readyEndpoints > 0 ? "healthy" : "warning"}
        />
        <Tile
          label="Session Affinity"
          value={service.sessionAffinity || "None"}
        />
      </div>

      {service.externalName && (
        <div className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-[11px] leading-relaxed text-[var(--muted)]">
          ExternalName alias:{" "}
          <strong className="text-[var(--foreground)] font-mono">
            {service.externalName}
          </strong>
        </div>
      )}

      {external.length > 0 && (
        <div>
          <SectionTitle icon={Globe} label="External Addresses" />
          <div className="flex flex-wrap gap-1.5">
            {external.map((value) => (
              <span
                key={value}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionTitle icon={Network} label="Ports" />
        {service.ports.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] italic">
            No ports exposed.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]/50 rounded-xl border border-[var(--border)]/70 overflow-hidden">
            {service.ports.map((port, index) => (
              <div
                key={`${port.name ?? "port"}-${port.port}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-black/[0.015] dark:bg-white/[0.015]"
              >
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[var(--foreground)] font-semibold">
                    {port.port}
                  </span>
                  <span className="text-[var(--muted)]">{port.protocol}</span>
                  {port.name && (
                    <span className="text-[10px] text-[var(--muted)]">
                      ({port.name})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--muted)]">
                  {port.targetPort && port.targetPort !== "0" && (
                    <span>target: {port.targetPort}</span>
                  )}
                  {(port.nodePort ?? 0) > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      nodePort {port.nodePort}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle icon={Tag} label="Selector" />
        {Object.keys(service.selector ?? {}).length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] italic">
            No selector. Endpoints are managed manually.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(service.selector ?? {}).map(([key, value]) => (
              <Chip key={key} label={key} value={value} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EndpointsDetail({ endpoints }: { endpoints: EndpointsSummary }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile
          label="Ready"
          value={String(endpoints.readyCount)}
          tone="healthy"
        />
        <Tile
          label="Not Ready"
          value={String(endpoints.notReadyCount)}
          tone={endpoints.notReadyCount > 0 ? "warning" : "muted"}
        />
        <Tile label="Addresses" value={String(endpoints.addresses.length)} />
        <Tile label="Ports" value={String(endpoints.ports.length)} />
      </div>

      <div>
        <SectionTitle icon={Radio} label="Addresses" />
        {endpoints.addresses.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] italic">
            No addresses are registered for this Endpoints object.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]/50 rounded-xl border border-[var(--border)]/70 overflow-hidden">
            {endpoints.addresses.map((address, index) => (
              <div
                key={`${address.ip}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-black/[0.015] dark:bg-white/[0.015]"
              >
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      address.ready ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                  <span className="text-[var(--foreground)]">{address.ip}</span>
                  {address.hostname && (
                    <span className="text-[10px] text-[var(--muted)]">
                      {address.hostname}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-[var(--muted)]">
                  {address.targetName && (
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      {address.targetKind ?? "Pod"}/{address.targetName}
                    </span>
                  )}
                  {address.nodeName && <span>node: {address.nodeName}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle icon={Network} label="Ports" />
        {endpoints.ports.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] italic">
            No ports exposed.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {endpoints.ports.map((port, index) => (
              <span
                key={`${port.name ?? "port"}-${port.port}-${index}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
              >
                {port.name && (
                  <span className="text-[var(--foreground)]">{port.name}:</span>
                )}
                <span className="text-[var(--foreground)]">{port.port}</span>
                <span>{port.protocol}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IngressDetail({
  ingress,
  onEdit,
  onDelete,
}: {
  ingress: IngressSummary;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3">
      <InspectorActionRow>
        <ActionButton icon={Pencil} label="Edit YAML" onClick={onEdit} />
        <ActionButton icon={Trash2} label="Delete" onClick={onDelete} danger />
      </InspectorActionRow>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Class" value={ingress.className || "—"} />
        <Tile label="Hosts" value={String(ingress.hosts.length)} />
        <Tile label="Paths" value={String(ingress.paths.length)} />
        <Tile label="TLS Blocks" value={String(ingress.tls.length)} />
      </div>

      <div>
        <SectionTitle icon={Globe} label="Addresses" />
        {ingress.addresses.length === 0 ? (
          <div className="text-[11px] text-amber-600 dark:text-amber-400 italic">
            Load balancer has not assigned an address yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {ingress.addresses.map((address) => (
              <span
                key={address}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              >
                {address}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle icon={Waypoints} label="Routing Rules" />
        {ingress.paths.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] italic">
            No routing rules.{" "}
            {ingress.defaultBackend
              ? `Default backend: ${ingress.defaultBackend}.`
              : "No default backend configured."}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]/50 rounded-xl border border-[var(--border)]/70 overflow-hidden">
            {ingress.paths.map((path, index) => (
              <div
                key={`${path.host ?? "host"}-${path.path}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-black/[0.015] dark:bg-white/[0.015] font-mono text-[11px]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[var(--foreground)] truncate">
                    {path.host || "*"}
                  </span>
                  <span className="text-[var(--muted)]">{path.path}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
                    {path.pathType}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--muted)]">
                  → {path.serviceName || "?"}:{path.servicePort || "?"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle icon={Shield} label="TLS" />
        {ingress.tls.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] italic">
            TLS is not configured for this Ingress.
          </div>
        ) : (
          <div className="space-y-1.5">
            {ingress.tls.map((tls, index) => (
              <div
                key={`${tls.secretName ?? "tls"}-${index}`}
                className="space-y-1.5 px-3 py-2 rounded-lg border border-[var(--border)]/70 bg-black/[0.015] dark:bg-white/[0.015]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-[var(--foreground)]">
                    {tls.hosts.join(", ") || "all hosts"}
                  </span>
                  <StatusBeacon
                    variant={tlsStatusVariant(tls.status)}
                    label={tls.status || "Unknown"}
                    size="xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-[var(--muted)]">
                  <span>secret: {tls.secretName || "—"}</span>
                  <span>
                    expires:{" "}
                    {tls.notAfter
                      ? new Date(tls.notAfter).toLocaleDateString()
                      : "—"}
                  </span>
                  {tls.issuer && (
                    <span className="col-span-2 truncate" title={tls.issuer}>
                      issuer: {tls.issuer}
                    </span>
                  )}
                  {tls.dnsNames && tls.dnsNames.length > 0 && (
                    <span
                      className="col-span-2 truncate"
                      title={tls.dnsNames.join(", ")}
                    >
                      dns: {tls.dnsNames.join(", ")}
                    </span>
                  )}
                  {tls.message && (
                    <span className="col-span-2 text-amber-600 dark:text-amber-400">
                      {tls.message}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GatewayDetail({
  gateway,
  onEdit,
  onDelete,
}: {
  gateway: GatewayResourceSummary;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3">
      <InspectorActionRow>
        <ActionButton icon={Pencil} label="Edit YAML" onClick={onEdit} />
        <ActionButton icon={Trash2} label="Delete" onClick={onDelete} danger />
      </InspectorActionRow>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Kind" value={gateway.kind} />
        <Tile label="Class / Parents" value={gateway.class || "—"} />
        <Tile label="Hosts" value={String(gateway.hosts.length)} />
        <Tile
          label={gateway.kind === "Gateway" ? "Listeners" : "Rules"}
          value={String(
            gateway.kind === "Gateway"
              ? gateway.listenerCount
              : gateway.ruleCount,
          )}
        />
      </div>

      <div>
        <SectionTitle icon={Globe} label="Hosts" />
        {gateway.hosts.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] italic">
            No hostnames are configured.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {gateway.hosts.map((host) => (
              <span
                key={host}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
              >
                {host}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle icon={Network} label="Addresses" />
        {gateway.addresses.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] italic">
            No addresses reported by the Gateway API controller.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {gateway.addresses.map((address) => (
              <span
                key={address}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              >
                {address}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NetworkPolicyDetail({ policy }: { policy: NetworkPolicySummary }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Pod Selector" value={policy.podSelector} />
        <Tile label="Types" value={policy.policyTypes.join(" + ")} />
        <Tile label="Ingress Rules" value={String(policy.ingressRules)} />
        <Tile label="Egress Rules" value={String(policy.egressRules)} />
      </div>

      <InspectorNetworkPolicyMatrix policy={policy} />
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1 flex items-center gap-1">
      <Icon className="w-3 h-3 opacity-60" /> {label}
    </div>
  );
}

function Tile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "healthy" | "warning" | "muted";
}) {
  return (
    <div className="rounded-lg border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 py-1.5 min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">
        {label}
      </div>
      <div
        className={cn(
          "text-sm font-mono font-semibold mt-0.5 truncate",
          tone === "healthy" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-500",
          tone === "muted" && "text-[var(--muted)]",
          tone === "default" && "text-[var(--foreground)]",
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
      title={`${label}=${value}`}
    >
      <span className="truncate max-w-[160px]">{label}</span>
      <span className="opacity-40">=</span>
      <span className="text-[var(--foreground)] font-medium truncate max-w-[160px]">
        {value}
      </span>
    </span>
  );
}

function tlsStatusVariant(status: string | undefined): StatusBeaconVariant {
  switch (status) {
    case "Valid":
      return "healthy";
    case "Expiring":
      return "warning";
    case "Expired":
    case "Invalid":
    case "Unreadable":
      return "critical";
    default:
      return "muted";
  }
}

function InspectorActionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer",
        danger
          ? "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
      )}
    >
      <Icon
        className={cn(
          "w-3 h-3",
          danger ? "text-rose-500" : "text-[var(--accent)]",
        )}
      />
      {label}
    </button>
  );
}
