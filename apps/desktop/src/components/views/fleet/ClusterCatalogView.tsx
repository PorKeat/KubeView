"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings2,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import type { FleetClusterOverview } from "@kubeview/contracts";
import { toast } from "sonner";
import {
  useClusterStore,
  type ClusterContextInfo,
} from "@/stores/clusterStore";
import { useFleetOverviewStore } from "@/stores/fleetStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useTabStore } from "@/stores/tabStore";
import {
  ENV_TAG_OPTIONS,
  resolveEnvTag,
  useCatalogStore,
  type EnvTag,
} from "@/stores/catalogStore";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  EMPTY_FLEET_TOTALS,
  providerLabel,
  relativeTime,
} from "./lib/fleetOverview";
import { FleetSummaryStrip } from "./components/FleetSummaryStrip";
import {
  CATALOG_STATUS_ORDER,
  ENV_META,
  catalogStatusMeta,
  type CatalogStatus,
} from "./catalog/catalogMeta";
import { CatalogClusterDrawer } from "./catalog/CatalogClusterDrawer";
import { ClusterImageControl } from "./catalog/ClusterImageControl";

type CatalogFilter = "all" | "healthy" | "attention" | "offline";
type SortKey = "name" | "status" | "distro" | "version" | "latency";

const FILTERS: { id: CatalogFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "healthy", label: "Healthy" },
  { id: "attention", label: "Needs attention" },
  { id: "offline", label: "Offline" },
];

const ENV_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All environments" },
  ...ENV_TAG_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
];

interface CatalogRow {
  context: ClusterContextInfo;
  snapshot?: FleetClusterOverview;
  status: CatalogStatus;
  env: EnvTag;
  pinned: boolean;
  version: string;
  latency: number;
}

function compareKnownStrings(a: string, b: string, dir: number) {
  const aKnown = a !== "—" && a.length > 0;
  const bKnown = b !== "—" && b.length > 0;
  if (!aKnown && !bKnown) return 0;
  if (!aKnown) return 1;
  if (!bKnown) return -1;
  return dir * a.localeCompare(b);
}

function compareRows(a: CatalogRow, b: CatalogRow, key: SortKey, dir: number) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

  switch (key) {
    case "status":
      return (
        dir * (CATALOG_STATUS_ORDER[a.status] - CATALOG_STATUS_ORDER[b.status])
      );
    case "distro":
      return (
        dir *
        providerLabel(a.context.provider).localeCompare(
          providerLabel(b.context.provider),
        )
      );
    case "version":
      return compareKnownStrings(a.version, b.version, dir);
    case "latency": {
      if (a.latency === 0 && b.latency === 0) return 0;
      if (a.latency === 0) return 1;
      if (b.latency === 0) return -1;
      return dir * (a.latency - b.latency);
    }
    case "name":
    default:
      return dir * a.context.name.localeCompare(b.context.name);
  }
}

export function ClusterCatalogView() {
  const availableContexts = useClusterStore((state) => state.availableContexts);
  const currentContext = useClusterStore((state) => state.currentContext);
  const connectionStatus = useClusterStore((state) => state.connectionStatus);
  const serverVersion = useClusterStore((state) => state.serverVersion);
  const configPath = useClusterStore((state) => state.configPath);
  const switchContext = useClusterStore((state) => state.switchContext);
  const diagnoseContext = useClusterStore((state) => state.diagnoseContext);
  const openEndpointModal = useClusterStore((state) => state.openEndpointModal);
  const deleteContext = useClusterStore((state) => state.deleteContext);
  const loadContexts = useClusterStore((state) => state.loadContexts);
  const openKubeconfigModal = useClusterStore(
    (state) => state.openKubeconfigModal,
  );
  const overview = useFleetOverviewStore((state) => state.overview);
  const isFleetLoading = useFleetOverviewStore((state) => state.isLoading);
  const loadFleetOverview = useFleetOverviewStore(
    (state) => state.loadFleetOverview,
  );
  const setFleetCatalogSection = useLayoutStore(
    (state) => state.setFleetCatalogSection,
  );
  const setCatalogMode = useLayoutStore((state) => state.setCatalogMode);
  const openTab = useTabStore((state) => state.openTab);

  const pinned = useCatalogStore((state) => state.pinned);
  const tags = useCatalogStore((state) => state.tags);
  const images = useCatalogStore((state) => state.images);
  const contextAliases = useCatalogStore((state) => state.aliases);
  const togglePin = useCatalogStore((state) => state.togglePin);
  const setTag = useCatalogStore((state) => state.setTag);
  const setContextImage = useCatalogStore((state) => state.setContextImage);

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<CatalogFilter>("all");
  const [envFilter, setEnvFilter] = React.useState<string>("all");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmingBulkRemove, setConfirmingBulkRemove] = React.useState(false);
  const [bulkBusy, setBulkBusy] = React.useState<
    "diagnose" | "refresh" | "remove" | null
  >(null);
  const [drawerContext, setDrawerContext] = React.useState<string | null>(null);
  const [openingContext, setOpeningContext] = React.useState<string | null>(
    null,
  );

  const contextKey = React.useMemo(
    () =>
      availableContexts
        .map((context) => context.name)
        .sort()
        .join("|"),
    [availableContexts],
  );

  React.useEffect(() => {
    if (contextKey) {
      void loadFleetOverview();
    }
  }, [contextKey, loadFleetOverview]);

  const fleetByContext = React.useMemo(
    () =>
      new Map(
        (overview?.clusters ?? []).map((cluster) => [
          cluster.contextName,
          cluster,
        ]),
      ),
    [overview],
  );

  const rows = React.useMemo<CatalogRow[]>(() => {
    return availableContexts.map((context) => {
      const snapshot = fleetByContext.get(context.name);
      const status: CatalogStatus =
        context.name === currentContext
          ? connectionStatus === "connected"
            ? "healthy"
            : connectionStatus
          : snapshot
            ? snapshot.status === "healthy"
              ? "healthy"
              : snapshot.status
            : context.status === "connected"
              ? "healthy"
              : context.status;
      const version =
        context.name === currentContext &&
        serverVersion &&
        serverVersion !== "Unavailable"
          ? serverVersion
          : "—";

      return {
        context,
        snapshot,
        status,
        env: resolveEnvTag(tags, context.name),
        pinned: pinned.includes(context.name),
        version,
        latency: context.latencyMs,
      };
    });
  }, [
    availableContexts,
    connectionStatus,
    currentContext,
    fleetByContext,
    pinned,
    serverVersion,
    tags,
  ]);

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesHealth =
        filter === "all" ||
        (filter === "attention"
          ? row.status === "degraded"
          : row.status === filter);
      if (!matchesHealth) return false;
      if (envFilter !== "all" && row.env !== envFilter) return false;
      if (!query) return true;
      return `${row.context.name} ${
        contextAliases[row.context.name] ?? ""
      } ${row.context.server} ${row.context.provider} ${
        row.snapshot?.cluster ?? ""
      } ${ENV_META[row.env].label}`
        .toLowerCase()
        .includes(query);
    });
  }, [contextAliases, envFilter, filter, rows, search]);

  const sortedRows = React.useMemo(() => {
    return [...filteredRows].sort((a, b) =>
      compareRows(a, b, sort.key, sort.dir),
    );
  }, [filteredRows, sort]);

  const filterCounts = React.useMemo(() => {
    const counts: Record<CatalogFilter, number> = {
      all: rows.length,
      healthy: 0,
      attention: 0,
      offline: 0,
    };
    for (const row of rows) {
      if (row.status === "healthy") counts.healthy += 1;
      else if (row.status === "degraded") counts.attention += 1;
      else if (row.status === "offline") counts.offline += 1;
    }
    return counts;
  }, [rows]);

  React.useEffect(() => {
    setSelected((previous) => {
      const valid = new Set(
        [...previous].filter((name) =>
          availableContexts.some((context) => context.name === name),
        ),
      );
      return valid.size === previous.size ? previous : valid;
    });
  }, [availableContexts]);

  const visibleSelectedCount = sortedRows.filter((row) =>
    selected.has(row.context.name),
  ).length;
  const allVisibleSelected =
    sortedRows.length > 0 && visibleSelectedCount === sortedRows.length;
  const selectAllRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        visibleSelectedCount > 0 && !allVisibleSelected;
    }
  }, [allVisibleSelected, visibleSelectedCount]);

  const toggleSort = (key: SortKey) => {
    setSort((previous) =>
      previous.key === key
        ? { key, dir: previous.dir === 1 ? -1 : 1 }
        : { key, dir: 1 },
    );
  };

  const toggleRow = (name: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setConfirmingBulkRemove(false);
  };

  const toggleAllVisible = () => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) {
        for (const row of sortedRows) next.delete(row.context.name);
      } else {
        for (const row of sortedRows) next.add(row.context.name);
      }
      return next;
    });
    setConfirmingBulkRemove(false);
  };

  const handleOpenCluster = async (contextName: string) => {
    setCatalogMode(false);
    setDrawerContext(null);
    if (contextName === currentContext) {
      openTab({
        id: "overview",
        title: "Cluster Overview",
        icon: "LayoutDashboard",
        closable: false,
      });
      return;
    }

    setOpeningContext(contextName);
    try {
      await switchContext(contextName);
      if (useClusterStore.getState().currentContext === contextName) {
        toast.success(`Switched to ${contextName}`);
        openTab({
          id: "overview",
          title: "Cluster Overview",
          icon: "LayoutDashboard",
          closable: false,
        });
      } else {
        toast.error(`Could not switch to ${contextName}`);
      }
    } finally {
      setOpeningContext(null);
    }
  };

  const handleDiagnose = async (contextName: string) => {
    toast.info(`Diagnosing ${contextName}...`);
    const result = await diagnoseContext(contextName);
    if (result?.status === "connected") {
      toast.success(
        `${contextName} connected · ${result.serverVersion ?? "OK"} (${result.latencyMs}ms)`,
      );
    } else if (result?.status === "degraded") {
      toast.warning(`${contextName} connected with restricted RBAC.`);
    } else {
      toast.error(`${contextName} did not respond.`);
    }
  };

  const handleRemove = async (contextName: string) => {
    await deleteContext(contextName);
    setSelected((previous) => {
      const next = new Set(previous);
      next.delete(contextName);
      return next;
    });
    setDrawerContext(null);
    toast.success(`Cluster removed: ${contextName}`);
  };

  const handleBulkDiagnose = async () => {
    const names = [...selected];
    if (names.length === 0) return;
    setBulkBusy("diagnose");
    try {
      await Promise.all(names.map((name) => diagnoseContext(name)));
      toast.success(
        `Checked ${names.length} cluster${names.length === 1 ? "" : "s"}`,
      );
    } finally {
      setBulkBusy(null);
    }
  };

  const handleBulkDiagnoseRows = async (targetRows: CatalogRow[]) => {
    if (targetRows.length === 0) return;
    setBulkBusy("diagnose");
    try {
      await Promise.all(
        targetRows.map((row) => diagnoseContext(row.context.name)),
      );
      toast.success(
        `Checked ${targetRows.length} cluster${
          targetRows.length === 1 ? "" : "s"
        }`,
      );
    } finally {
      setBulkBusy(null);
    }
  };

  const handleBulkRefresh = async () => {
    setBulkBusy("refresh");
    try {
      await Promise.all([loadContexts(), loadFleetOverview(true)]);
      toast.success("Catalog refreshed");
    } finally {
      setBulkBusy(null);
    }
  };

  const handleBulkRemove = async () => {
    const names = [...selected];
    if (names.length === 0) return;
    setBulkBusy("remove");
    try {
      for (const name of names) {
        await deleteContext(name);
      }
      toast.success(
        `Removed ${names.length} context${names.length === 1 ? "" : "s"}`,
      );
      setSelected(new Set());
      setConfirmingBulkRemove(false);
    } finally {
      setBulkBusy(null);
    }
  };

  const handleRefresh = async () => {
    const result = await loadFleetOverview(true);
    if (result) {
      toast.success(
        `Refreshed ${result.totals.total} cluster${
          result.totals.total === 1 ? "" : "s"
        }`,
      );
    } else {
      toast.error("Unable to refresh cluster catalog");
    }
  };

  const drawerRow = drawerContext
    ? rows.find((row) => row.context.name === drawerContext)
    : undefined;

  return (
    <div
      data-testid="cluster-catalog-view"
      className="flex w-full flex-1 select-none flex-col overflow-y-auto p-4 md:p-5 lg:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                Clusters
              </h1>
              <span className="rounded border border-[var(--border)] bg-[var(--surface-active)] px-2 py-0.5 font-mono text-[10px] text-[var(--foreground)]">
                {availableContexts.length}{" "}
                {availableContexts.length === 1 ? "item" : "items"}
              </span>
              {overview && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-[11px] text-[var(--muted)]">
              Every kubeconfig you have added. Pin the ones you use daily, tag
              environments, and inspect details without leaving the catalog.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openKubeconfigModal("manage")}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              <Settings2 className="h-3.5 w-3.5 text-[var(--muted)]" />
              <span>Manage</span>
            </button>
            <button
              type="button"
              onClick={() => openKubeconfigModal("browse")}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              <Plus className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>Import</span>
            </button>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isFleetLoading}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#f08a42] to-[#e85d26] px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-xs transition-all hover:from-[#ff9d5c] hover:to-[#f08a42] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={cn("h-3 w-3", isFleetLoading && "animate-spin")}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFleetCatalogSection("health")}
          className="inline-flex w-fit items-center gap-1.5 rounded-md py-0.5 text-[11px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
        >
          View fleet health
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {availableContexts.length > 0 && (
        <div className="mt-4">
          <FleetSummaryStrip
            totals={overview?.totals ?? EMPTY_FLEET_TOTALS}
            hasSnapshot={Boolean(overview)}
          />
        </div>
      )}

      {selected.size > 0 && (
        <div
          data-testid="catalog-bulk-bar"
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/[0.06] p-2.5"
        >
          <span className="font-mono text-[10px] font-semibold text-[var(--foreground)]">
            {selected.size} selected
          </span>

          {confirmingBulkRemove ? (
            <>
              <span className="text-[11px] text-[var(--foreground)]">
                Remove {selected.size} context
                {selected.size === 1 ? "" : "s"} from this kubeconfig?
              </span>
              <button
                type="button"
                data-testid="catalog-bulk-remove-confirm"
                onClick={() => void handleBulkRemove()}
                disabled={bulkBusy !== null}
                className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60 cursor-pointer"
              >
                {bulkBusy === "remove" && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                Remove
              </button>
              <button
                type="button"
                data-testid="catalog-bulk-remove-cancel"
                onClick={() => setConfirmingBulkRemove(false)}
                className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                data-testid="catalog-bulk-diagnose"
                onClick={() => void handleBulkDiagnose()}
                disabled={bulkBusy !== null}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60 cursor-pointer"
              >
                {bulkBusy === "diagnose" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Stethoscope className="h-3 w-3 text-[var(--muted)]" />
                )}
                Diagnose
              </button>
              <button
                type="button"
                data-testid="catalog-bulk-refresh"
                onClick={() => void handleBulkRefresh()}
                disabled={bulkBusy !== null}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60 cursor-pointer"
              >
                {bulkBusy === "refresh" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 text-[var(--muted)]" />
                )}
                Refresh
              </button>
              <button
                type="button"
                data-testid="catalog-bulk-remove"
                onClick={() => setConfirmingBulkRemove(true)}
                disabled={bulkBusy !== null}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/20 bg-rose-500/5 px-2.5 py-1 text-[10px] font-medium text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-60 cursor-pointer dark:text-rose-400"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
              <button
                type="button"
                data-testid="catalog-bulk-clear"
                onClick={() => setSelected(new Set())}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Clear
              </button>
            </>
          )}
        </div>
      )}

      {availableContexts.length === 0 ? (
        <div className="pt-6">
          <EmptyState
            variant="empty"
            title="No clusters in the catalog"
            description="Import a kubeconfig to add your first cluster context."
            action={{
              label: "Import Kubeconfig",
              icon: <Server className="h-4 w-4" />,
              onClick: () => openKubeconfigModal("browse"),
            }}
          />
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter clusters by name, server, provider..."
                aria-label="Filter clusters"
                className="w-full rounded-lg border border-[var(--border)] bg-black/[0.03] py-1.5 pl-8 pr-2.5 font-mono text-xs text-[var(--foreground)] outline-hidden transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
              />
            </div>

            <div
              role="group"
              aria-label="Filter clusters by health"
              className="flex max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-black/[0.03] p-0.5 text-xs dark:bg-black/30"
            >
              {FILTERS.map((option) => {
                const active = filter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(option.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                      active
                        ? "bg-[var(--surface)] text-[var(--foreground)] font-semibold shadow-xs border border-[var(--border)]/70"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    <span>{option.label}</span>
                    <span className="font-mono text-[9px] tabular-nums text-[var(--muted)]">
                      {filterCounts[option.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="shrink-0">
              <CustomSelect
                value={envFilter}
                onChange={setEnvFilter}
                options={ENV_FILTER_OPTIONS}
                ariaLabel="Filter by environment"
                triggerTestId="catalog-env-filter"
                dropdownWidth="w-44"
              />
            </div>

            <button
              type="button"
              data-testid="catalog-diagnose-all"
              onClick={() => void handleBulkDiagnoseRows(sortedRows)}
              disabled={sortedRows.length === 0 || bulkBusy !== null}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50 cursor-pointer"
            >
              <Stethoscope className="h-3 w-3 text-[var(--muted)]" />
              Diagnose all
            </button>

            <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
              {sortedRows.length} shown
              {overview ? ` · updated ${relativeTime(overview.fetchedAt)}` : ""}
            </span>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full table-fixed border-collapse text-left text-xs">
              <colgroup>
                <col className="w-9" />
                <col className="w-[25%]" />
                <col className="w-[20%]" />
                <col className="w-[8%]" />
                <col className="w-[11%]" />
                <col className="w-[7%]" />
                <col className="w-[9%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th scope="col" className="w-9 px-3 py-2">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      data-testid="catalog-select-all"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Select all visible clusters"
                      className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                    />
                  </th>
                  <SortableHeader
                    id="name"
                    label="Name"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <th scope="col" className="px-3 py-2 font-medium">
                    Endpoint
                  </th>
                  <SortableHeader
                    id="version"
                    label="Version"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    id="distro"
                    label="Distro"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    id="latency"
                    label="Latency"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    id="status"
                    label="Status"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const { context, status, env } = row;
                  const meta = catalogStatusMeta(status);
                  const envMeta = ENV_META[env];
                  const isActive = context.name === currentContext;
                  const isOpening = openingContext === context.name;
                  const alias = contextAliases[context.name];
                  return (
                    <tr
                      key={context.name}
                      data-testid="catalog-cluster-row"
                      data-context-name={context.name}
                      data-status={status}
                      tabIndex={0}
                      onClick={() => setDrawerContext(context.name)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDrawerContext(context.name);
                        }
                      }}
                      aria-label={`Open details for ${context.name}`}
                      className={cn(
                        "group cursor-pointer border-b border-[var(--border)]/70 transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]",
                        isActive && "bg-[var(--accent)]/[0.045]",
                        selected.has(context.name) &&
                          "bg-[var(--accent)]/[0.06]",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          data-testid="catalog-select"
                          data-context-name={context.name}
                          checked={selected.has(context.name)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleRow(context.name)}
                          aria-label={`Select ${context.name}`}
                          className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <ClusterImageControl contextName={context.name} />
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1.5">
                              {row.pinned && (
                                <Pin
                                  className="h-3 w-3 shrink-0 text-[var(--accent)]"
                                  aria-label="Pinned"
                                />
                              )}
                              <span
                                className="truncate font-medium text-[var(--foreground)]"
                                title={
                                  alias
                                    ? `${alias} (${context.name})`
                                    : context.name
                                }
                              >
                                {alias || context.name}
                              </span>
                              {isActive && (
                                <span className="rounded border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                                  Active
                                </span>
                              )}
                              <span
                                data-testid="catalog-env-badge"
                                className={cn(
                                  "rounded border px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-wide",
                                  envMeta.badge,
                                )}
                              >
                                {envMeta.label}
                              </span>
                            </div>
                            <div
                              className="truncate font-mono text-[10px] text-[var(--muted)]"
                              title={context.name}
                            >
                              {alias
                                ? `${context.name} · ${context.cluster}`
                                : context.cluster}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[210px] px-3 py-2.5">
                        <span
                          className="block truncate font-mono text-[10px] text-[var(--muted)]"
                          title={context.server}
                        >
                          {context.server}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--muted)]">
                        {row.version}
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-[var(--muted)]">
                        {providerLabel(context.provider)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] tabular-nums text-[var(--muted)]">
                        {row.latency > 0 ? `${row.latency}ms` : "—"}
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
                          <Tooltip
                            content={row.pinned ? "Unpin" : "Pin to top"}
                            side="top"
                          >
                            <button
                              type="button"
                              data-testid="catalog-pin"
                              data-context-name={context.name}
                              aria-label={
                                row.pinned
                                  ? `Unpin ${context.name}`
                                  : `Pin ${context.name} to top`
                              }
                              aria-pressed={row.pinned}
                              onClick={(event) => {
                                event.stopPropagation();
                                togglePin(context.name);
                              }}
                              className={cn(
                                "rounded-md p-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                                row.pinned
                                  ? "text-[var(--accent)] hover:bg-[var(--accent)]/10"
                                  : "text-[var(--muted)] hover:bg-[var(--surface-active)] hover:text-[var(--foreground)]",
                              )}
                            >
                              <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </Tooltip>
                          <button
                            type="button"
                            data-testid="catalog-open-cluster"
                            data-context-name={context.name}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleOpenCluster(context.name);
                            }}
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
                {sortedRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-[11px] text-[var(--muted)]"
                    >
                      No clusters match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {drawerRow && (
        <CatalogClusterDrawer
          context={drawerRow.context}
          snapshot={drawerRow.snapshot}
          status={drawerRow.status}
          env={drawerRow.env}
          version={drawerRow.version}
          configPath={configPath}
          pinned={drawerRow.pinned}
          isActive={drawerRow.context.name === currentContext}
          image={images[drawerRow.context.name]}
          onClose={() => setDrawerContext(null)}
          onOpen={() => void handleOpenCluster(drawerRow.context.name)}
          onDiagnose={() => void handleDiagnose(drawerRow.context.name)}
          onConfigureEndpoint={() => {
            openEndpointModal(drawerRow.context.name, drawerRow.context.server);
            setDrawerContext(null);
          }}
          onRemove={() => void handleRemove(drawerRow.context.name)}
          onTogglePin={() => togglePin(drawerRow.context.name)}
          onSetEnv={(tag) => setTag(drawerRow.context.name, tag)}
          onSetImage={(image) => setContextImage(drawerRow.context.name, image)}
        />
      )}
    </div>
  );
}

function SortableHeader({
  id,
  label,
  sort,
  onSort,
}: {
  id: SortKey;
  label: string;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === id;
  return (
    <th scope="col" className="px-3 py-2 font-medium">
      <button
        type="button"
        data-testid={`catalog-sort-${id}`}
        onClick={() => onSort(id)}
        aria-label={`Sort by ${label}`}
        aria-pressed={active}
        className={cn(
          "inline-flex items-center gap-1 rounded text-[9px] uppercase tracking-[0.12em] transition-colors cursor-pointer hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
          active ? "text-[var(--foreground)]" : "text-[var(--muted)]",
        )}
      >
        {label}
        {active ? (
          sort.dir === 1 ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-60" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}
