"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTabStore } from "@/stores/tabStore";
import { ClusterOverviewView } from "./ClusterOverviewView";
import { SimpleResourcesView } from "./simple/SimpleResourcesView";
import { ResourceListView } from "./ResourceListView";
import { DeploymentListView } from "./deployments/DeploymentListView";
import { ReplicaSetListView } from "./replicasets/ReplicaSetListView";
import { StatefulSetListView } from "./statefulsets/StatefulSetListView";
import { DaemonSetListView } from "./daemonsets/DaemonSetListView";
import { JobsCronJobsListView } from "./jobs/JobsCronJobsListView";
import { ServicesListView } from "./networking/ServicesListView";
import { EndpointsListView } from "./networking/EndpointsListView";
import { IngressesView } from "./networking/IngressesView";
import { NetworkPoliciesListView } from "./networking/NetworkPoliciesListView";
import { PortForwardsView } from "./networking/PortForwardsView";
import {
  ConfigMapsListView,
  SecretsListView,
  PersistentVolumesView,
  StorageClassesView,
} from "./configstorage/ConfigStorageViews";
import {
  ServiceAccountsView,
  RBACView,
  CustomResourcesView,
} from "./accesscustom/AccessCustomViews";
import { PermissionsView } from "./permissions/PermissionsView";
import { ErrorBoundary, NotFoundState } from "@/components/ui";

function ViewLoading() {
  return (
    <div className="flex-1 space-y-3 p-4 sm:p-5">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-[var(--surface-active)]/70" />
      <div className="h-24 animate-pulse rounded-xl bg-[var(--surface-active)]/40" />
      <div className="h-40 animate-pulse rounded-xl bg-[var(--surface-active)]/25" />
    </div>
  );
}

const dynamicView = (loader: () => Promise<React.ComponentType>) =>
  dynamic(loader, {
    ssr: false,
    loading: ViewLoading,
  });

const TopologyView = dynamicView(() =>
  import("./topology/TopologyView").then((module) => module.TopologyView),
);
const TerminalView = dynamicView(() =>
  import("./terminal/TerminalView").then((module) => module.TerminalView),
);
const GitOpsView = dynamicView(() =>
  import("./gitops/GitOpsView").then((module) => module.GitOpsView),
);
const LearningCenterView = dynamicView(() =>
  import("./learning/LearningCenterView").then(
    (module) => module.LearningCenterView,
  ),
);
const FleetCatalogView = dynamicView(() =>
  import("./fleet/FleetCatalogView").then((module) => module.FleetCatalogView),
);
const HelmChartsView = dynamicView(() =>
  import("./helm/HelmChartsView").then((module) => module.HelmChartsView),
);
const SettingsView = dynamicView(() =>
  import("./settings/SettingsView").then((module) => module.SettingsView),
);
const NetworkObservabilityView = dynamicView(() =>
  import("./networking/NetworkObservabilityView").then(
    (module) => module.NetworkObservabilityView,
  ),
);

export function ActiveViewRenderer() {
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTabs = useTabStore((state) => state.openTabs);
  const activeTab = openTabs.find((t) => t.id === activeTabId);

  return (
    <ErrorBoundary>
      {(() => {
        if (activeTabId === "overview") {
          return <ClusterOverviewView />;
        }

        if (activeTabId === "topology") {
          return <TopologyView />;
        }

        if (activeTabId === "terminal") {
          return <TerminalView />;
        }

        if (activeTabId === "namespaces") {
          return <SimpleResourcesView kind="namespaces" />;
        }

        if (activeTabId === "events") {
          return <SimpleResourcesView kind="events" />;
        }

        if (activeTabId === "replicationcontrollers") {
          return <SimpleResourcesView kind="replicationcontrollers" />;
        }

        if (activeTabId === "endpointslices") {
          return <SimpleResourcesView kind="endpointslices" />;
        }

        if (activeTabId === "ingressclasses") {
          return <SimpleResourcesView kind="ingressclasses" />;
        }

        if (activeTabId === "persistentvolumeclaims") {
          return <SimpleResourcesView kind="persistentvolumeclaims" />;
        }

        if (activeTabId === "horizontalpodautoscalers") {
          return <SimpleResourcesView kind="horizontalpodautoscalers" />;
        }

        if (activeTabId === "verticalpodautoscalers") {
          return <SimpleResourcesView kind="verticalpodautoscalers" />;
        }

        if (activeTabId === "poddisruptionbudgets") {
          return <SimpleResourcesView kind="poddisruptionbudgets" />;
        }

        if (activeTabId === "resourcequotas") {
          return <SimpleResourcesView kind="resourcequotas" />;
        }

        if (activeTabId === "limitranges") {
          return <SimpleResourcesView kind="limitranges" />;
        }

        if (activeTabId === "priorityclasses") {
          return <SimpleResourcesView kind="priorityclasses" />;
        }

        if (activeTabId === "runtimeclasses") {
          return <SimpleResourcesView kind="runtimeclasses" />;
        }

        if (activeTabId === "leases") {
          return <SimpleResourcesView kind="leases" />;
        }

        if (activeTabId === "mutatingwebhookconfigurations") {
          return <SimpleResourcesView kind="mutatingwebhookconfigurations" />;
        }

        if (activeTabId === "validatingwebhookconfigurations") {
          return <SimpleResourcesView kind="validatingwebhookconfigurations" />;
        }

        if (activeTabId === "validatingadmissionpolicies") {
          return <SimpleResourcesView kind="validatingadmissionpolicies" />;
        }

        if (activeTabId === "validatingadmissionpolicybindings") {
          return (
            <SimpleResourcesView kind="validatingadmissionpolicybindings" />
          );
        }

        if (activeTabId === "helmreleases") {
          return <SimpleResourcesView kind="helmreleases" />;
        }

        if (activeTabId === "helmcharts") {
          return <HelmChartsView />;
        }

        if (activeTabId === "fleet") {
          return <FleetCatalogView />;
        }

        if (activeTabId === "gitops") {
          return <GitOpsView />;
        }

        if (activeTabId === "learning") {
          return <LearningCenterView />;
        }

        if (activeTabId === "deployments") {
          return <DeploymentListView />;
        }

        if (activeTabId === "replicasets") {
          return <ReplicaSetListView />;
        }

        if (activeTabId === "statefulsets") {
          return <StatefulSetListView />;
        }

        if (activeTabId === "daemonsets") {
          return <DaemonSetListView />;
        }

        if (activeTabId === "jobs") {
          return <JobsCronJobsListView />;
        }

        if (activeTabId === "services") {
          return <ServicesListView />;
        }

        if (activeTabId === "endpoints") {
          return <EndpointsListView />;
        }

        if (activeTabId === "ingresses") {
          return <IngressesView />;
        }

        if (activeTabId === "networkpolicies") {
          return <NetworkPoliciesListView />;
        }

        if (activeTabId === "portforwards") {
          return <PortForwardsView />;
        }

        if (activeTabId === "cilium") {
          return <NetworkObservabilityView />;
        }

        if (activeTabId === "configmaps") {
          return <ConfigMapsListView />;
        }

        if (activeTabId === "secrets") {
          return <SecretsListView />;
        }

        if (activeTabId === "persistentvolumes") {
          return <PersistentVolumesView />;
        }

        if (activeTabId === "storageclasses") {
          return <StorageClassesView />;
        }

        if (activeTabId === "serviceaccounts") {
          return <ServiceAccountsView />;
        }

        if (activeTabId === "rbac") {
          return <RBACView />;
        }

        if (activeTabId === "permissions") {
          return <PermissionsView />;
        }

        if (activeTabId === "crds") {
          return <CustomResourcesView />;
        }

        if (activeTabId === "settings") {
          return <SettingsView />;
        }

        if (!activeTab && activeTabId !== "overview") {
          return (
            <NotFoundState
              resourceKind="Tab View"
              resourceName={activeTabId}
              message="The requested workspace tab does not exist or has been closed."
            />
          );
        }

        return (
          <ResourceListView
            resourceType={activeTab ? activeTab.title : activeTabId}
          />
        );
      })()}
    </ErrorBoundary>
  );
}
