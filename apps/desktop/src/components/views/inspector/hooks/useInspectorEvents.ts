"use client";

import * as React from "react";
import { useClusterStore, type SelectedResource } from "@/stores/clusterStore";
import type { PodEventItem } from "@kubeview/contracts";
import type { InspectorTabId } from "../lib/inspectorTabs";

export interface UseInspectorEventsOptions {
  isInspectorOpen: boolean;
  activeTab: InspectorTabId;
  currentResource: SelectedResource | null;
  isNode: boolean;
  isWorkload: boolean;
  isNetworkingResource: boolean;
  isConfigStorageResource: boolean;
  isAccessResource: boolean;
}

export function useInspectorEvents({
  isInspectorOpen,
  activeTab,
  currentResource,
  isNode,
  isWorkload,
  isNetworkingResource,
  isConfigStorageResource,
  isAccessResource,
}: UseInspectorEventsOptions) {
  const { getPodEvents } = useClusterStore();
  const [liveEvents, setLiveEvents] = React.useState<PodEventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = React.useState(false);

  // Load real Events when events tab is active (Pods only)
  React.useEffect(() => {
    if (
      isInspectorOpen &&
      currentResource &&
      activeTab === "events" &&
      !isNode &&
      !isWorkload &&
      !isNetworkingResource &&
      !isConfigStorageResource &&
      !isAccessResource
    ) {
      setIsLoadingEvents(true);
      getPodEvents(currentResource.name, currentResource.namespace)
        .then((evList) => {
          setLiveEvents(evList || []);
        })
        .catch(() => {
          setLiveEvents([]);
        })
        .finally(() => setIsLoadingEvents(false));
    }
    // Resource identity fields are the intended triggers: the SelectedResource
    // object identity can change on store refreshes and must not refetch events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isInspectorOpen,
    currentResource?.name,
    currentResource?.namespace,
    activeTab,
    getPodEvents,
    isNode,
    isWorkload,
    isNetworkingResource,
    isConfigStorageResource,
    isAccessResource,
  ]);

  return { liveEvents, isLoadingEvents };
}
