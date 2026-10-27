import type { StateCreator } from "zustand";
import type { PodEventsResult, PodYamlResult } from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import type { ClusterState } from "../types/cluster";
import type { YamlSlice } from "../types/yaml";

export const createYamlSlice: StateCreator<ClusterState, [], [], YamlSlice> = (
  _set,
  get,
) => ({
  getPodYaml: async (
    podName: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("pods.yaml", {
      contextName: targetCtx,
      namespace,
      podName,
    });
    return res?.yaml || "";
  },

  getDeploymentYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("deployments.yaml", {
      contextName: targetCtx,
      namespace,
      deploymentName: name,
    });
    return res?.yaml || "";
  },

  getReplicaSetYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("replicasets.yaml", {
      contextName: targetCtx,
      namespace,
      replicaSetName: name,
    });
    return res?.yaml || "";
  },

  getStatefulSetYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("statefulsets.yaml", {
      contextName: targetCtx,
      namespace,
      statefulSetName: name,
    });
    return res?.yaml || "";
  },

  getDaemonSetYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("daemonsets.yaml", {
      contextName: targetCtx,
      namespace,
      daemonSetName: name,
    });
    return res?.yaml || "";
  },

  getJobYaml: async (name: string, namespace: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("jobs.yaml", {
      contextName: targetCtx,
      namespace,
      jobName: name,
    });
    return res?.yaml || "";
  },

  getCronJobYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("cronjobs.yaml", {
      contextName: targetCtx,
      namespace,
      cronJobName: name,
    });
    return res?.yaml || "";
  },

  getServiceYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("services.yaml", {
      contextName: targetCtx,
      namespace,
      serviceName: name,
    });
    return res?.yaml || "";
  },

  getEndpointsYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("endpoints.yaml", {
      contextName: targetCtx,
      namespace,
      endpointsName: name,
    });
    return res?.yaml || "";
  },

  getIngressYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("ingresses.yaml", {
      contextName: targetCtx,
      namespace,
      ingressName: name,
    });
    return res?.yaml || "";
  },

  getGatewayResourceYaml: async (
    kind: string,
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("gatewayresources.yaml", {
      contextName: targetCtx,
      namespace,
      kind,
      name,
    });
    return res?.yaml || "";
  },

  getNetworkPolicyYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("networkpolicies.yaml", {
      contextName: targetCtx,
      namespace,
      networkPolicyName: name,
    });
    return res?.yaml || "";
  },

  getConfigMapYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("configmaps.yaml", {
      contextName: targetCtx,
      namespace,
      name,
    });
    return res?.yaml || "";
  },

  getSecretYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("secrets.yaml", {
      contextName: targetCtx,
      namespace,
      name,
    });
    return res?.yaml || "";
  },

  getPersistentVolumeYaml: async (name: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("persistentvolumes.yaml", {
      contextName: targetCtx,
      name,
    });
    return res?.yaml || "";
  },

  getStorageClassYaml: async (name: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("storageclasses.yaml", {
      contextName: targetCtx,
      name,
    });
    return res?.yaml || "";
  },

  getServiceAccountYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const res = await invokeRpc<PodYamlResult>("serviceaccounts.yaml", {
      contextName: contextName || get().currentContext,
      namespace,
      name,
    });
    return res?.yaml || "";
  },

  getRBACResourceYaml: async (
    kind: string,
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const res = await invokeRpc<PodYamlResult>("rbac.yaml", {
      contextName: contextName || get().currentContext,
      namespace,
      kind,
      name,
    });
    return res?.yaml || "";
  },

  getCRDYaml: async (name: string, contextName?: string) => {
    const res = await invokeRpc<PodYamlResult>("crds.yaml", {
      contextName: contextName || get().currentContext,
      name,
    });
    return res?.yaml || "";
  },

  getPodEvents: async (
    podName: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodEventsResult>("pods.events", {
      contextName: targetCtx,
      namespace,
      podName,
    });
    return res?.events || [];
  },
});
