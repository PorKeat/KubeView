"use client";

import * as React from "react";
import { useClusterStore, type SelectedResource } from "@/stores/clusterStore";
import type {
  PodSummary,
  NodeSummary,
  DeploymentSummary,
  ReplicaSetSummary,
  StatefulSetSummary,
  DaemonSetSummary,
  JobSummary,
  CronJobSummary,
  ServiceSummary,
  EndpointsSummary,
  IngressSummary,
  GatewayResourceSummary,
  NetworkPolicySummary,
  ConfigMapSummary,
  SecretSummary,
} from "@kubeview/contracts";
import type { ConfigStorageData } from "../tabs/InspectorConfigStorageOverview";
import type { AccessResourceData } from "../tabs/InspectorAccessOverview";
import type { WorkloadConditionLike } from "../tabs/InspectorWorkloadConditionsTab";

export function useInspectorResourceState(isInspectorOpen: boolean) {
  const { selectedResource, pods, clusterOverview, loadPods } =
    useClusterStore();
  const [cachedResource, setCachedResource] =
    React.useState<SelectedResource | null>(selectedResource);

  React.useEffect(() => {
    if (selectedResource) {
      setCachedResource(selectedResource);
    }
  }, [selectedResource]);

  const currentResource = selectedResource || cachedResource;

  // Distinguish between Pod, Deployment, ReplicaSet, and Node resources
  const isNode = currentResource?.kind === "Node";
  const isDeployment = currentResource?.kind === "Deployment";
  const isReplicaSet = currentResource?.kind === "ReplicaSet";
  const isStatefulSet = currentResource?.kind === "StatefulSet";
  const isDaemonSet = currentResource?.kind === "DaemonSet";
  const isJob = currentResource?.kind === "Job";
  const isCronJob = currentResource?.kind === "CronJob";
  const isConfigMap = currentResource?.kind === "ConfigMap";
  const isSecret = currentResource?.kind === "Secret";
  const isPersistentVolume = currentResource?.kind === "PersistentVolume";
  const isStorageClass = currentResource?.kind === "StorageClass";
  const isConfigStorageResource =
    isConfigMap || isSecret || isPersistentVolume || isStorageClass;
  const canEditConfigStorage = isConfigMap || isSecret;
  const isServiceAccount = currentResource?.kind === "ServiceAccount";
  const isRBACResource =
    currentResource?.kind === "Role" ||
    currentResource?.kind === "ClusterRole" ||
    currentResource?.kind === "RoleBinding" ||
    currentResource?.kind === "ClusterRoleBinding";
  const isCRD = currentResource?.kind === "CustomResourceDefinition";
  const isAccessResource = isServiceAccount || isRBACResource || isCRD;
  const isWorkload =
    isDeployment ||
    isReplicaSet ||
    isStatefulSet ||
    isDaemonSet ||
    isJob ||
    isCronJob;
  const isNetworkingResource =
    currentResource?.kind === "Service" ||
    currentResource?.kind === "Endpoints" ||
    currentResource?.kind === "Ingress" ||
    currentResource?.kind === "GatewayClass" ||
    currentResource?.kind === "Gateway" ||
    currentResource?.kind === "HTTPRoute" ||
    currentResource?.kind === "GRPCRoute" ||
    currentResource?.kind === "NetworkPolicy";
  const podData =
    !isNode &&
    !isWorkload &&
    !isNetworkingResource &&
    !isConfigStorageResource &&
    !isAccessResource
      ? (currentResource?.data as unknown as PodSummary | undefined)
      : undefined;
  const networkingData = isNetworkingResource
    ? (currentResource?.data as unknown as
        | ServiceSummary
        | EndpointsSummary
        | IngressSummary
        | GatewayResourceSummary
        | NetworkPolicySummary
        | undefined)
    : undefined;
  const configStorageData = isConfigStorageResource
    ? (currentResource?.data as unknown as ConfigStorageData | undefined)
    : undefined;
  const editableConfigStorageData =
    isConfigMap || isSecret
      ? (configStorageData as ConfigMapSummary | SecretSummary | undefined)
      : undefined;
  const accessData = isAccessResource
    ? (currentResource?.data as unknown as AccessResourceData | undefined)
    : undefined;
  const nodeData = isNode
    ? (currentResource?.data as unknown as NodeSummary | undefined)
    : undefined;
  const podNodeCIDR = podData?.nodeName
    ? clusterOverview?.nodes?.find((node) => node.name === podData.nodeName)
        ?.podCIDR
    : undefined;
  const deploymentData = isDeployment
    ? (currentResource?.data as unknown as DeploymentSummary | undefined)
    : undefined;
  const replicaSetData = isReplicaSet
    ? (currentResource?.data as unknown as ReplicaSetSummary | undefined)
    : undefined;
  const statefulSetData = isStatefulSet
    ? (currentResource?.data as unknown as StatefulSetSummary | undefined)
    : undefined;
  const daemonSetData = isDaemonSet
    ? (currentResource?.data as unknown as DaemonSetSummary | undefined)
    : undefined;
  const jobData = isJob
    ? (currentResource?.data as unknown as JobSummary | undefined)
    : undefined;
  const cronJobData = isCronJob
    ? (currentResource?.data as unknown as CronJobSummary | undefined)
    : undefined;
  const workloadConditions: WorkloadConditionLike[] =
    deploymentData?.conditions ??
    replicaSetData?.conditions ??
    statefulSetData?.conditions ??
    daemonSetData?.conditions ??
    jobData?.conditions ??
    [];

  // Filter pods running on the currently inspected node
  const nodePods = React.useMemo(() => {
    if (!isNode || !nodeData?.name) return [];
    const targetNode = nodeData.name.toLowerCase();
    return pods.filter(
      (p) => p.nodeName && p.nodeName.toLowerCase() === targetNode,
    );
  }, [isNode, nodeData?.name, pods]);

  // If inspecting a node and pods list is empty, fetch cluster-wide pods
  React.useEffect(() => {
    if (isInspectorOpen && isNode && pods.length === 0) {
      loadPods("all");
    }
  }, [isInspectorOpen, isNode, pods.length, loadPods]);

  return {
    currentResource,
    isNode,
    isDeployment,
    isReplicaSet,
    isStatefulSet,
    isDaemonSet,
    isJob,
    isCronJob,
    isConfigMap,
    isSecret,
    isPersistentVolume,
    isStorageClass,
    isConfigStorageResource,
    canEditConfigStorage,
    isServiceAccount,
    isRBACResource,
    isCRD,
    isAccessResource,
    isWorkload,
    isNetworkingResource,
    podData,
    networkingData,
    configStorageData,
    editableConfigStorageData,
    accessData,
    nodeData,
    podNodeCIDR,
    deploymentData,
    replicaSetData,
    statefulSetData,
    daemonSetData,
    jobData,
    cronJobData,
    workloadConditions,
    nodePods,
    pods,
  };
}
