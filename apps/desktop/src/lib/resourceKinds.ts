import type { ResourceEditorTarget } from "@/stores/cluster/types/networking";

export interface ResourceKindInfo {
  apiVersion: string;
  kind: string;
  resource: string;
  namespaced: boolean;
}

const RESOURCE_KINDS: Record<string, ResourceKindInfo> = {
  Pod: { apiVersion: "v1", kind: "Pod", resource: "pods", namespaced: true },
  Deployment: {
    apiVersion: "apps/v1",
    kind: "Deployment",
    resource: "deployments",
    namespaced: true,
  },
  ReplicaSet: {
    apiVersion: "apps/v1",
    kind: "ReplicaSet",
    resource: "replicasets",
    namespaced: true,
  },
  StatefulSet: {
    apiVersion: "apps/v1",
    kind: "StatefulSet",
    resource: "statefulsets",
    namespaced: true,
  },
  DaemonSet: {
    apiVersion: "apps/v1",
    kind: "DaemonSet",
    resource: "daemonsets",
    namespaced: true,
  },
  Job: {
    apiVersion: "batch/v1",
    kind: "Job",
    resource: "jobs",
    namespaced: true,
  },
  CronJob: {
    apiVersion: "batch/v1",
    kind: "CronJob",
    resource: "cronjobs",
    namespaced: true,
  },
  Service: {
    apiVersion: "v1",
    kind: "Service",
    resource: "services",
    namespaced: true,
  },
  Endpoints: {
    apiVersion: "v1",
    kind: "Endpoints",
    resource: "endpoints",
    namespaced: true,
  },
  Ingress: {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    resource: "ingresses",
    namespaced: true,
  },
  NetworkPolicy: {
    apiVersion: "networking.k8s.io/v1",
    kind: "NetworkPolicy",
    resource: "networkpolicies",
    namespaced: true,
  },
  ConfigMap: {
    apiVersion: "v1",
    kind: "ConfigMap",
    resource: "configmaps",
    namespaced: true,
  },
  Secret: {
    apiVersion: "v1",
    kind: "Secret",
    resource: "secrets",
    namespaced: true,
  },
  PersistentVolume: {
    apiVersion: "v1",
    kind: "PersistentVolume",
    resource: "persistentvolumes",
    namespaced: false,
  },
  StorageClass: {
    apiVersion: "storage.k8s.io/v1",
    kind: "StorageClass",
    resource: "storageclasses",
    namespaced: false,
  },
  ServiceAccount: {
    apiVersion: "v1",
    kind: "ServiceAccount",
    resource: "serviceaccounts",
    namespaced: true,
  },
  Role: {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "Role",
    resource: "roles",
    namespaced: true,
  },
  ClusterRole: {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "ClusterRole",
    resource: "clusterroles",
    namespaced: false,
  },
  RoleBinding: {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "RoleBinding",
    resource: "rolebindings",
    namespaced: true,
  },
  ClusterRoleBinding: {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "ClusterRoleBinding",
    resource: "clusterrolebindings",
    namespaced: false,
  },
  CustomResourceDefinition: {
    apiVersion: "apiextensions.k8s.io/v1",
    kind: "CustomResourceDefinition",
    resource: "customresourcedefinitions",
    namespaced: false,
  },
  GatewayClass: {
    apiVersion: "gateway.networking.k8s.io/v1",
    kind: "GatewayClass",
    resource: "gatewayclasses",
    namespaced: false,
  },
  Gateway: {
    apiVersion: "gateway.networking.k8s.io/v1",
    kind: "Gateway",
    resource: "gateways",
    namespaced: true,
  },
  HTTPRoute: {
    apiVersion: "gateway.networking.k8s.io/v1",
    kind: "HTTPRoute",
    resource: "httproutes",
    namespaced: true,
  },
  GRPCRoute: {
    apiVersion: "gateway.networking.k8s.io/v1",
    kind: "GRPCRoute",
    resource: "grpcroutes",
    namespaced: true,
  },
};

export function getResourceKindInfo(
  kind: string,
): ResourceKindInfo | undefined {
  return RESOURCE_KINDS[kind];
}

export function resolveTargetNamespace(
  info: ResourceKindInfo,
  namespace?: string,
): string {
  if (!info.namespaced) return "";
  return namespace && namespace !== "all" ? namespace : "default";
}

export function resourceTarget(
  kind: string,
  name: string,
  namespace?: string,
): ResourceEditorTarget | null {
  const info = getResourceKindInfo(kind);
  if (!info) return null;
  return {
    apiVersion: info.apiVersion,
    kind: info.kind,
    resource: info.resource,
    name,
    namespace: resolveTargetNamespace(info, namespace),
    mode: "edit",
  };
}

export function createResourceTarget(
  kind: string,
  namespace?: string,
): ResourceEditorTarget | null {
  const info = getResourceKindInfo(kind);
  if (!info) return null;
  return {
    apiVersion: info.apiVersion,
    kind: info.kind,
    resource: info.resource,
    name: "",
    namespace: resolveTargetNamespace(info, namespace),
    mode: "create",
  };
}

export function initialResourceManifest(target: ResourceEditorTarget): string {
  const lines = [
    `apiVersion: ${target.apiVersion}`,
    `kind: ${target.kind}`,
    "metadata:",
    `  name: ${target.name || `new-${target.kind.toLowerCase()}`}`,
  ];
  if (target.namespace) {
    lines.push(`  namespace: ${target.namespace}`);
  }
  return `${lines.join("\n")}\n`;
}
