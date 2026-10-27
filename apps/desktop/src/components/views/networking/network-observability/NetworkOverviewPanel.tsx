"use client";

import * as React from "react";
import { Activity, Boxes, Network, Radar, Shield } from "lucide-react";
import type { NetworkObservabilityResult } from "@kubeview/contracts";

const CNI_CAPABILITY_LABELS: Record<string, string> = {
  overview: "Overview",
  standardNetworkPolicies: "Standard NetworkPolicies",
  services: "Services",
  endpointSlices: "EndpointSlices",
  ciliumPolicies: "Cilium policies",
  ciliumEndpoints: "Cilium endpoints",
  hubbleFlows: "Hubble flows",
};

export function NetworkOverviewPanel({
  data,
}: {
  data: NetworkObservabilityResult;
}) {
  const cni = data.cni;
  const providerNote =
    cni.provider === "cilium"
      ? "Cilium-specific policies, endpoints and Hubble flows are available in the provider tabs."
      : `Provider-specific policy and flow views are not available for ${cni.displayName}. Standard NetworkPolicies, Services and EndpointSlices are included above.`;

  return (
    <div
      className="flex-1 overflow-auto min-h-0 p-3 sm:p-4 space-y-3"
      data-testid="network-observability-overview"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric
          icon={Radar}
          label="CNI provider"
          value={cni.displayName}
          detail={
            cni.version
              ? `Version ${cni.version}`
              : cni.detected
                ? "Provider detected"
                : "Generic fallback"
          }
          testId="cni-provider-name"
        />
        <OverviewMetric
          icon={Network}
          label="Nodes"
          value={`${data.readyNodeCount}/${data.nodeCount}`}
          detail="ready / total"
        />
        <OverviewMetric
          icon={Activity}
          label="Pods"
          value={`${data.runningPodCount}/${data.podCount}`}
          detail="running / total"
        />
        <OverviewMetric
          icon={Shield}
          label="Network policies"
          value={data.networkPolicyCount}
          detail="standard policies"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric
          icon={Network}
          label="Services"
          value={data.serviceCount}
          detail="cluster-wide"
        />
        <OverviewMetric
          icon={Boxes}
          label="EndpointSlices"
          value={data.endpointSliceCount}
          detail="discovery API"
        />
        <div className="glass-panel rounded-xl border border-[var(--border)] p-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
            <Network className="w-3.5 h-3.5 text-[var(--accent)]" />
            Pod CIDRs
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.podCidrs.length > 0 ? (
              data.podCidrs.map((cidr) => (
                <span
                  key={cidr}
                  className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground)] dark:bg-white/5"
                >
                  {cidr}
                </span>
              ))
            ) : (
              <span className="text-[10px] font-mono text-[var(--muted)]">
                Not reported by this cluster
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-[var(--muted)]">
            <span>IP families:</span>
            {data.ipFamilies.length > 0 ? (
              data.ipFamilies.map((family) => (
                <span
                  key={family}
                  className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 text-[var(--foreground)] dark:bg-white/5"
                >
                  {family}
                </span>
              ))
            ) : (
              <span>unknown</span>
            )}
          </div>
        </div>
        <div className="glass-panel rounded-xl border border-[var(--border)] p-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
            <Shield className="w-3.5 h-3.5 text-[var(--accent)]" />
            Capabilities
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cni.capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)] dark:bg-white/5"
              >
                {CNI_CAPABILITY_LABELS[capability] ?? capability}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-[var(--border)] p-3">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
          <Radar className="w-3.5 h-3.5 text-[var(--accent)]" />
          Detection
        </div>
        <p className="mt-1.5 text-[11px] font-mono text-[var(--foreground)]">
          {cni.detectionSource || "No detection source reported"}
        </p>
        <p className="mt-1 text-[11px] text-[var(--muted)]">{providerNote}</p>
      </div>
    </div>
  );
}

function OverviewMetric({
  icon: Icon,
  label,
  value,
  detail,
  testId,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  detail: string;
  testId?: string;
}) {
  return (
    <div className="glass-panel min-w-0 rounded-xl border border-[var(--border)] p-3">
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
        <span>{label}</span>
        <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
      </div>
      <div
        className="mt-2 truncate text-lg font-semibold text-[var(--foreground)]"
        data-testid={testId}
        title={String(value)}
      >
        {value}
      </div>
      <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted)]">
        {detail}
      </div>
    </div>
  );
}
