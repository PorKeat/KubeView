"use client";

import type { PodSummary } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";

export interface PodStatusBeaconProps {
  pod: PodSummary;
}

export function PodStatusBeacon({ pod }: PodStatusBeaconProps) {
  const [readyCount, totalCount] = pod.ready
    ? pod.ready.split("/").map(Number)
    : [1, 1];

  // If Running but 0 of 1 (or 0 of N) containers ready, pod is completely unready / failing
  if (pod.status === "Running" && totalCount > 0 && readyCount === 0) {
    return (
      <StatusBeacon
        variant="critical"
        label={`Unready (${pod.ready})`}
        size="xs"
        pulse={true}
      />
    );
  }

  // If Running but partially ready (e.g. 1/2)
  if (pod.status === "Running" && totalCount > 0 && readyCount < totalCount) {
    return (
      <StatusBeacon
        variant="warning"
        label={`Degraded (${pod.ready})`}
        size="xs"
        pulse={false}
      />
    );
  }

  switch (pod.status) {
    case "Running":
      return (
        <StatusBeacon
          variant="healthy"
          label={pod.status}
          size="xs"
          pulse={false}
        />
      );
    case "Pending":
    case "ContainerCreating":
    case "PodInitializing":
      return (
        <StatusBeacon
          variant="pending"
          label={pod.status}
          size="xs"
          pulse={true}
        />
      );
    case "Completed":
    case "Succeeded":
      return (
        <StatusBeacon
          variant="muted"
          label={pod.status}
          size="xs"
          pulse={false}
        />
      );
    case "Terminating":
      return (
        <StatusBeacon
          variant="warning"
          label={pod.status}
          size="xs"
          pulse={true}
        />
      );
    default:
      return (
        <StatusBeacon
          variant="critical"
          label={pod.status}
          size="xs"
          pulse={true}
        />
      );
  }
}
