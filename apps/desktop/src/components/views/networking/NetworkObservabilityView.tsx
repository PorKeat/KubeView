"use client";

import * as React from "react";
import {
  Activity,
  Boxes,
  Network,
  Radar,
  RefreshCw,
  Search,
  Shield,
  X,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import {
  EmptyState,
  StatusBeacon,
  TableSkeleton,
  Tooltip,
  type StatusBeaconVariant,
} from "@/components/ui";
import type {
  CiliumEndpointSummary,
  CiliumNetworkPolicySummary,
  HubbleFlowSummary,
  NetworkObservabilityResult,
} from "@kubeview/contracts";

type Mode = "overview" | "policies" | "endpoints" | "flows";

function verdictVariant(verdict: string): StatusBeaconVariant {
  if (verdict.includes("FORWARDED")) return "healthy";
  if (verdict.includes("DROPPED")) return "critical";
  return "muted";
}

export function NetworkObservabilityView() {
  const {
    currentContext,
    currentNamespace,
    autoRefreshInterval,
    ciliumResources,
    isCiliumLoading,
    hasLoadedCiliumOnce,
    loadCiliumResources,
    networkObservability,
    isNetworkObservabilityLoading,
    networkObservabilityError,
    loadNetworkObservability,
    hubbleFlows,
    isHubbleFlowsLoading,
    hubbleFlowsError,
    loadHubbleFlows,
  } = useClusterStore();

  const [mode, setMode] = React.useState<Mode>("overview");
  const [search, setSearch] = React.useState("");

  const provider = networkObservability?.cni.provider;
  const isCiliumProvider = provider === "cilium";
  const cni = networkObservability?.cni;
  const status = ciliumResources?.status;
  const policies = ciliumResources?.policies ?? [];
  const endpoints = ciliumResources?.endpoints ?? [];
  const providerLoading = !cni && !networkObservabilityError;
  const checkingHubble = isCiliumProvider && !status && isCiliumLoading;
  const providerVersion = cni?.version || status?.version;
  const versionLabel =
    providerVersion && providerVersion.length > 18
      ? `${providerVersion.slice(0, 12)}…`
      : providerVersion;

  const refreshAll = React.useCallback(() => {
    if (!currentContext) return;
    void loadNetworkObservability(currentContext);
    if (isCiliumProvider) {
      void loadCiliumResources(currentNamespace);
    }
  }, [
    currentContext,
    currentNamespace,
    isCiliumProvider,
    loadCiliumResources,
    loadNetworkObservability,
  ]);

  React.useEffect(() => {
    if (currentContext) void loadNetworkObservability(currentContext);
  }, [currentContext, loadNetworkObservability]);

  React.useEffect(() => {
    if (currentContext && isCiliumProvider) {
      void loadCiliumResources(currentNamespace);
    }
  }, [currentContext, currentNamespace, isCiliumProvider, loadCiliumResources]);

  React.useEffect(() => {
    if (!isCiliumProvider && mode !== "overview") {
      setMode("overview");
    }
  }, [isCiliumProvider, mode]);

  React.useEffect(() => {
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(refreshAll, autoRefreshInterval);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, currentContext, refreshAll]);

  const query = search.trim().toLowerCase();
  const filteredPolicies = query
    ? policies.filter((policy) =>
        `${policy.name} ${policy.namespace} ${policy.endpointSelector} ${policy.status}`
          .toLowerCase()
          .includes(query),
      )
    : policies;
  const filteredEndpoints = query
    ? endpoints.filter((endpoint) =>
        `${endpoint.name} ${endpoint.namespace} ${endpoint.podName} ${endpoint.ipv4 ?? ""} ${endpoint.ipv6 ?? ""} ${endpoint.state}`
          .toLowerCase()
          .includes(query),
      )
    : endpoints;
  const filteredFlows = query
    ? hubbleFlows.filter((flow) =>
        `${flow.summary} ${flow.verdict} ${flow.sourcePod ?? ""} ${flow.destinationPod ?? ""} ${flow.sourceNamespace ?? ""} ${flow.destinationNamespace ?? ""}`
          .toLowerCase()
          .includes(query),
      )
    : hubbleFlows;
  const searchPlaceholder =
    mode === "policies"
      ? "Filter policies..."
      : mode === "endpoints"
        ? "Filter endpoints..."
        : "Filter flows...";
  const showProviderSearch = isCiliumProvider && mode !== "overview";
  const providerLabel = providerLoading
    ? "Detecting CNI"
    : !cni
      ? "CNI unavailable"
      : cni.provider === "cilium"
        ? "Cilium installed"
        : cni.detected
          ? `${cni.displayName} detected`
          : "Generic CNI";
  const providerVariant: StatusBeaconVariant = providerLoading
    ? "pending"
    : !cni
      ? "muted"
      : cni.detected
        ? "healthy"
        : "muted";

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden select-none"
      data-testid="network-observability-view"
    >
      <div className="border-b border-[var(--border)] px-3 sm:px-4 py-3 shrink-0 glass-panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25">
              <Radar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
                Network Observability
              </h2>
              <p className="text-[10px] font-mono text-[var(--muted)]">
                CNI health, policies and flow visibility
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
            <StatusBeacon
              variant={providerVariant}
              label={providerLabel}
              size="sm"
            />
            {providerVersion && (
              <span
                className="inline-flex h-[18px] items-center rounded-md bg-black/5 px-1.5 leading-none dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                title={providerVersion}
              >
                {versionLabel}
              </span>
            )}
            {isCiliumProvider ? (
              <StatusBeacon
                variant={
                  checkingHubble
                    ? "pending"
                    : status?.hubbleAvailable
                      ? "healthy"
                      : "muted"
                }
                label={
                  checkingHubble
                    ? "Checking Hubble"
                    : status?.hubbleAvailable
                      ? "Hubble relay"
                      : "Hubble off"
                }
                size="sm"
              />
            ) : (
              <StatusBeacon
                variant="muted"
                label="Standard networking"
                size="sm"
              />
            )}
            <Tooltip content="Refresh network observability">
              <button
                type="button"
                onClick={refreshAll}
                disabled={
                  isNetworkObservabilityLoading ||
                  (isCiliumProvider && isCiliumLoading)
                }
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Refresh network observability"
              >
                <RefreshCw
                  className={cn(
                    "w-3.5 h-3.5",
                    (isNetworkObservabilityLoading ||
                      (isCiliumProvider && isCiliumLoading)) &&
                      "animate-spin text-[var(--accent)]",
                  )}
                />
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] border border-[var(--border)] text-xs">
            <ModeTab
              id="overview"
              label="Overview"
              icon={Activity}
              active={mode === "overview"}
              onClick={() => setMode("overview")}
            />
            {isCiliumProvider && (
              <>
                <ModeTab
                  id="policies"
                  label="Policies"
                  count={policies.length}
                  icon={Shield}
                  active={mode === "policies"}
                  onClick={() => setMode("policies")}
                />
                <ModeTab
                  id="endpoints"
                  label="Endpoints"
                  count={endpoints.length}
                  icon={Boxes}
                  active={mode === "endpoints"}
                  onClick={() => setMode("endpoints")}
                />
                <ModeTab
                  id="flows"
                  label="Hubble Flows"
                  count={hubbleFlows.length}
                  icon={Radar}
                  active={mode === "flows"}
                  onClick={() => setMode("flows")}
                />
              </>
            )}
          </div>
          {showProviderSearch && (
            <div className="relative ml-auto w-full max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                data-testid="network-observability-search"
                className="w-full rounded-lg border border-[var(--border)] bg-slate-50 py-1 pl-8 pr-7 font-mono text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden transition-all focus:border-[var(--accent)] dark:bg-black/30"
                aria-label={searchPlaceholder}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                  aria-label="Clear network observability search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          {networkObservabilityError && (
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">
              {networkObservabilityError}
            </span>
          )}
          {status?.message && isCiliumProvider && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
              {status.message}
            </span>
          )}
        </div>
      </div>

      {!networkObservability && !networkObservabilityError ? (
        <TableSkeleton rows={8} columns={4} />
      ) : !networkObservability ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            variant="empty"
            title="Network observability unavailable"
            description={
              networkObservabilityError ||
              "The connected cluster did not return network information."
            }
            action={{
              label: "Re-scan Cluster",
              icon: <RefreshCw className="w-3.5 h-3.5" />,
              onClick: refreshAll,
            }}
          />
        </div>
      ) : mode === "overview" ? (
        <NetworkOverviewPanel data={networkObservability} />
      ) : isCiliumLoading && !hasLoadedCiliumOnce ? (
        <TableSkeleton rows={10} columns={8} />
      ) : mode === "policies" ? (
        <PolicyTable policies={filteredPolicies} searching={query.length > 0} />
      ) : mode === "endpoints" ? (
        <EndpointTable
          endpoints={filteredEndpoints}
          searching={query.length > 0}
        />
      ) : (
        <HubbleFlowPanel
          flows={filteredFlows}
          searching={query.length > 0}
          isLoading={isHubbleFlowsLoading}
          error={hubbleFlowsError}
          hubbleAvailable={Boolean(status?.hubbleAvailable)}
          onLoad={() => void loadHubbleFlows(50)}
        />
      )}
    </div>
  );
}

const CNI_CAPABILITY_LABELS: Record<string, string> = {
  overview: "Overview",
  standardNetworkPolicies: "Standard NetworkPolicies",
  services: "Services",
  endpointSlices: "EndpointSlices",
  ciliumPolicies: "Cilium policies",
  ciliumEndpoints: "Cilium endpoints",
  hubbleFlows: "Hubble flows",
};

function NetworkOverviewPanel({ data }: { data: NetworkObservabilityResult }) {
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

function ModeTab({
  id,
  label,
  count,
  icon: Icon,
  active,
  onClick,
}: {
  id: Mode;
  label: string;
  count?: number;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={
        id === "overview"
          ? "network-observability-tab-overview"
          : `cilium-tab-${id}`
      }
      onClick={onClick}
      className={cn(
        "relative px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        active
          ? "text-[var(--foreground)] font-semibold"
          : "text-[var(--muted)] hover:text-[var(--foreground)]",
      )}
    >
      {active && (
        <motion.span
          layoutId="network-observability-tab"
          className="absolute inset-0 rounded-md bg-[var(--surface-elevated)] dark:bg-white/10 shadow-xs border border-[var(--border)] -z-10"
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
        />
      )}
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/5 text-[var(--muted)]">
          {count}
        </span>
      )}
    </button>
  );
}

function PolicyTable({
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

function EndpointTable({
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

function HubbleFlowPanel({
  flows,
  isLoading,
  error,
  hubbleAvailable,
  onLoad,
  searching,
}: {
  flows: HubbleFlowSummary[];
  isLoading: boolean;
  error: string | null;
  hubbleAvailable: boolean;
  onLoad: () => void;
  searching: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--muted)]">
          <Network className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Latest flows via hubble-relay gRPC</span>
          {!hubbleAvailable && (
            <span className="text-amber-600 dark:text-amber-400">
              Hubble relay is not available
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onLoad}
          disabled={isLoading || !hubbleAvailable}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md transition-all disabled:opacity-50",
            hubbleAvailable
              ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] cursor-pointer"
              : "border border-[var(--border)] bg-black/5 text-[var(--muted)] dark:bg-white/5 cursor-not-allowed",
          )}
          data-testid="hubble-load-flows"
        >
          {isLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          {isLoading ? "Loading..." : "Load Flows"}
        </button>
      </div>

      {error && (
        <div className="m-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {flows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            variant="empty"
            title={searching ? "No flows match your search" : "No flows loaded"}
            description={
              searching
                ? "Clear the search to show all loaded Hubble flows."
                : "Load the most recent Hubble flows from the relay to inspect allowed and dropped traffic."
            }
            action={
              hubbleAvailable
                ? {
                    label: "Load Flows",
                    icon: <Activity className="w-3.5 h-3.5" />,
                    onClick: onLoad,
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div
          className="flex-1 overflow-auto min-h-0"
          data-testid="cilium-table-scroll"
        >
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)]">
              <tr className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8 whitespace-nowrap">
                <th className="w-[8%] py-1 px-2">Time</th>
                <th className="w-[12%] py-1 px-2">Verdict</th>
                <th className="w-[17%] py-1 px-2">Source</th>
                <th className="w-[17%] py-1 px-2">Destination</th>
                <th className="w-[8%] py-1 px-2">L4</th>
                <th className="w-[10%] py-1 px-2">Node</th>
                <th className="w-[28%] py-1 px-2">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {flows.map((flow, index) => (
                <tr
                  key={`${flow.time}-${index}`}
                  data-testid="cilium-flow-row"
                  className="h-9 hover:bg-[var(--surface-hover)] transition-colors"
                  title={flow.rawJson}
                >
                  <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)]">
                    {flow.time ? new Date(flow.time).toLocaleTimeString() : "—"}
                  </td>
                  <td className="py-1 px-3">
                    <StatusBeacon
                      variant={verdictVariant(flow.verdict)}
                      label={flow.verdict || "UNKNOWN"}
                      size="xs"
                    />
                  </td>
                  <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)] truncate max-w-[190px]">
                    {flow.sourceNamespace ? `${flow.sourceNamespace}/` : ""}
                    {flow.sourcePod || flow.sourceIp || "—"}
                  </td>
                  <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)] truncate max-w-[190px]">
                    {flow.destinationNamespace
                      ? `${flow.destinationNamespace}/`
                      : ""}
                    {flow.destinationPod || flow.destinationIp || "—"}
                  </td>
                  <td className="py-1 px-3 font-mono text-[10px]">
                    {flow.protocol
                      ? `${flow.protocol}/${flow.destinationPort || flow.sourcePort || "?"}`
                      : "—"}
                  </td>
                  <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)]">
                    {flow.nodeName || "—"}
                  </td>
                  <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)] truncate max-w-[280px]">
                    {flow.summary}
                    {flow.dropReason ? ` (${flow.dropReason})` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
