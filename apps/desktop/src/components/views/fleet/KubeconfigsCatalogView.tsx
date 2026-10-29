"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useClusterStore,
  type ClusterContextInfo,
} from "@/stores/clusterStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFleetOverviewStore } from "@/stores/fleetStore";
import { useTabStore } from "@/stores/tabStore";
import { cn } from "@/lib/utils";
import { clusterTag, clusterTone } from "@/lib/clusterVisuals";
import { Tooltip } from "@/components/ui/Tooltip";
import { providerLabel } from "./lib/fleetOverview";

function statusMeta(status: ClusterContextInfo["status"]) {
  switch (status) {
    case "connected":
      return {
        label: "Connected",
        dot: "bg-emerald-500",
        text: "text-emerald-700 dark:text-emerald-400",
      };
    case "degraded":
      return {
        label: "Needs attention",
        dot: "bg-amber-500",
        text: "text-amber-700 dark:text-amber-400",
      };
    case "checking":
      return {
        label: "Connecting",
        dot: "bg-sky-500 animate-pulse",
        text: "text-sky-700 dark:text-sky-400",
      };
    default:
      return {
        label: "Offline",
        dot: "bg-rose-500",
        text: "text-rose-700 dark:text-rose-400",
      };
  }
}

export function KubeconfigsCatalogView() {
  const availableContexts = useClusterStore((state) => state.availableContexts);
  const currentContext = useClusterStore((state) => state.currentContext);
  const connectionStatus = useClusterStore((state) => state.connectionStatus);
  const configPath = useClusterStore((state) => state.configPath);
  const isLoading = useClusterStore((state) => state.isLoading);
  const loadContexts = useClusterStore((state) => state.loadContexts);
  const switchContext = useClusterStore((state) => state.switchContext);
  const diagnoseContext = useClusterStore((state) => state.diagnoseContext);
  const openEndpointModal = useClusterStore((state) => state.openEndpointModal);
  const deleteContext = useClusterStore((state) => state.deleteContext);
  const openKubeconfigModal = useClusterStore(
    (state) => state.openKubeconfigModal,
  );
  const fleetOverview = useFleetOverviewStore((state) => state.overview);
  const loadFleetOverview = useFleetOverviewStore(
    (state) => state.loadFleetOverview,
  );
  const setFleetCatalogSection = useLayoutStore(
    (state) => state.setFleetCatalogSection,
  );
  const setCatalogMode = useLayoutStore((state) => state.setCatalogMode);
  const openTab = useTabStore((state) => state.openTab);
  const [copied, setCopied] = React.useState(false);
  const [openingContext, setOpeningContext] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (availableContexts.length > 0) {
      void loadFleetOverview();
    }
  }, [availableContexts.length, loadFleetOverview]);

  const fleetByContext = React.useMemo(
    () =>
      new Map(
        (fleetOverview?.clusters ?? []).map((cluster) => [
          cluster.contextName,
          cluster,
        ]),
      ),
    [fleetOverview],
  );

  const copyPath = async () => {
    if (!configPath) return;
    try {
      await navigator.clipboard.writeText(configPath);
      setCopied(true);
      toast.success("Kubeconfig path copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the kubeconfig path");
    }
  };

  const handleOpen = async (context: ClusterContextInfo) => {
    setCatalogMode(false);
    if (context.name === currentContext) {
      openTab({
        id: "overview",
        title: "Cluster Overview",
        icon: "LayoutDashboard",
        closable: false,
      });
      return;
    }

    setOpeningContext(context.name);
    try {
      await switchContext(context.name);
      if (useClusterStore.getState().currentContext === context.name) {
        toast.success(`Switched to ${context.name}`);
        openTab({
          id: "overview",
          title: "Cluster Overview",
          icon: "LayoutDashboard",
          closable: false,
        });
      } else {
        toast.error(`Could not switch to ${context.name}`);
      }
    } finally {
      setOpeningContext(null);
    }
  };

  const handleDiagnose = async (context: ClusterContextInfo) => {
    toast.info(`Diagnosing ${context.name}...`);
    const result = await diagnoseContext(context.name);
    if (result?.status === "connected") {
      toast.success(
        `${context.name} connected · ${result.serverVersion ?? "OK"} (${result.latencyMs}ms)`,
      );
    } else if (result?.status === "degraded") {
      toast.warning(`${context.name} connected with restricted RBAC.`);
    } else {
      toast.error(
        `${context.name} did not respond${
          result?.remediation ? `: ${result.remediation}` : "."
        }`,
      );
    }
  };

  const handleRemove = async (context: ClusterContextInfo) => {
    toast.info(`Removing ${context.name}...`);
    await deleteContext(context.name);
    toast.success(`Cluster removed: ${context.name}`);
  };

  return (
    <div
      data-testid="kubeconfigs-catalog-view"
      className="flex w-full flex-1 select-none flex-col overflow-y-auto p-4 md:p-5 lg:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                Kubeconfigs
              </h1>
              <span className="rounded border border-[var(--border)] bg-[var(--surface-active)] px-2 py-0.5 font-mono text-[10px] text-[var(--foreground)]">
                {availableContexts.length}{" "}
                {availableContexts.length === 1 ? "context" : "contexts"}
              </span>
              {configPath && (
                <button
                  type="button"
                  onClick={() => void copyPath()}
                  title="Copy kubeconfig file path"
                  className="inline-flex max-w-[280px] items-center gap-1.5 rounded-full border border-[var(--border)] bg-black/[0.03] px-2 py-0.5 font-mono text-[9px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer dark:bg-white/[0.04]"
                >
                  <KeyRound
                    className="h-2.5 w-2.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{configPath}</span>
                  {copied ? (
                    <Check
                      className="h-2.5 w-2.5 shrink-0 text-emerald-500"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
            <p className="mt-1 max-w-xl text-[11px] text-[var(--muted)]">
              Contexts loaded from this kubeconfig. Open a cluster, diagnose its
              connection, re-point the endpoint, or remove the context.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="kubeconfigs-manage"
              onClick={() => openKubeconfigModal("manage")}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              <Settings2 className="h-3.5 w-3.5 text-[var(--muted)]" />
              <span>Manage</span>
            </button>
            <button
              type="button"
              data-testid="kubeconfigs-import"
              onClick={() => openKubeconfigModal("browse")}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              <Plus className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>Import</span>
            </button>
            <button
              type="button"
              onClick={() => void loadContexts()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#f08a42] to-[#e85d26] px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-xs transition-all hover:from-[#ff9d5c] hover:to-[#f08a42] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={cn("h-3 w-3", isLoading && "animate-spin")}
              />
              <span>Reload</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFleetCatalogSection("clusters")}
          className="inline-flex w-fit items-center gap-1.5 rounded-md px-0 py-0.5 text-[11px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
        >
          Back to cluster catalog
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {availableContexts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-[var(--foreground)]">
            No kubeconfig contexts
          </h2>
          <p className="mt-1 max-w-sm text-[11px] text-[var(--muted)]">
            Import a kubeconfig file or point KubeView at a context to see it
            here.
          </p>
          <button
            type="button"
            onClick={() => openKubeconfigModal("browse")}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Import Kubeconfig
          </button>
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <th scope="col" className="px-3 py-2 font-medium">
                  Name
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Cluster
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Endpoint
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Auth
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Namespace
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {availableContexts.map((context) => {
                const snapshot = fleetByContext.get(context.name);
                const liveStatus: ClusterContextInfo["status"] =
                  context.name === currentContext
                    ? connectionStatus
                    : snapshot
                      ? snapshot.status === "healthy"
                        ? "connected"
                        : snapshot.status
                      : context.status;
                const meta = statusMeta(liveStatus);
                const isActive = context.name === currentContext;
                const isOpening = openingContext === context.name;

                return (
                  <tr
                    key={context.name}
                    data-testid="kubeconfig-row"
                    data-context-name={context.name}
                    className={cn(
                      "group border-b border-[var(--border)]/70 transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]",
                      isActive && "bg-[var(--accent)]/[0.045]",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/15 text-[9px] font-semibold tracking-wide text-white shadow-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]"
                          style={{ backgroundImage: clusterTone(context.name) }}
                          aria-hidden="true"
                        >
                          {clusterTag(context.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="truncate font-medium text-[var(--foreground)]"
                              title={context.name}
                            >
                              {context.name}
                            </span>
                            {isActive && (
                              <span className="rounded border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="truncate font-mono text-[10px] text-[var(--muted)]">
                            {providerLabel(context.provider)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[180px] px-3 py-2.5">
                      <span
                        className="block truncate font-mono text-[10px] text-[var(--muted)]"
                        title={context.cluster}
                      >
                        {context.cluster}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-3 py-2.5">
                      <span
                        className="block truncate font-mono text-[10px] text-[var(--muted)]"
                        title={context.server}
                      >
                        {context.server}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--muted)]">
                      {context.authType ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--muted)]">
                      {context.namespace || "default"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-mono text-[10px]",
                          meta.text,
                        )}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
                          aria-hidden="true"
                        />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip content="Diagnose connection" side="top">
                          <button
                            type="button"
                            data-testid="kubeconfig-diagnose"
                            aria-label={`Diagnose ${context.name}`}
                            onClick={() => void handleDiagnose(context)}
                            className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-active)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
                          >
                            <Stethoscope
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        </Tooltip>
                        <Tooltip content="Configure endpoint" side="top">
                          <button
                            type="button"
                            data-testid="kubeconfig-endpoint"
                            aria-label={`Configure endpoint for ${context.name}`}
                            onClick={() =>
                              openEndpointModal(context.name, context.server)
                            }
                            className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-active)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
                          >
                            <SlidersHorizontal
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        </Tooltip>
                        <Tooltip content="Remove context" side="top">
                          <button
                            type="button"
                            data-testid="kubeconfig-remove"
                            aria-label={`Remove ${context.name}`}
                            onClick={() => void handleRemove(context)}
                            className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-rose-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        </Tooltip>
                        <button
                          type="button"
                          data-testid="kubeconfig-open"
                          data-context-name={context.name}
                          onClick={() => void handleOpen(context)}
                          disabled={isOpening}
                          className={cn(
                            "ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-60",
                            isActive
                              ? "text-[var(--accent)] hover:bg-[var(--accent)]/10"
                              : "text-[var(--muted)] hover:bg-[var(--surface-active)] hover:text-[var(--foreground)]",
                          )}
                          aria-label={
                            isActive
                              ? `Open ${context.name} overview`
                              : `Switch to ${context.name} and open its overview`
                          }
                        >
                          {isOpening ? (
                            <Loader2
                              className="h-3 w-3 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <ArrowRight
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                          )}
                          {isActive ? "Overview" : "Open"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
