import type { StateCreator } from "zustand";
import { toast } from "sonner";
import type {
  DiagnoseServiceResult,
  ListPortForwardsResult,
  PortForwardRequest,
  PortForwardSession,
  ResourceApplyResult,
  ResourceCapabilities,
  ResourceDeleteResult,
  ResourceGetResult,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { initialResourceManifest } from "@/lib/resourceKinds";
import type { ClusterState } from "../types/cluster";
import type {
  NetworkingActionsSlice,
  ResourceEditorTarget,
  ServiceDiagnosticsTarget,
} from "../types/networking";

async function reloadResourceKind(
  get: () => ClusterState,
  kind: string,
): Promise<void> {
  const state = get();
  const namespace = state.currentNamespace;
  switch (kind) {
    case "Ingress":
      await state.loadIngresses(namespace);
      break;
    case "GatewayClass":
    case "Gateway":
    case "HTTPRoute":
    case "GRPCRoute":
      await state.loadGatewayResources(namespace);
      break;
    case "Service":
      await state.loadServices(namespace);
      break;
    case "Endpoints":
      await state.loadEndpoints(namespace);
      break;
    case "NetworkPolicy":
      await state.loadNetworkPolicies(namespace);
      break;
    case "ConfigMap":
      await state.loadConfigMaps(namespace);
      break;
    case "Secret":
      await state.loadSecrets(namespace);
      break;
    case "PersistentVolume":
      await state.loadPersistentVolumes();
      break;
    case "StorageClass":
      await state.loadStorageClasses();
      break;
    case "ServiceAccount":
      await state.loadServiceAccounts(namespace);
      break;
    case "Role":
    case "ClusterRole":
    case "RoleBinding":
    case "ClusterRoleBinding":
      await state.loadRBACResources(namespace);
      break;
    case "CustomResourceDefinition":
      await state.loadCRDs();
      break;
  }
  if (
    [
      "Ingress",
      "GatewayClass",
      "Gateway",
      "HTTPRoute",
      "GRPCRoute",
      "Service",
      "Endpoints",
      "NetworkPolicy",
    ].includes(kind)
  ) {
    await state.loadNetworkingCounts();
  }
}

export const createNetworkingActionsSlice: StateCreator<
  ClusterState,
  [],
  [],
  NetworkingActionsSlice
> = (set, get) => ({
  portForwards: [],
  isPortForwardsLoading: false,
  portForwardsError: null,
  resourceEditorTarget: null,
  resourceEditorYaml: "",
  resourceEditorCapabilities: null,
  resourceEditorCapabilityWarning: null,
  isResourceEditorLoading: false,
  isResourceEditorSaving: false,
  isResourceEditorValidating: false,
  resourceEditorValidationSuccess: false,
  resourceEditorError: null,
  deleteResourceTarget: null,
  diagnosticsTarget: null,
  diagnosticsResult: null,
  isDiagnosticsLoading: false,
  diagnosticsError: null,
  loadPortForwards: async () => {
    set({ isPortForwardsLoading: true });
    try {
      const res = await invokeRpc<ListPortForwardsResult>("portforwards.list");
      set({
        portForwards: res?.items ?? [],
        isPortForwardsLoading: false,
        portForwardsError: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ isPortForwardsLoading: false, portForwardsError: message });
    }
  },

  startPortForward: async (request: PortForwardRequest) => {
    set({ portForwardsError: null });
    try {
      const session = await invokeRpc<PortForwardSession>(
        "portforwards.start",
        {
          ...request,
          contextName: request.contextName || get().currentContext,
        },
      );
      await get().loadPortForwards();
      await get().loadNetworkingCounts();
      toast.success(
        `Forwarding ${session.address}:${session.localPort} to ${session.targetPod}:${session.remotePort}`,
      );
      return session;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ portForwardsError: message });
      toast.error(`Failed to start port forward: ${message}`);
      return null;
    }
  },

  stopPortForward: async (id: string) => {
    try {
      await invokeRpc("portforwards.stop", { id });
      await get().loadPortForwards();
      await get().loadNetworkingCounts();
      toast.success("Port forward stopped");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ portForwardsError: message });
      toast.error(`Failed to stop port forward: ${message}`);
    }
  },
  openResourceEditor: async (target: ResourceEditorTarget) => {
    const isCreate = target.mode === "create";
    set({
      resourceEditorTarget: target,
      resourceEditorYaml: isCreate ? initialResourceManifest(target) : "",
      resourceEditorCapabilities: null,
      resourceEditorCapabilityWarning: null,
      isResourceEditorLoading: true,
      isResourceEditorSaving: false,
      isResourceEditorValidating: false,
      resourceEditorValidationSuccess: false,
      resourceEditorError: null,
    });

    let capabilityWarning: string | null = null;
    const capabilityPromise = invokeRpc<ResourceCapabilities>(
      "resources.capabilities",
      {
        contextName: get().currentContext,
        apiVersion: target.apiVersion,
        kind: target.kind,
        resource: target.resource,
        name: target.name || undefined,
        namespace: target.namespace || undefined,
      },
    ).catch((error) => {
      capabilityWarning =
        error instanceof Error ? error.message : String(error);
      return null;
    });

    try {
      const yamlPromise = isCreate
        ? Promise.resolve(initialResourceManifest(target))
        : invokeRpc<ResourceGetResult>("resources.get", {
            contextName: get().currentContext,
            apiVersion: target.apiVersion,
            kind: target.kind,
            resource: target.resource,
            name: target.name,
            namespace: target.namespace || undefined,
          }).then((result) => result.yaml);
      const [yaml, capabilities] = await Promise.all([
        yamlPromise,
        capabilityPromise,
      ]);
      set({
        resourceEditorYaml: yaml,
        resourceEditorCapabilities: capabilities,
        resourceEditorCapabilityWarning: capabilityWarning,
        isResourceEditorLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({
        isResourceEditorLoading: false,
        resourceEditorError: message,
        resourceEditorCapabilityWarning: capabilityWarning,
      });
    }
  },

  closeResourceEditor: () =>
    set({
      resourceEditorTarget: null,
      resourceEditorYaml: "",
      resourceEditorCapabilities: null,
      resourceEditorCapabilityWarning: null,
      resourceEditorError: null,
      isResourceEditorSaving: false,
      isResourceEditorValidating: false,
      resourceEditorValidationSuccess: false,
    }),

  setResourceEditorYaml: (yaml) =>
    set({
      resourceEditorYaml: yaml,
      resourceEditorValidationSuccess: false,
    }),

  validateResourceEditor: async () => {
    const target = get().resourceEditorTarget;
    if (!target) return;
    set({ isResourceEditorValidating: true, resourceEditorError: null });
    try {
      await invokeRpc<ResourceApplyResult>("resources.apply", {
        contextName: get().currentContext,
        yaml: get().resourceEditorYaml,
        resource: target.resource,
        dryRun: true,
        name: target.mode === "create" ? undefined : target.name,
        namespace:
          target.mode === "create" ? undefined : target.namespace || undefined,
      });
      set({
        isResourceEditorValidating: false,
        resourceEditorValidationSuccess: true,
      });
      toast.success("Manifest is valid");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({
        isResourceEditorValidating: false,
        resourceEditorValidationSuccess: false,
        resourceEditorError: message,
      });
      toast.error(`Validation failed: ${message}`);
    }
  },

  applyResourceEditor: async () => {
    const target = get().resourceEditorTarget;
    if (!target) return;
    const capabilities = get().resourceEditorCapabilities;
    const canWrite =
      target.mode === "create" ? capabilities?.create : capabilities?.update;
    if (capabilities && canWrite === false) {
      set({
        resourceEditorError:
          capabilities.reasons?.[
            target.mode === "create" ? "create" : "update"
          ] || "Your identity is not allowed to apply this resource.",
      });
      return;
    }
    set({ isResourceEditorSaving: true, resourceEditorError: null });
    try {
      const result = await invokeRpc<ResourceApplyResult>("resources.apply", {
        contextName: get().currentContext,
        yaml: get().resourceEditorYaml,
        resource: target.resource,
        dryRun: false,
        name: target.mode === "create" ? undefined : target.name,
        namespace:
          target.mode === "create" ? undefined : target.namespace || undefined,
      });
      await reloadResourceKind(get, target.kind);
      toast.success(
        `${result.kind} ${result.name} ${result.created ? "created" : "updated"}`,
      );
      get().closeResourceEditor();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ isResourceEditorSaving: false, resourceEditorError: message });
      toast.error(`Failed to apply ${target.kind}: ${message}`);
    }
  },

  openDeleteResource: (target) => set({ deleteResourceTarget: target }),
  closeDeleteResource: () => set({ deleteResourceTarget: null }),
  refreshResourceKind: async (kind) => {
    await reloadResourceKind(get, kind);
  },

  confirmDeleteResource: async () => {
    const target = get().deleteResourceTarget;
    if (!target) return;
    try {
      await invokeRpc<ResourceDeleteResult>("resources.delete", {
        contextName: get().currentContext,
        apiVersion: target.apiVersion,
        kind: target.kind,
        resource: target.resource,
        name: target.name,
        namespace: target.namespace || undefined,
      });
      await reloadResourceKind(get, target.kind);
      toast.success(`${target.kind} ${target.name} deleted`);
      set({ deleteResourceTarget: null });
      get().closeInspector();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to delete ${target.kind}: ${message}`);
      throw err;
    }
  },
  openServiceDiagnostics: (target) => {
    set({
      diagnosticsTarget: target,
      diagnosticsResult: null,
      diagnosticsError: null,
    });
    void get().runServiceDiagnostics(target);
  },

  closeServiceDiagnostics: () =>
    set({
      diagnosticsTarget: null,
      diagnosticsResult: null,
      diagnosticsError: null,
      isDiagnosticsLoading: false,
    }),

  runServiceDiagnostics: async (target?: ServiceDiagnosticsTarget) => {
    const resolved = target ?? get().diagnosticsTarget;
    if (!resolved) return;
    set({
      diagnosticsTarget: resolved,
      isDiagnosticsLoading: true,
      diagnosticsError: null,
    });
    try {
      const result = await invokeRpc<DiagnoseServiceResult>(
        "networking.diagnoseService",
        {
          contextName: get().currentContext,
          namespace: resolved.namespace,
          serviceName: resolved.serviceName,
          probePort: resolved.probePort,
        },
      );
      set({ diagnosticsResult: result, isDiagnosticsLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ isDiagnosticsLoading: false, diagnosticsError: message });
    }
  },
});
