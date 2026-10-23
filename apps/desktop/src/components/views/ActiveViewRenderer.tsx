"use client";

import * as React from "react";
import { useTabStore } from "@/stores/tabStore";
import { ClusterOverviewView } from "./ClusterOverviewView";
import { ResourceListView } from "./ResourceListView";
import { DeploymentListView } from "./deployments/DeploymentListView";
import { ReplicaSetListView } from "./replicasets/ReplicaSetListView";
import { StatefulSetListView } from "./statefulsets/StatefulSetListView";
import { DaemonSetListView } from "./daemonsets/DaemonSetListView";
import { JobsCronJobsListView } from "./jobs/JobsCronJobsListView";
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

        return <ResourceListView resourceType={activeTab ? activeTab.title : activeTabId} />;
      })()}
    </ErrorBoundary>
  );
}
