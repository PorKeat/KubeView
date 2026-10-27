"use client";

import * as React from "react";
import type {
  DeploymentSummary,
  ReplicaSetSummary,
  StatefulSetSummary,
} from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";
import { WorkloadHealthCard } from "./WorkloadHealthCard";
import { WorkloadMetadataCard } from "./WorkloadMetadataCard";

export interface InspectorWorkloadOverviewProps {
  currentResource: SelectedResource;
  deployment?: DeploymentSummary;
  replicaSet?: ReplicaSetSummary;
  statefulSet?: StatefulSetSummary;
  onViewPods: () => void;
  onScale: () => void;
  onRestart?: () => void;
  onDelete: () => void;
}

export function InspectorWorkloadOverview({
  currentResource,
  deployment,
  replicaSet,
  statefulSet,
  onViewPods,
  onScale,
  onRestart,
  onDelete,
}: InspectorWorkloadOverviewProps) {
  const data = deployment ?? replicaSet ?? statefulSet;
  if (!data) return null;

  return (
    <div className="space-y-4 text-xs">
      <WorkloadHealthCard
        deployment={deployment}
        replicaSet={replicaSet}
        statefulSet={statefulSet}
        onViewPods={onViewPods}
        onScale={onScale}
        onRestart={onRestart}
        onDelete={onDelete}
      />

      <WorkloadMetadataCard
        currentResource={currentResource}
        deployment={deployment}
        replicaSet={replicaSet}
        statefulSet={statefulSet}
      />
    </div>
  );
}
