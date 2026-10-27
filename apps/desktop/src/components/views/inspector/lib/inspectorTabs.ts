import type * as React from "react";
import {
  Bell,
  Box,
  FileCode,
  HeartPulse,
  LayoutDashboard,
  Pencil,
  Sparkles,
} from "lucide-react";
import type { PodSummary } from "@kubeview/contracts";

export type InspectorTabId =
  | "overview"
  | "edit"
  | "instances"
  | "containers"
  | "conditions"
  | "events"
  | "diagnose"
  | "yaml";

export interface InspectorTabItem {
  id: InspectorTabId;
  label: string;
  icon: React.ElementType;
  count: number | null;
}

export interface GetInspectorTabsParams {
  isConfigStorageResource: boolean;
  canEditConfigStorage: boolean;
  isAccessResource: boolean;
  isCRD: boolean;
  isWorkload: boolean;
  isNetworkingResource: boolean;
  hasWorkloadConditions: boolean;
  workloadConditionsCount: number;
  podData?: PodSummary;
  liveEventsCount: number;
}

export function getInspectorTabs({
  isConfigStorageResource,
  canEditConfigStorage,
  isAccessResource,
  isCRD,
  isWorkload,
  isNetworkingResource,
  hasWorkloadConditions,
  workloadConditionsCount,
  podData,
  liveEventsCount,
}: GetInspectorTabsParams): InspectorTabItem[] {
  const workloadInspectorTabs: InspectorTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      count: null,
    },
    ...(hasWorkloadConditions
      ? [
          {
            id: "conditions" as const,
            label: "Conditions",
            icon: HeartPulse,
            count: workloadConditionsCount,
          },
        ]
      : []),
    { id: "yaml", label: "YAML", icon: FileCode, count: null },
  ];

  if (isConfigStorageResource) {
    return [
      {
        id: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        count: null,
      },
      ...(canEditConfigStorage
        ? [
            {
              id: "edit" as const,
              label: "Edit",
              icon: Pencil,
              count: null,
            },
          ]
        : []),
      { id: "yaml", label: "YAML", icon: FileCode, count: null },
    ];
  }

  if (isAccessResource) {
    return [
      {
        id: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        count: null,
      },
      ...(isCRD
        ? [
            {
              id: "instances" as const,
              label: "Instances",
              icon: Box,
              count: null,
            },
          ]
        : []),
      { id: "yaml", label: "YAML", icon: FileCode, count: null },
    ];
  }

  if (isWorkload || isNetworkingResource) {
    return workloadInspectorTabs;
  }

  return [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      count: null,
    },
    {
      id: "diagnose",
      label: "Diagnose",
      icon: Sparkles,
      count: null,
    },
    {
      id: "containers",
      label: "Containers",
      icon: Box,
      count: podData?.containers?.length || 0,
    },
    {
      id: "conditions",
      label: "Conditions",
      icon: HeartPulse,
      count: podData?.conditions?.length || 0,
    },
    {
      id: "events",
      label: "Events",
      icon: Bell,
      count: liveEventsCount > 0 ? liveEventsCount : null,
    },
    { id: "yaml", label: "YAML", icon: FileCode, count: null },
  ];
}
