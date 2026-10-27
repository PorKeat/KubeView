"use client";

import * as React from "react";
import type { PodSummary } from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";
import {
  getPodIssue,
  getPodPendingInfo,
} from "@/components/views/resources/lib/podIssues";
import { PodDiagnostics } from "./PodDiagnostics";
import { PodResourceMetadataCard } from "./PodResourceMetadataCard";
import { PodLabelsCard } from "./PodLabelsCard";
import { PodAnnotationsCard } from "./PodAnnotationsCard";
import { PodQuickCommandsCard } from "./PodQuickCommandsCard";

export interface InspectorPodOverviewProps {
  currentResource: SelectedResource;
  podData: PodSummary | undefined;
  nodePodCIDR?: string;
  onOpenLogsModal?: (pod: {
    name: string;
    namespace: string;
    container?: string;
  }) => void;
  onOpenExecModal?: (pod: {
    name: string;
    namespace: string;
    container?: string;
  }) => void;
}

export function InspectorPodOverview({
  currentResource,
  podData,
  nodePodCIDR,
  onOpenLogsModal,
}: InspectorPodOverviewProps) {
  // Automatic developer diagnostics for failing or pending workloads
  const issueInfo = React.useMemo(
    () => (podData ? getPodIssue(podData) : null),
    [podData],
  );
  const pendingInfo = React.useMemo(
    () => (!issueInfo && podData ? getPodPendingInfo(podData) : null),
    [issueInfo, podData],
  );

  return (
    <div className="space-y-4 text-xs">
      <PodDiagnostics
        currentResource={currentResource}
        issueInfo={issueInfo}
        pendingInfo={pendingInfo}
        onOpenLogsModal={onOpenLogsModal}
      />

      <PodResourceMetadataCard podData={podData} nodePodCIDR={nodePodCIDR} />

      <PodLabelsCard labels={podData?.labels || {}} />

      <PodAnnotationsCard annotations={podData?.annotations || {}} />

      <PodQuickCommandsCard currentResource={currentResource} />
    </div>
  );
}
