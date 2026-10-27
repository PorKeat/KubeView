"use client";

import { RefreshCw, Server } from "lucide-react";
import { EmptyState, ErrorBanner } from "@/components/ui";
import { FleetClusterCard } from "./components/FleetClusterCard";
import { FleetOverviewHeader } from "./components/FleetOverviewHeader";
import { FleetSkeleton } from "./components/FleetSkeleton";
import { FleetSummaryStrip } from "./components/FleetSummaryStrip";
import { FleetToolbar } from "./components/FleetToolbar";
import { useFleetOverview } from "./hooks/useFleetOverview";

export function FleetOverviewView() {
  const fleet = useFleetOverview();

  return (
    <div
      data-testid="fleet-overview-view"
      className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 space-y-4 select-none w-full"
    >
      <FleetOverviewHeader
        configuredCount={fleet.configuredCount}
        isRefreshing={fleet.isFleetLoading}
        onRefresh={() => void fleet.handleRefresh()}
        onManage={() => fleet.openKubeconfigModal("manage")}
      />

      {fleet.fleetError && fleet.hasSnapshot && (
        <ErrorBanner
          message={`Some cluster data could not be refreshed: ${fleet.fleetError}`}
          actionLabel="Retry"
          onAction={() => void fleet.loadFleetOverview(true)}
        />
      )}

      <FleetSummaryStrip
        totals={fleet.totals}
        hasSnapshot={fleet.hasSnapshot}
      />

      <FleetToolbar
        search={fleet.search}
        filter={fleet.filter}
        filterOptions={fleet.filterOptions}
        shownCount={fleet.filteredClusters.length}
        hasSnapshot={fleet.hasSnapshot}
        isLoading={fleet.isFleetLoading}
        onSearchChange={fleet.setSearch}
        onFilterChange={fleet.setFilter}
      />

      {fleet.showLoading ? (
        <FleetSkeleton count={fleet.configuredCount} />
      ) : fleet.hasNoClusters ? (
        <EmptyState
          variant="empty"
          title="No clusters configured"
          description="Import a kubeconfig to start comparing cluster health in one place."
          action={{
            label: "Import Kubeconfig",
            icon: <Server className="h-4 w-4" />,
            onClick: () => fleet.openKubeconfigModal("browse"),
          }}
        />
      ) : fleet.allClusters.length === 0 ? (
        <EmptyState
          variant="empty"
          title="Unable to load cluster overview"
          description={
            fleet.fleetError ??
            "No cluster snapshots were returned. Check the engine connection and try again."
          }
          action={{
            label: "Retry",
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: () => void fleet.loadFleetOverview(true),
          }}
        />
      ) : fleet.filteredClusters.length === 0 ? (
        <EmptyState
          variant="search"
          title="No clusters match this filter"
          description="Try a different health filter or clear the search query."
          action={{
            label: "Clear Filters",
            icon: <RefreshCw className="h-3.5 w-3.5" />,
            onClick: fleet.clearFilters,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {fleet.filteredClusters.map((cluster) => (
            <FleetClusterCard
              key={cluster.contextName}
              cluster={cluster}
              isActive={cluster.contextName === fleet.currentContext}
              isOpening={fleet.openingContext === cluster.contextName}
              onOpen={() => void fleet.handleOpenCluster(cluster)}
              onRetry={() => void fleet.loadFleetOverview(true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
