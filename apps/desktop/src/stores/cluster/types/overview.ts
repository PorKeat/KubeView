import type { ClusterOverviewResult } from "@kubeview/contracts";

export interface OverviewSlice {
  clusterOverview: ClusterOverviewResult | null;
  isOverviewLoading: boolean;
  loadClusterOverview: (
    contextName?: string,
    namespace?: string,
  ) => Promise<ClusterOverviewResult | null>;
}
