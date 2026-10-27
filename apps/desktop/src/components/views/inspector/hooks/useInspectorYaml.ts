"use client";

import * as React from "react";
import { toast } from "sonner";
import { useClusterStore, type SelectedResource } from "@/stores/clusterStore";
import type { PodSummary } from "@kubeview/contracts";
import { synthesizePodYaml } from "../lib/synthesizePodYaml";
import type { InspectorTabId } from "../lib/inspectorTabs";

export interface UseInspectorYamlOptions {
  isInspectorOpen: boolean;
  activeTab: InspectorTabId;
  currentResource: SelectedResource | null;
  isNode: boolean;
  isDeployment: boolean;
  isReplicaSet: boolean;
  isStatefulSet: boolean;
  isDaemonSet: boolean;
  isJob: boolean;
  isCronJob: boolean;
  isNetworkingResource: boolean;
  isAccessResource: boolean;
  isServiceAccount: boolean;
  isRBACResource: boolean;
  isConfigStorageResource: boolean;
  podData?: PodSummary;
  pods: PodSummary[];
}

export function useInspectorYaml({
  isInspectorOpen,
  activeTab,
  currentResource,
  isNode,
  isDeployment,
  isReplicaSet,
  isStatefulSet,
  isDaemonSet,
  isJob,
  isCronJob,
  isNetworkingResource,
  isAccessResource,
  isServiceAccount,
  isRBACResource,
  isConfigStorageResource,
  podData,
  pods,
}: UseInspectorYamlOptions) {
  const {
    getPodYaml,
    getDeploymentYaml,
    getReplicaSetYaml,
    getStatefulSetYaml,
    getDaemonSetYaml,
    getJobYaml,
    getCronJobYaml,
    getServiceYaml,
    getEndpointsYaml,
    getIngressYaml,
    getGatewayResourceYaml,
    getNetworkPolicyYaml,
    getConfigMapYaml,
    getSecretYaml,
    getPersistentVolumeYaml,
    getStorageClassYaml,
    getServiceAccountYaml,
    getRBACResourceYaml,
    getCRDYaml,
  } = useClusterStore();

  const [copiedYaml, setCopiedYaml] = React.useState(false);
  const [liveYaml, setLiveYaml] = React.useState<string>("");
  const [isLoadingYaml, setIsLoadingYaml] = React.useState(false);

  // Load real YAML when YAML tab is active (Pods, Deployments, ReplicaSets)
  const handleReloadYaml = React.useCallback(() => {
    if (!currentResource || isNode) return;
    setIsLoadingYaml(true);

    const resolvedNs =
      currentResource.namespace &&
      currentResource.namespace !== "all" &&
      currentResource.namespace !== "Cluster Scope"
        ? currentResource.namespace
        : podData?.namespace ||
          pods.find((p) => p.name === currentResource.name)?.namespace ||
          "default";

    const fetchManifest = isAccessResource
      ? isServiceAccount
        ? getServiceAccountYaml(currentResource.name, resolvedNs)
        : isRBACResource
          ? getRBACResourceYaml(
              currentResource.kind,
              currentResource.name,
              resolvedNs,
            )
          : getCRDYaml(currentResource.name)
      : isConfigStorageResource
        ? currentResource.kind === "ConfigMap"
          ? getConfigMapYaml(currentResource.name, resolvedNs)
          : currentResource.kind === "Secret"
            ? getSecretYaml(currentResource.name, resolvedNs)
            : currentResource.kind === "PersistentVolume"
              ? getPersistentVolumeYaml(currentResource.name)
              : getStorageClassYaml(currentResource.name)
        : isNetworkingResource
          ? currentResource.kind === "Service"
            ? getServiceYaml(currentResource.name, resolvedNs)
            : currentResource.kind === "Endpoints"
              ? getEndpointsYaml(currentResource.name, resolvedNs)
              : currentResource.kind === "Ingress"
                ? getIngressYaml(currentResource.name, resolvedNs)
                : currentResource.kind === "NetworkPolicy"
                  ? getNetworkPolicyYaml(currentResource.name, resolvedNs)
                  : getGatewayResourceYaml(
                      currentResource.kind,
                      currentResource.name,
                      resolvedNs,
                    )
          : isDeployment
            ? getDeploymentYaml(currentResource.name, resolvedNs)
            : isReplicaSet
              ? getReplicaSetYaml(currentResource.name, resolvedNs)
              : isStatefulSet
                ? getStatefulSetYaml(currentResource.name, resolvedNs)
                : isDaemonSet
                  ? getDaemonSetYaml(currentResource.name, resolvedNs)
                  : isJob
                    ? getJobYaml(currentResource.name, resolvedNs)
                    : isCronJob
                      ? getCronJobYaml(currentResource.name, resolvedNs)
                      : getPodYaml(currentResource.name, resolvedNs);

    fetchManifest
      .then((yamlStr) => {
        if (yamlStr && yamlStr.trim()) {
          setLiveYaml(yamlStr);
        } else if (podData) {
          setLiveYaml(synthesizePodYaml(podData));
        } else {
          setLiveYaml(
            "# No YAML returned from cluster.\n# Click 'Refresh' to try again.",
          );
        }
      })
      .catch((err) => {
        if (podData) {
          setLiveYaml(
            `# Notice: Live cluster YAML fetch unavailable (${err?.message || err})\n# Displaying cached resource definition:\n\n` +
              synthesizePodYaml(podData),
          );
        } else {
          setLiveYaml(
            `# Error loading manifest: ${err?.message || err}\n# Click 'Refresh' above to try fetching again.`,
          );
        }
      })
      .finally(() => setIsLoadingYaml(false));
  }, [
    currentResource,
    isNode,
    isDeployment,
    isReplicaSet,
    isStatefulSet,
    isDaemonSet,
    isJob,
    isCronJob,
    podData,
    pods,
    getPodYaml,
    getDeploymentYaml,
    getReplicaSetYaml,
    getStatefulSetYaml,
    getDaemonSetYaml,
    getJobYaml,
    getCronJobYaml,
    isNetworkingResource,
    isAccessResource,
    isServiceAccount,
    isRBACResource,
    getServiceAccountYaml,
    getRBACResourceYaml,
    getCRDYaml,
    isConfigStorageResource,
    getConfigMapYaml,
    getSecretYaml,
    getPersistentVolumeYaml,
    getStorageClassYaml,
    getServiceYaml,
    getEndpointsYaml,
    getIngressYaml,
    getGatewayResourceYaml,
    getNetworkPolicyYaml,
  ]);

  React.useEffect(() => {
    if (isInspectorOpen && activeTab === "yaml" && !isNode) {
      handleReloadYaml();
    }
  }, [
    isInspectorOpen,
    currentResource?.name,
    currentResource?.namespace,
    activeTab,
    isNode,
    handleReloadYaml,
  ]);

  const copyYaml = () => {
    navigator.clipboard.writeText(liveYaml);
    setCopiedYaml(true);
    toast.success("YAML copied to clipboard");
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  const downloadYaml = () => {
    if (!currentResource) return;
    const blob = new Blob([liveYaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentResource.name}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("YAML manifest downloaded");
  };

  return {
    copiedYaml,
    liveYaml,
    isLoadingYaml,
    handleReloadYaml,
    copyYaml,
    downloadYaml,
  };
}
