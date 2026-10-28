import type { PermissionOperation } from "@kubeview/contracts";
import { usePermissionExplainerStore } from "@/stores/permissionExplainerStore";
import { useTabStore } from "@/stores/tabStore";

export interface ForbiddenRpcDetail {
  method: string;
  params?: Record<string, unknown>;
  code?: unknown;
  message?: string;
}

interface ResourceMethodInfo {
  resource: string;
  apiGroup: string;
  namespaced: boolean;
}

const RESOURCE_METHODS: Record<string, ResourceMethodInfo> = {
  pods: { resource: "pods", apiGroup: "", namespaced: true },
  deployments: {
    resource: "deployments",
    apiGroup: "apps",
    namespaced: true,
  },
  replicasets: {
    resource: "replicasets",
    apiGroup: "apps",
    namespaced: true,
  },
  statefulsets: {
    resource: "statefulsets",
    apiGroup: "apps",
    namespaced: true,
  },
  daemonsets: {
    resource: "daemonsets",
    apiGroup: "apps",
    namespaced: true,
  },
  jobs: { resource: "jobs", apiGroup: "batch", namespaced: true },
  cronjobs: { resource: "cronjobs", apiGroup: "batch", namespaced: true },
  services: { resource: "services", apiGroup: "", namespaced: true },
  endpoints: { resource: "endpoints", apiGroup: "", namespaced: true },
  ingresses: {
    resource: "ingresses",
    apiGroup: "networking.k8s.io",
    namespaced: true,
  },
  networkpolicies: {
    resource: "networkpolicies",
    apiGroup: "networking.k8s.io",
    namespaced: true,
  },
  gatewayresources: {
    resource: "gateways",
    apiGroup: "gateway.networking.k8s.io",
    namespaced: true,
  },
  configmaps: { resource: "configmaps", apiGroup: "", namespaced: true },
  secrets: { resource: "secrets", apiGroup: "", namespaced: true },
  serviceaccounts: {
    resource: "serviceaccounts",
    apiGroup: "",
    namespaced: true,
  },
  persistentvolumes: {
    resource: "persistentvolumes",
    apiGroup: "",
    namespaced: false,
  },
  storageclasses: {
    resource: "storageclasses",
    apiGroup: "storage.k8s.io",
    namespaced: false,
  },
  crds: {
    resource: "customresourcedefinitions",
    apiGroup: "apiextensions.k8s.io",
    namespaced: false,
  },
};

const GET_METHODS = new Set([
  "yaml",
  "logs",
  "diagnose",
  "observability",
  "instances",
  "reveal",
  "editData",
  "hubbleFlows",
]);

const UPDATE_METHODS = new Set([
  "apply",
  "scale",
  "restart",
  "suspend",
  "resume",
  "trigger",
]);

function stringParam(
  params: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = params?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function genericOperation(
  method: string,
  params: Record<string, unknown> | undefined,
): PermissionOperation | null {
  const resource = stringParam(params, "resource");
  if (!resource) return null;
  const apiVersion = stringParam(params, "apiVersion") ?? "";
  const group = apiVersion.includes("/") ? apiVersion.split("/")[0] : "";
  const name = stringParam(params, "name");
  const namespace = stringParam(params, "namespace");
  const verb =
    method === "resources.get"
      ? "get"
      : method === "resources.delete"
        ? "delete"
        : method === "resources.apply"
          ? name
            ? "update"
            : "create"
          : "get";
  return {
    namespace: namespace && namespace !== "all" ? namespace : undefined,
    verb,
    apiGroup: group || undefined,
    resource,
    resourceName: name,
    clusterScoped: !namespace || namespace === "",
  };
}

export function inferPermissionOperation(
  method: string,
  params?: Record<string, unknown>,
): PermissionOperation | null {
  if (method.startsWith("resources.")) {
    return genericOperation(method, params);
  }

  const separator = method.indexOf(".");
  if (separator < 0) return null;
  const prefix = method.slice(0, separator);
  const action = method.slice(separator + 1);
  const info = RESOURCE_METHODS[prefix];
  if (!info) return null;

  const namespace = stringParam(params, "namespace");
  const name =
    stringParam(params, "name") ??
    stringParam(params, "podName") ??
    stringParam(params, "serviceName");

  let verb: string | null = null;
  if (action === "list" || action === "events") {
    verb = "list";
  } else if (action === "delete" || action === "stop") {
    verb = "delete";
  } else if (action === "exec") {
    verb = "create";
  } else if (GET_METHODS.has(action)) {
    verb = "get";
  } else if (UPDATE_METHODS.has(action)) {
    verb = "update";
  }
  if (!verb) return null;

  return {
    namespace:
      info.namespaced && namespace && namespace !== "all"
        ? namespace
        : undefined,
    verb,
    apiGroup: info.apiGroup || undefined,
    resource: info.resource,
    subresource:
      prefix === "pods" && action === "logs"
        ? "logs"
        : prefix === "pods" && action === "exec"
          ? "exec"
          : undefined,
    resourceName: name,
    clusterScoped: !info.namespaced,
  };
}

export function openPermissionExplanation(
  operation: PermissionOperation,
): void {
  usePermissionExplainerStore.getState().setPendingOperation(operation);
  useTabStore.getState().openTab({
    id: "permissions",
    title: "Permissions Checker",
    closable: true,
  });
}
