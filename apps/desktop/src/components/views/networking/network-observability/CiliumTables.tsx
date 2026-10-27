"use client";

import { EmptyState, StatusBeacon } from "@/components/ui";
import type {
  CiliumEndpointSummary,
  CiliumNetworkPolicySummary,
} from "@kubeview/contracts";

export function PolicyTable({
  policies,
  searching,
}: {
  policies: CiliumNetworkPolicySummary[];
  searching: boolean;
}) {
  if (policies.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <EmptyState
          variant={searching ? "search" : "empty"}
          title={
            searching
              ? "No Cilium policies match your search"
              : "No CiliumNetworkPolicies"
          }
          description={
            searching
              ? "Clear the search to show all Cilium policies in this namespace."
              : "Cilium policy objects are not present in this namespace."
          }
        />
      </div>
    );
  }
  return (
    <div
      className="flex-1 overflow-auto min-h-0"
      data-testid="cilium-table-scroll"
    >
      <table className="w-full text-left text-xs border-collapse table-fixed">
        <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)]">
          <tr className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8 whitespace-nowrap">
            <th className="w-[18%] py-1 px-2">Name</th>
            <th className="w-[10%] py-1 px-2">Namespace</th>
            <th className="w-[10%] py-1 px-2">Status</th>
            <th className="w-[32%] py-1 px-2">Endpoint Selector</th>
            <th className="w-[10%] py-1 px-2 text-right">Ingress</th>
            <th className="w-[10%] py-1 px-2 text-right">Egress</th>
            <th className="w-[10%] py-1 px-2">Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {policies.map((policy) => (
            <tr
              key={`${policy.namespace}/${policy.name}`}
              data-testid="cilium-policy-row"
              className="h-9 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <td
                className="py-1 px-3 font-mono font-medium text-[var(--foreground)] truncate"
                title={policy.name}
              >
                {policy.name}
              </td>
              <td
                className="py-1 px-3 font-mono text-[var(--muted)] truncate"
                title={policy.namespace}
              >
                {policy.namespace}
              </td>
              <td className="py-1 px-3">
                <StatusBeacon
                  variant={policy.status === "Enforcing" ? "healthy" : "muted"}
                  label={policy.status}
                  size="xs"
                />
              </td>
              <td
                className="py-1 px-3 font-mono text-[10px] text-[var(--muted)] truncate"
                title={policy.endpointSelector}
              >
                {policy.endpointSelector}
              </td>
              <td className="py-1 px-3 font-mono tabular-nums text-right">
                {policy.ingressRules}
              </td>
              <td className="py-1 px-3 font-mono tabular-nums text-right">
                {policy.egressRules}
              </td>
              <td className="py-1 px-3 font-mono text-[var(--muted)]">
                {policy.age}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EndpointTable({
  endpoints,
  searching,
}: {
  endpoints: CiliumEndpointSummary[];
  searching: boolean;
}) {
  if (endpoints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <EmptyState
          variant={searching ? "search" : "empty"}
          title={
            searching
              ? "No Cilium endpoints match your search"
              : "No CiliumEndpoints"
          }
          description={
            searching
              ? "Clear the search to show all Cilium endpoints in this namespace."
              : "Cilium endpoint objects are not present in this namespace."
          }
        />
      </div>
    );
  }
  return (
    <div
      className="flex-1 overflow-auto min-h-0"
      data-testid="cilium-table-scroll"
    >
      <table className="w-full text-left text-xs border-collapse table-fixed">
        <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)]">
          <tr className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8 whitespace-nowrap">
            <th className="w-[18%] py-1 px-2">Endpoint</th>
            <th className="w-[18%] py-1 px-2">Pod</th>
            <th className="w-[11%] py-1 px-2">Namespace</th>
            <th className="w-[8%] py-1 px-2 text-right">Identity</th>
            <th className="w-[9%] py-1 px-2">State</th>
            <th className="w-[12%] py-1 px-2">IPv4</th>
            <th className="w-[8%] py-1 px-2">Ingress</th>
            <th className="w-[8%] py-1 px-2">Egress</th>
            <th className="w-[8%] py-1 px-2">Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {endpoints.map((endpoint) => (
            <tr
              key={`${endpoint.namespace}/${endpoint.name}`}
              data-testid="cilium-endpoint-row"
              className="h-9 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <td
                className="py-1 px-3 font-mono font-medium text-[var(--foreground)] truncate"
                title={endpoint.name}
              >
                {endpoint.name}
              </td>
              <td
                className="py-1 px-3 font-mono text-[var(--muted)] truncate"
                title={endpoint.podName}
              >
                {endpoint.podName}
              </td>
              <td
                className="py-1 px-3 font-mono text-[var(--muted)] truncate"
                title={endpoint.namespace}
              >
                {endpoint.namespace}
              </td>
              <td className="py-1 px-3 font-mono tabular-nums text-[var(--muted)] text-right">
                {endpoint.identityId || "—"}
              </td>
              <td className="py-1 px-3">
                <StatusBeacon
                  variant={
                    endpoint.state === "ready"
                      ? "healthy"
                      : endpoint.state
                        ? "warning"
                        : "muted"
                  }
                  label={endpoint.state || "unknown"}
                  size="xs"
                />
              </td>
              <td
                className="py-1 px-3 font-mono text-[var(--muted)] truncate"
                title={endpoint.ipv4 || undefined}
              >
                {endpoint.ipv4 || "—"}
              </td>
              <td className="py-1 px-3">
                <StatusBeacon
                  variant={
                    endpoint.ingressPolicy === "Enforcing" ? "healthy" : "muted"
                  }
                  label={endpoint.ingressPolicy || "Off"}
                  size="xs"
                />
              </td>
              <td className="py-1 px-3">
                <StatusBeacon
                  variant={
                    endpoint.egressPolicy === "Enforcing" ? "healthy" : "muted"
                  }
                  label={endpoint.egressPolicy || "Off"}
                  size="xs"
                />
              </td>
              <td className="py-1 px-3 font-mono text-[var(--muted)]">
                {endpoint.age}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
