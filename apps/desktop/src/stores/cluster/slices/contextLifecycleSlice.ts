import type { StateCreator } from "zustand";
import { toast } from "sonner";
import type {
  DetectSystemConfigsResult,
  ImportDetectedContextItem,
  ImportKubeconfigParams,
  ImportKubeconfigResult,
  SwitchContextResult,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { clearAllContextsReset, switchContextReset } from "../resets";
import { beginContextSwitch, isContextSwitchStale } from "../shared";
import type { ClusterState } from "../types/cluster";
import type { ContextLifecycleSlice } from "../types/contextLifecycle";

export const createContextLifecycleSlice: StateCreator<
  ClusterState,
  [],
  [],
  ContextLifecycleSlice
> = (set, get) => ({
  switchContext: async (contextName: string) => {
    const seq = beginContextSwitch();
    set(switchContextReset(contextName));

    try {
      const res = await invokeRpc<SwitchContextResult>(
        "clusters.switchContext",
        {
          contextName,
        },
      );

      if (isContextSwitchStale(seq) || get().currentContext !== contextName)
        return;

      if (res && res.status === "ready") {
        set((state) => ({
          availableContexts: state.availableContexts.map((c) => ({
            ...c,
            status: c.name === contextName ? "checking" : c.status,
          })),
        }));

        await get().diagnoseContext(contextName);
        if (isContextSwitchStale(seq) || get().currentContext !== contextName)
          return;
        await Promise.all([
          get().loadNamespaces(contextName),
          get().loadClusterOverview(contextName),
          get().loadPods(get().currentNamespace, contextName),
          get().loadNetworkingCounts(get().currentNamespace, contextName),
        ]);
      }
    } catch (err) {
      if (isContextSwitchStale(seq)) return;
      console.error(
        `[ClusterStore] Failed to switch to context '${contextName}':`,
        err,
      );
      set({ connectionStatus: "offline" });
    }
  },
  importKubeconfig: async (params: ImportKubeconfigParams) => {
    set({ isLoading: true });
    try {
      const res = await invokeRpc<ImportKubeconfigResult>(
        "clusters.importKubeconfig",
        params,
      );
      if (res && res.success) {
        await get().loadContexts();
        if (res.activeContext) {
          await get().switchContext(res.activeContext);
        }
        set({ isKubeconfigModalOpen: false, isLoading: false });
        return res;
      }
      set({ isLoading: false });
      throw new Error("Kubeconfig import returned unconfirmed status");
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  detectSystemConfigs: async () => {
    set({ isDetectingConfigs: true });
    try {
      const res = await invokeRpc<DetectSystemConfigsResult>(
        "clusters.detectSystemConfigs",
      );
      const list = res?.contexts || [];
      set({ detectedSystemConfigs: list, isDetectingConfigs: false });
      return list;
    } catch (err) {
      console.warn("[ClusterStore] Failed to detect system kubeconfigs:", err);
      set({ detectedSystemConfigs: [], isDetectingConfigs: false });
      return [];
    }
  },
  importDetectedContexts: async (contexts: ImportDetectedContextItem[]) => {
    set({ isLoading: true });
    try {
      const res = await invokeRpc<ImportKubeconfigResult>(
        "clusters.importDetected",
        { contexts },
      );
      if (res && res.success) {
        await get().loadContexts();
        await get().detectSystemConfigs();
        if (res.activeContext) {
          await get().switchContext(res.activeContext);
        }
        set({ isKubeconfigModalOpen: false, isLoading: false });
        return res;
      }
      set({ isLoading: false });
      throw new Error("Import failed to confirm context registration");
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  deleteContext: async (contextName: string) => {
    try {
      await invokeRpc("clusters.deleteContext", { contextName });
      await get().loadContexts();
    } catch (err) {
      console.error("Failed to delete context:", err);
      toast.error(
        `Failed to delete context: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
  updateEndpoint: async (
    contextName: string,
    newServer: string,
    insecure?: boolean,
  ) => {
    try {
      await invokeRpc("clusters.updateEndpoint", {
        contextName,
        newServer,
        insecure,
      });
      toast.success(`Updated endpoint for '${contextName}' to ${newServer}`);
      await get().loadContexts();
      if (get().currentContext === contextName) {
        await get().diagnoseContext();
      }
    } catch (err: unknown) {
      console.error("Failed to update endpoint:", err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to update endpoint: ${message}`);
      throw err;
    }
  },
  clearAllContexts: async () => {
    try {
      await invokeRpc("clusters.clearAll");
      set(clearAllContextsReset());
    } catch (err) {
      console.error("Failed to clear contexts:", err);
      toast.error(
        `Failed to clear contexts: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
});
