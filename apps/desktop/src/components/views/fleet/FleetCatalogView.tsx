"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { ClusterCatalogView } from "./ClusterCatalogView";
import { FleetOverviewView } from "./FleetOverviewView";
import { KubeconfigsCatalogView } from "./KubeconfigsCatalogView";
import { WebLinksCatalogView } from "./WebLinksCatalogView";

export function FleetCatalogView() {
  const section = useLayoutStore((state) => state.fleetCatalogSection);

  if (section === "health") {
    return <FleetOverviewView />;
  }

  if (section === "kubeconfigs") {
    return <KubeconfigsCatalogView />;
  }

  if (section === "links") {
    return <WebLinksCatalogView />;
  }

  return <ClusterCatalogView />;
}
