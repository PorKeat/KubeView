"use client";

import { Globe, Network, Radio, Tag, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EndpointsSummary, ServiceSummary } from "@kubeview/contracts";
import {
  ActionButton,
  Chip,
  InspectorActionRow,
  SectionTitle,
  Tile,
} from "./InspectorNetworkingPrimitives";

export function ServiceDetail({
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

export function EndpointsDetail({
  endpoints,
}: {
  endpoints: EndpointsSummary;
}) {
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
