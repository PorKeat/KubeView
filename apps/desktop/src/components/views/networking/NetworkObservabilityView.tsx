"use client";

import * as React from "react";
import {
  Activity,
  Boxes,
  Radar,
  RefreshCw,
  Search,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import {
  EmptyState,
  StatusBeacon,
  TableSkeleton,
  Tooltip,
  type StatusBeaconVariant,
} from "@/components/ui";
import { ModeTab, type Mode } from "./network-observability/ModeTab";
import { NetworkOverviewPanel } from "./network-observability/NetworkOverviewPanel";
import {
  EndpointTable,
  PolicyTable,
} from "./network-observability/CiliumTables";
import { HubbleFlowPanel } from "./network-observability/HubbleFlowPanel";

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
