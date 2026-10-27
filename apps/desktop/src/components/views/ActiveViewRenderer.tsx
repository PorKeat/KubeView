"use client";

import * as React from "react";
import { useTabStore } from "@/stores/tabStore";
import { ClusterOverviewView } from "./ClusterOverviewView";
import { FleetOverviewView } from "./fleet/FleetOverviewView";
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
import { NetworkObservabilityView } from "./networking/NetworkObservabilityView";
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
import { SettingsView } from "./settings/SettingsView";
import { ErrorBoundary, NotFoundState } from "@/components/ui";

export function ActiveViewRenderer() {
  const { activeTabId, openTabs } = useTabStore();
  const activeTab = openTabs.find((t) => t.id === activeTabId);

  return (
    <ErrorBoundary>
      {(() => {
        if (activeTabId === "overview") {
          return <ClusterOverviewView />;
        }

        if (activeTabId === "fleet") {
          return <FleetOverviewView />;
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
