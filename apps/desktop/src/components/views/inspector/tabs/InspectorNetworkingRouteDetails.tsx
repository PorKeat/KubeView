"use client";

import {
  Globe,
  Network,
  Pencil,
  Shield,
  Trash2,
  Waypoints,
} from "lucide-react";
import { StatusBeacon, type StatusBeaconVariant } from "@/components/ui";
import type {
  GatewayResourceSummary,
  IngressSummary,
  NetworkPolicySummary,
} from "@kubeview/contracts";
import { InspectorNetworkPolicyMatrix } from "./InspectorNetworkPolicyMatrix";
import {
  ActionButton,
  InspectorActionRow,
  SectionTitle,
  Tile,
} from "./InspectorNetworkingPrimitives";

export function IngressDetail({
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

export function GatewayDetail({
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

export function NetworkPolicyDetail({
  policy,
}: {
  policy: NetworkPolicySummary;
}) {
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
