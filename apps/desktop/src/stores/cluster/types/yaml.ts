import type { PodEventItem } from "@kubeview/contracts";

export interface YamlSlice {
  getPodYaml: (
    podName: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getDeploymentYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getReplicaSetYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getStatefulSetYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getDaemonSetYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getJobYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getCronJobYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getServiceYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getEndpointsYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getIngressYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getGatewayResourceYaml: (
    kind: string,
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getNetworkPolicyYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getConfigMapYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getSecretYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getPersistentVolumeYaml: (
    name: string,
    contextName?: string,
  ) => Promise<string>;
  getStorageClassYaml: (name: string, contextName?: string) => Promise<string>;
  getServiceAccountYaml: (
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getRBACResourceYaml: (
    kind: string,
    name: string,
    namespace: string,
    contextName?: string,
  ) => Promise<string>;
  getCRDYaml: (name: string, contextName?: string) => Promise<string>;
  getPodEvents: (
    podName: string,
    namespace: string,
    contextName?: string,
  ) => Promise<PodEventItem[]>;
}
