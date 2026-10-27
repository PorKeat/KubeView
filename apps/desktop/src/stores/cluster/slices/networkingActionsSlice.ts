import type { StateCreator } from "zustand";
import { toast } from "sonner";
import type {
  DiagnoseServiceResult,
  ListPortForwardsResult,
  PortForwardRequest,
  PortForwardSession,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import type { ClusterState } from "../types/cluster";
import type {
  NetworkingActionsSlice,
  ResourceEditorTarget,
  ServiceDiagnosticsTarget,
} from "../types/networking";

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
  isResourceEditorLoading: false,
  isResourceEditorSaving: false,
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
    set({
      resourceEditorTarget: target,
      resourceEditorYaml: "",
      isResourceEditorLoading: true,
      resourceEditorError: null,
    });
    try {
      const yaml =
        target.kind === "Ingress"
          ? await get().getIngressYaml(target.name, target.namespace)
          : await get().getGatewayResourceYaml(
              target.kind,
              target.name,
              target.namespace,
            );
      set({ resourceEditorYaml: yaml, isResourceEditorLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ isResourceEditorLoading: false, resourceEditorError: message });
    }
  },

  closeResourceEditor: () =>
    set({
      resourceEditorTarget: null,
      resourceEditorYaml: "",
      resourceEditorError: null,
      isResourceEditorSaving: false,
    }),

  setResourceEditorYaml: (yaml) => set({ resourceEditorYaml: yaml }),

  applyResourceEditor: async () => {
    const target = get().resourceEditorTarget;
    if (!target) return;
    set({ isResourceEditorSaving: true, resourceEditorError: null });
    try {
      if (target.kind === "Ingress") {
        await invokeRpc("ingresses.apply", {
          contextName: get().currentContext,
          namespace: target.namespace,
          yaml: get().resourceEditorYaml,
        });
        await get().loadIngresses(get().currentNamespace);
      } else {
        await invokeRpc("gatewayresources.apply", {
          contextName: get().currentContext,
          namespace: target.namespace,
          yaml: get().resourceEditorYaml,
        });
        await get().loadGatewayResources(get().currentNamespace);
      }
      await get().loadNetworkingCounts();
      toast.success(`${target.kind} ${target.name} applied`);
      get().closeResourceEditor();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ isResourceEditorSaving: false, resourceEditorError: message });
      toast.error(`Failed to apply ${target.kind}: ${message}`);
    }
  },

  openDeleteResource: (target) => set({ deleteResourceTarget: target }),
  closeDeleteResource: () => set({ deleteResourceTarget: null }),

  confirmDeleteResource: async () => {
    const target = get().deleteResourceTarget;
    if (!target) return;
    try {
      if (target.kind === "Ingress") {
        await invokeRpc("ingresses.delete", {
          contextName: get().currentContext,
          namespace: target.namespace,
          name: target.name,
        });
        await get().loadIngresses(get().currentNamespace);
      } else {
        await invokeRpc("gatewayresources.delete", {
          contextName: get().currentContext,
          namespace: target.namespace,
          kind: target.kind,
          name: target.name,
        });
        await get().loadGatewayResources(get().currentNamespace);
      }
      await get().loadNetworkingCounts();
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
