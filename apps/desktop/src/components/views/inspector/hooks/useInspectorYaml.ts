"use client";

import * as React from "react";
import { toast } from "sonner";
import type { PodSummary, YAMLWatchParams } from "@kubeview/contracts";
import { saveTextFile } from "@/lib/saveFile";
import { getResourceKindInfo } from "@/lib/resourceKinds";
import {
  getCachedYaml,
  getWatchKey,
  rememberYaml,
  subscribeYaml,
  type YamlSubscription,
} from "@/lib/yamlWatch";
import { useClusterStore, type SelectedResource } from "@/stores/clusterStore";
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
  isEditing?: boolean;
  podData?: PodSummary;
}

const RBAC_KINDS = new Set([
  "Role",
  "ClusterRole",
  "RoleBinding",
  "ClusterRoleBinding",
]);

const CONFIG_STORAGE_KINDS = new Set([
  "ConfigMap",
  "Secret",
  "PersistentVolume",
  "StorageClass",
]);

const NETWORKING_KINDS = new Set([
  "Service",
  "Endpoints",
  "Ingress",
  "NetworkPolicy",
  "GatewayClass",
  "Gateway",
  "HTTPRoute",
  "GRPCRoute",
]);

const ACCESS_KINDS = new Set([
  "ServiceAccount",
  "Role",
  "ClusterRole",
  "RoleBinding",
  "ClusterRoleBinding",
  "CustomResourceDefinition",
]);

/**
 * One-shot manifest fetch used as a fallback when live watching is not
 * available (older engine, RBAC forbids watch, mock mode). Reads actions from
 * the store imperatively so this hook does not subscribe to the whole store.
 */
function fetchManifestText(
  resource: SelectedResource,
  namespace: string,
  contextName: string,
): Promise<string> {
  const store = useClusterStore.getState();
  const kind = resource.kind;
  const name = resource.name;

  if (ACCESS_KINDS.has(kind)) {
    if (kind === "ServiceAccount") {
      return store.getServiceAccountYaml(name, namespace, contextName);
    }
    if (RBAC_KINDS.has(kind)) {
      return store.getRBACResourceYaml(kind, name, namespace, contextName);
    }
    return store.getCRDYaml(name, contextName);
  }

  if (CONFIG_STORAGE_KINDS.has(kind)) {
    if (kind === "ConfigMap") {
      return store.getConfigMapYaml(name, namespace, contextName);
    }
    if (kind === "Secret") {
      return store.getSecretYaml(name, namespace, contextName);
    }
    if (kind === "PersistentVolume") {
      return store.getPersistentVolumeYaml(name, contextName);
    }
    return store.getStorageClassYaml(name, contextName);
  }

  if (NETWORKING_KINDS.has(kind)) {
    if (kind === "Service") {
      return store.getServiceYaml(name, namespace, contextName);
    }
    if (kind === "Endpoints") {
      return store.getEndpointsYaml(name, namespace, contextName);
    }
    if (kind === "Ingress") {
      return store.getIngressYaml(name, namespace, contextName);
    }
    if (kind === "NetworkPolicy") {
      return store.getNetworkPolicyYaml(name, namespace, contextName);
    }
    return store.getGatewayResourceYaml(kind, name, namespace, contextName);
  }

  switch (kind) {
    case "Deployment":
      return store.getDeploymentYaml(name, namespace, contextName);
    case "ReplicaSet":
      return store.getReplicaSetYaml(name, namespace, contextName);
    case "StatefulSet":
      return store.getStatefulSetYaml(name, namespace, contextName);
    case "DaemonSet":
      return store.getDaemonSetYaml(name, namespace, contextName);
    case "Job":
      return store.getJobYaml(name, namespace, contextName);
    case "CronJob":
      return store.getCronJobYaml(name, namespace, contextName);
    default:
      return store.getPodYaml(name, namespace, contextName);
  }
}

export function useInspectorYaml({
  isInspectorOpen,
  activeTab,
  currentResource,
  isNode,
  isEditing = false,
  podData,
}: UseInspectorYamlOptions) {
  const [copiedYaml, setCopiedYaml] = React.useState(false);
  const [liveYaml, setLiveYaml] = React.useState<string>("");
  const [isLoadingYaml, setIsLoadingYaml] = React.useState(false);
  const [isLive, setIsLive] = React.useState(false);

  const currentContext = useClusterStore((state) => state.currentContext);
  const podNamespace = useClusterStore((state) =>
    currentResource && currentResource.kind === "Pod"
      ? state.pods.find((pod) => pod.name === currentResource.name)?.namespace
      : undefined,
  );

  const resolvedNs = React.useMemo(() => {
    const raw = currentResource?.namespace;
    if (raw && raw !== "all" && raw !== "Cluster Scope") return raw;
    return podData?.namespace || podNamespace || "default";
  }, [currentResource?.namespace, podData?.namespace, podNamespace]);

  const resourceKind = currentResource?.kind;
  const resourceName = currentResource?.name;

  const watchTarget = React.useMemo<YAMLWatchParams | null>(() => {
    if (!resourceKind || !resourceName) return null;
    const info = getResourceKindInfo(resourceKind);
    if (!info) return null;
    return {
      contextName: currentContext,
      apiVersion: info.apiVersion,
      kind: info.kind,
      resource: info.resource,
      namespace: info.namespaced ? resolvedNs : "",
      name: resourceName,
    };
  }, [currentContext, resourceKind, resourceName, resolvedNs]);

  const resourceKey = watchTarget
    ? getWatchKey(watchTarget)
    : currentResource
      ? `${currentContext}|${currentResource.kind}|${resolvedNs}|${currentResource.name}`
      : "";

  const requestSeq = React.useRef(0);
  const isEditingRef = React.useRef(isEditing);
  const resourceKeyRef = React.useRef(resourceKey);
  isEditingRef.current = isEditing;
  resourceKeyRef.current = resourceKey;

  const loadManifestRef = React.useRef<() => Promise<string>>(async () => "");
  loadManifestRef.current = async () => {
    if (!currentResource) return "";
    try {
      const yamlText = await fetchManifestText(
        currentResource,
        resolvedNs,
        currentContext,
      );
      if (yamlText && yamlText.trim()) return yamlText;
      if (podData) return synthesizePodYaml(podData);
      return "# No YAML returned from cluster.\n# Click 'Refresh' to try again.";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (podData) {
        return `# Notice: Live cluster YAML fetch unavailable (${message})\n# Displaying cached resource definition:\n\n${synthesizePodYaml(podData)}`;
      }
      return `# Error loading manifest: ${message}\n# Click 'Refresh' above to try fetching again.`;
    }
  };

  // Subscribe only while the YAML tab is visible. This replaces the previous
  // pods-driven refetch loop: changing pod lists never re-fetches a manifest.
  React.useEffect(() => {
    if (!isInspectorOpen || activeTab !== "yaml" || isNode) return;
    if (!currentResource || !resourceKey) return;

    const key = resourceKey;
    const seq = ++requestSeq.current;
    let disposed = false;
    let subscription: YamlSubscription | null = null;
    let snapshotFallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const cached = getCachedYaml(key);
    if (cached !== undefined) {
      setLiveYaml(cached);
      setIsLoadingYaml(false);
    } else {
      setLiveYaml("");
      setIsLoadingYaml(true);
    }
    setIsLive(false);

    const applyFallback = () => {
      void loadManifestRef.current().then((yamlText) => {
        if (disposed || seq !== requestSeq.current) return;
        rememberYaml(key, yamlText);
        setLiveYaml(yamlText);
        setIsLoadingYaml(false);
      });
    };

    if (watchTarget) {
      subscription = subscribeYaml(watchTarget, (event) => {
        if (disposed) return;

        if (event.event === "ERROR") {
          setIsLive(false);
          return;
        }

        if (event.event === "DELETED") {
          requestSeq.current += 1;
          setIsLive(false);
          setIsLoadingYaml(false);
          setLiveYaml("# This resource was deleted from the cluster.");
          return;
        }

        if (!event.yaml) return;

        // A live push always wins over an in-flight one-shot fetch.
        requestSeq.current += 1;
        rememberYaml(key, event.yaml);
        setIsLive(true);
        setIsLoadingYaml(false);

        // Never clobber an open editor. The cached manifest is applied when
        // editing finishes.
        if (isEditingRef.current) return;
        setLiveYaml(event.yaml);
      });

      void subscription.ready.then((available) => {
        if (disposed || seq !== requestSeq.current) return;
        if (!available) {
          setIsLive(false);
          applyFallback();
          return;
        }

        setIsLive(true);
        if (getCachedYaml(key) === undefined) {
          // The snapshot should arrive via the subscription itself. Guard
          // against a missed event so the pane never spins forever.
          snapshotFallbackTimer = setTimeout(() => {
            if (disposed || getCachedYaml(key) !== undefined) return;
            applyFallback();
          }, 1500);
        }
      });
    } else {
      applyFallback();
    }

    return () => {
      disposed = true;
      if (snapshotFallbackTimer) clearTimeout(snapshotFallbackTimer);
      subscription?.unsubscribe();
    };
  }, [
    isInspectorOpen,
    activeTab,
    isNode,
    resourceKey,
    watchTarget,
    currentResource,
  ]);

  // Apply any manifest received while the editor was open.
  React.useEffect(() => {
    if (isEditing || !resourceKey) return;
    const cached = getCachedYaml(resourceKey);
    if (cached === undefined) return;
    setLiveYaml((current) => (current === cached ? current : cached));
  }, [isEditing, resourceKey]);

  const applyFetchedYaml = React.useCallback((yamlText: string) => {
    const key = resourceKeyRef.current;
    if (key) rememberYaml(key, yamlText);
    setLiveYaml(yamlText);
    setIsLoadingYaml(false);
  }, []);

  const handleReloadYaml = React.useCallback(() => {
    const seq = ++requestSeq.current;
    setIsLoadingYaml(true);
    void loadManifestRef.current().then((yamlText) => {
      if (seq !== requestSeq.current) return;
      applyFetchedYaml(yamlText);
    });
  }, [applyFetchedYaml]);

  const copyYaml = React.useCallback(() => {
    navigator.clipboard.writeText(liveYaml);
    setCopiedYaml(true);
    toast.success("YAML copied to clipboard");
    setTimeout(() => setCopiedYaml(false), 2000);
  }, [liveYaml]);

  const downloadYaml = React.useCallback(async () => {
    if (!currentResource) return;
    const saved = await saveTextFile(liveYaml, {
      defaultPath: `${currentResource.name}.yaml`,
      mimeType: "application/yaml;charset=utf-8",
      filters: [{ name: "YAML", extensions: ["yaml", "yml"] }],
    });
    if (saved) toast.success("YAML manifest downloaded");
  }, [liveYaml, currentResource]);

  return {
    copiedYaml,
    liveYaml,
    isLoadingYaml,
    isLive,
    handleReloadYaml,
    copyYaml,
    downloadYaml,
  };
}
