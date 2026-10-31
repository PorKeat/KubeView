"use client";

import {
  Server,
  Box,
  Layers,
  Repeat,
  Database,
  Cpu,
  Clock,
  FileCode,
  FolderLock,
  HardDrive,
  Network,
  Radio,
  Globe,
  Shield,
  Waypoints,
  Users,
  Boxes,
} from "lucide-react";
import type { SelectedResource } from "@/stores/clusterStore";

export function InspectorHeaderIcon({
  currentResource,
  isNode,
  isDeployment = false,
  isReplicaSet = false,
  isStatefulSet = false,
  isDaemonSet = false,
  isJob = false,
  isCronJob = false,
  isNetworkingResource = false,
  isConfigStorageResource = false,
  isAccessResource = false,
}: {
  currentResource: SelectedResource;
  isNode: boolean;
  isDeployment?: boolean;
  isReplicaSet?: boolean;
  isStatefulSet?: boolean;
  isDaemonSet?: boolean;
  isJob?: boolean;
  isCronJob?: boolean;
  isNetworkingResource?: boolean;
  isConfigStorageResource?: boolean;
  isAccessResource?: boolean;
}) {
  const NetworkingIcon =
    currentResource.kind === "Service"
      ? Network
      : currentResource.kind === "Endpoints"
        ? Radio
        : currentResource.kind === "Ingress"
          ? Globe
          : currentResource.kind === "NetworkPolicy"
            ? Shield
            : Waypoints;

  const Icon = isAccessResource
    ? currentResource.kind === "ServiceAccount"
      ? Users
      : currentResource.kind === "CustomResourceDefinition"
        ? Boxes
        : Shield
    : isConfigStorageResource
      ? currentResource.kind === "ConfigMap"
        ? FileCode
        : currentResource.kind === "Secret"
          ? FolderLock
          : currentResource.kind === "PersistentVolume"
            ? HardDrive
            : Database
      : isNetworkingResource
        ? NetworkingIcon
        : isNode
          ? Server
          : isDeployment
            ? Layers
            : isReplicaSet
              ? Repeat
              : isStatefulSet
                ? Database
                : isDaemonSet
                  ? Cpu
                  : isJob || isCronJob
                    ? Clock
                    : Box;

  return (
    <Icon
      className="h-5 w-5 shrink-0 text-[var(--accent)]"
      aria-hidden="true"
    />
  );
}
