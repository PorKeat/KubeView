"use client";

import * as React from "react";
import { useTabStore } from "@/stores/tabStore";
import { ClusterOverviewView } from "./ClusterOverviewView";
import { ResourceListView } from "./ResourceListView";
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
