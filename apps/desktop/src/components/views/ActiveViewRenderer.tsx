"use client";

import * as React from "react";
import { useTabStore } from "@/stores/tabStore";
import { ClusterOverviewView } from "./ClusterOverviewView";
import { ResourceListView } from "./ResourceListView";

export function ActiveViewRenderer() {
  const { activeTabId, openTabs } = useTabStore();
  const activeTab = openTabs.find((t) => t.id === activeTabId);

  if (activeTabId === "overview") {
    return <ClusterOverviewView />;
  }

  return <ResourceListView resourceType={activeTab ? activeTab.title : activeTabId} />;
}
