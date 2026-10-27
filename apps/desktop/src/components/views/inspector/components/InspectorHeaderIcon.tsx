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

  return (
    <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] shrink-0">
      {isAccessResource ? (
        currentResource.kind === "ServiceAccount" ? (
          <Users className="w-5 h-5 text-[var(--accent)]" />
        ) : currentResource.kind === "CustomResourceDefinition" ? (
          <Boxes className="w-5 h-5 text-[var(--accent)]" />
        ) : (
          <Shield className="w-5 h-5 text-[var(--accent)]" />
        )
      ) : isConfigStorageResource ? (
        currentResource.kind === "ConfigMap" ? (
          <FileCode className="w-5 h-5 text-[var(--accent)]" />
        ) : currentResource.kind === "Secret" ? (
          <FolderLock className="w-5 h-5 text-[var(--accent)]" />
        ) : currentResource.kind === "PersistentVolume" ? (
          <HardDrive className="w-5 h-5 text-[var(--accent)]" />
        ) : (
          <Database className="w-5 h-5 text-[var(--accent)]" />
        )
      ) : isNetworkingResource ? (
        <NetworkingIcon className="w-5 h-5 text-[var(--accent)]" />
      ) : isNode ? (
        <Server className="w-5 h-5 text-[var(--accent)]" />
      ) : isDeployment ? (
        <Layers className="w-5 h-5 text-[var(--accent)]" />
      ) : isReplicaSet ? (
        <Repeat className="w-5 h-5 text-[var(--accent)]" />
      ) : isStatefulSet ? (
        <Database className="w-5 h-5 text-[var(--accent)]" />
      ) : isDaemonSet ? (
        <Cpu className="w-5 h-5 text-[var(--accent)]" />
      ) : isJob || isCronJob ? (
        <Clock className="w-5 h-5 text-[var(--accent)]" />
      ) : (
        <Box className="w-5 h-5 text-[var(--accent)]" />
      )}
    </div>
  );
}
