"use client";

import * as React from "react";
import { toast } from "sonner";
import type { FleetClusterOverview } from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import { useFleetOverviewStore } from "@/stores/fleetStore";
import { useTabStore } from "@/stores/tabStore";
import {
  EMPTY_FLEET_TOTALS,
  filterFleetClusters,
  fleetFilterOptions,
  sortFleetClusters,
  type FleetFilter,
} from "../lib/fleetOverview";

export function useFleetOverview() {
  const overview = useFleetOverviewStore((state) => state.overview);
  const isFleetLoading = useFleetOverviewStore((state) => state.isLoading);
  const hasLoadedFleetOnce = useFleetOverviewStore(
    (state) => state.hasLoadedOnce,
  );
  const fleetError = useFleetOverviewStore((state) => state.error);
  const loadFleetOverview = useFleetOverviewStore(
    (state) => state.loadFleetOverview,
  );

  const availableContexts = useClusterStore((state) => state.availableContexts);
  const currentContext = useClusterStore((state) => state.currentContext);
  const switchContext = useClusterStore((state) => state.switchContext);
  const openKubeconfigModal = useClusterStore(
    (state) => state.openKubeconfigModal,
  );
  const isLoading = useClusterStore((state) => state.isLoading);
  const openTab = useTabStore((state) => state.openTab);

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FleetFilter>("all");
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
  const previousContextKey = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!contextKey) {
      previousContextKey.current = contextKey;
      return;
    }
    const force =
      previousContextKey.current !== null &&
      previousContextKey.current !== contextKey;
    previousContextKey.current = contextKey;
    void loadFleetOverview(force);
  }, [contextKey, loadFleetOverview]);

  const scopedOverview = contextKey ? overview : null;
  const totals = scopedOverview?.totals ?? EMPTY_FLEET_TOTALS;
  const hasSnapshot = scopedOverview !== null;
  const configuredCount = contextKey
    ? totals.total || availableContexts.length
    : 0;
  const allClusters = React.useMemo(
    () => scopedOverview?.clusters ?? [],
    [scopedOverview],
  );
  const orderedClusters = React.useMemo(
    () => sortFleetClusters(allClusters, currentContext),
    [allClusters, currentContext],
  );
  const filteredClusters = React.useMemo(
    () => filterFleetClusters(orderedClusters, search, filter),
    [filter, orderedClusters, search],
  );
  const filterOptions = React.useMemo(
    () => fleetFilterOptions(totals),
    [totals],
  );

  const showLoading =
    Boolean(contextKey) &&
    !scopedOverview &&
    (isFleetLoading || !hasLoadedFleetOnce || isLoading);
  const hasNoClusters = !contextKey && !isLoading && allClusters.length === 0;

  const handleRefresh = async () => {
    const result = await loadFleetOverview(true);
    if (result) {
      toast.success(
        `Refreshed ${result.totals.total} cluster${
          result.totals.total === 1 ? "" : "s"
        }`,
      );
    } else {
      toast.error("Unable to refresh cluster overviews");
    }
  };

  const handleOpenCluster = async (cluster: FleetClusterOverview) => {
    if (cluster.contextName === currentContext) {
      openTab({
        id: "overview",
        title: "Cluster Overview",
        icon: "LayoutDashboard",
        closable: false,
      });
      return;
    }

    setOpeningContext(cluster.contextName);
    try {
      await switchContext(cluster.contextName);
      if (useClusterStore.getState().currentContext === cluster.contextName) {
        toast.success(`Switched to ${cluster.contextName}`);
        openTab({
          id: "overview",
          title: "Cluster Overview",
          icon: "LayoutDashboard",
          closable: false,
        });
      } else {
        toast.error(`Could not switch to ${cluster.contextName}`);
      }
    } finally {
      setOpeningContext(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilter("all");
  };

  return {
    totals,
    hasSnapshot,
    configuredCount,
    currentContext,
    allClusters,
    filteredClusters,
    filterOptions,
    hasLoadedFleetOnce,
    isFleetLoading,
    fleetError,
    isLoading,
    search,
    setSearch,
    filter,
    setFilter,
    openingContext,
    showLoading,
    hasNoClusters,
    loadFleetOverview,
    handleRefresh,
    handleOpenCluster,
    clearFilters,
    openKubeconfigModal,
  };
}
