import type { AccessSlice } from "./access";
import type { ConfigStorageSlice } from "./configStorage";
import type { ContextLifecycleSlice } from "./contextLifecycle";
import type { ContextsSlice } from "./contexts";
import type { CoreSlice } from "./core";
import type { EventListenersSlice } from "./events";
import type { JobsSlice } from "./jobs";
import type { ModalsSlice } from "./modals";
import type {
  NetworkObservabilitySlice,
  NetworkingActionsSlice,
  NetworkingSlice,
} from "./networking";
import type { OverviewSlice } from "./overview";
import type { PodsSlice } from "./pods";
import type { WorkloadActionsSlice, WorkloadsSlice } from "./workloads";
import type { YamlSlice } from "./yaml";

/**
 * Full cluster-store contract, composed from focused domain slices.
 */
export type ClusterState = CoreSlice &
  ContextsSlice &
  ContextLifecycleSlice &
  OverviewSlice &
  PodsSlice &
  WorkloadsSlice &
  WorkloadActionsSlice &
  JobsSlice &
  NetworkingSlice &
  NetworkObservabilitySlice &
  NetworkingActionsSlice &
  ConfigStorageSlice &
  AccessSlice &
  YamlSlice &
  ModalsSlice &
  EventListenersSlice;
