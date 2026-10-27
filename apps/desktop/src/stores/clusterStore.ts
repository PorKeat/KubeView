import { create } from "zustand";

import { createAccessSlice } from "./cluster/slices/accessSlice";
import { createConfigStorageSlice } from "./cluster/slices/configStorageSlice";
import { createContextLifecycleSlice } from "./cluster/slices/contextLifecycleSlice";
import { createContextsSlice } from "./cluster/slices/contextsSlice";
import { createCoreSlice } from "./cluster/slices/coreSlice";
import { createEventListenersSlice } from "./cluster/slices/eventListenersSlice";
import { createJobsSlice } from "./cluster/slices/jobsSlice";
import { createModalsSlice } from "./cluster/slices/modalsSlice";
import { createNetworkObservabilitySlice } from "./cluster/slices/networkObservabilitySlice";
import { createNetworkingActionsSlice } from "./cluster/slices/networkingActionsSlice";
import { createNetworkingSlice } from "./cluster/slices/networkingSlice";
import { createOverviewSlice } from "./cluster/slices/overviewSlice";
import { createPodsSlice } from "./cluster/slices/podsSlice";
import { createWorkloadActionsSlice } from "./cluster/slices/workloadActionsSlice";
import { createWorkloadsSlice } from "./cluster/slices/workloadsSlice";
import { createYamlSlice } from "./cluster/slices/yamlSlice";
import type { ClusterState } from "./cluster/types/cluster";

export * from "./clusterTypes";

export const useClusterStore = create<ClusterState>()((...args) => ({
  ...createCoreSlice(...args),
  ...createContextsSlice(...args),
  ...createContextLifecycleSlice(...args),
  ...createOverviewSlice(...args),
  ...createPodsSlice(...args),
  ...createWorkloadsSlice(...args),
  ...createWorkloadActionsSlice(...args),
  ...createJobsSlice(...args),
  ...createNetworkingSlice(...args),
  ...createNetworkObservabilitySlice(...args),
  ...createNetworkingActionsSlice(...args),
  ...createConfigStorageSlice(...args),
  ...createAccessSlice(...args),
  ...createYamlSlice(...args),
  ...createModalsSlice(...args),
  ...createEventListenersSlice(...args),
}));
