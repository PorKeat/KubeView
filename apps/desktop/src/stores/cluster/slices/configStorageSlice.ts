import type { StateCreator } from "zustand";
import type {
  ListConfigMapsResult,
  ListPersistentVolumesResult,
  ListSecretsResult,
  ListStorageClassesResult,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import {
  dedupeResourceFetch,
  inFlightResourcePromises,
  resolveQueryNamespace,
} from "../shared";
import type { ClusterState } from "../types/cluster";
import type { ConfigStorageSlice } from "../types/configStorage";

export const createConfigStorageSlice: StateCreator<
  ClusterState,
  [],
  [],
  ConfigStorageSlice
> = (set, get) => ({
  configMaps: [],
  totalConfigMapsCount: 0,
  isConfigMapsLoading: false,
  hasLoadedConfigMapsOnce: false,
  secrets: [],
  totalSecretsCount: 0,
  isSecretsLoading: false,
  hasLoadedSecretsOnce: false,
  persistentVolumes: [],
  totalPersistentVolumesCount: 0,
  isPersistentVolumesLoading: false,
  hasLoadedPersistentVolumesOnce: false,
  storageClasses: [],
  totalStorageClassesCount: 0,
  isStorageClassesLoading: false,
  hasLoadedStorageClassesOnce: false,
  loadConfigMaps: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        configMaps: [],
        totalConfigMapsCount: 0,
        isConfigMapsLoading: false,
      });
      return;
    }
    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `configmaps::${targetCtx}::${queryNs}`;
    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }
    set({ isConfigMapsLoading: true });
    return dedupeResourceFetch(fetchKey, async () => {
      try {
        const res = await invokeRpc<ListConfigMapsResult>("configmaps.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });
        if (get().currentContext === targetCtx) {
          set({
            configMaps: res?.items ?? [],
            totalConfigMapsCount: res?.totalCount ?? res?.items?.length ?? 0,
            isConfigMapsLoading: false,
            hasLoadedConfigMapsOnce: true,
          });
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load ConfigMaps:", err);
        if (get().currentContext === targetCtx) {
          set({
            configMaps: [],
            totalConfigMapsCount: 0,
            isConfigMapsLoading: false,
            hasLoadedConfigMapsOnce: true,
          });
        }
      }
    });
  },

  loadSecrets: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ secrets: [], totalSecretsCount: 0, isSecretsLoading: false });
      return;
    }
    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `secrets::${targetCtx}::${queryNs}`;
    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }
    set({ isSecretsLoading: true });
    return dedupeResourceFetch(fetchKey, async () => {
      try {
        const res = await invokeRpc<ListSecretsResult>("secrets.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });
        if (get().currentContext === targetCtx) {
          set({
            secrets: res?.items ?? [],
            totalSecretsCount: res?.totalCount ?? res?.items?.length ?? 0,
            isSecretsLoading: false,
            hasLoadedSecretsOnce: true,
          });
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load Secrets:", err);
        if (get().currentContext === targetCtx) {
          set({
            secrets: [],
            totalSecretsCount: 0,
            isSecretsLoading: false,
            hasLoadedSecretsOnce: true,
          });
        }
      }
    });
  },

  loadPersistentVolumes: async (contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        persistentVolumes: [],
        totalPersistentVolumesCount: 0,
        isPersistentVolumesLoading: false,
      });
      return;
    }
    const fetchKey = `persistentvolumes::${targetCtx}`;
    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }
    set({ isPersistentVolumesLoading: true });
    return dedupeResourceFetch(fetchKey, async () => {
      try {
        const res = await invokeRpc<ListPersistentVolumesResult>(
          "persistentvolumes.list",
          { contextName: targetCtx },
        );
        if (get().currentContext === targetCtx) {
          set({
            persistentVolumes: res?.items ?? [],
            totalPersistentVolumesCount:
              res?.totalCount ?? res?.items?.length ?? 0,
            isPersistentVolumesLoading: false,
            hasLoadedPersistentVolumesOnce: true,
          });
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load PersistentVolumes:", err);
        if (get().currentContext === targetCtx) {
          set({
            persistentVolumes: [],
            totalPersistentVolumesCount: 0,
            isPersistentVolumesLoading: false,
            hasLoadedPersistentVolumesOnce: true,
          });
        }
      }
    });
  },

  loadStorageClasses: async (contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        storageClasses: [],
        totalStorageClassesCount: 0,
        isStorageClassesLoading: false,
      });
      return;
    }
    const fetchKey = `storageclasses::${targetCtx}`;
    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }
    set({ isStorageClassesLoading: true });
    return dedupeResourceFetch(fetchKey, async () => {
      try {
        const res = await invokeRpc<ListStorageClassesResult>(
          "storageclasses.list",
          { contextName: targetCtx },
        );
        if (get().currentContext === targetCtx) {
          set({
            storageClasses: res?.items ?? [],
            totalStorageClassesCount:
              res?.totalCount ?? res?.items?.length ?? 0,
            isStorageClassesLoading: false,
            hasLoadedStorageClassesOnce: true,
          });
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load StorageClasses:", err);
        if (get().currentContext === targetCtx) {
          set({
            storageClasses: [],
            totalStorageClassesCount: 0,
            isStorageClassesLoading: false,
            hasLoadedStorageClassesOnce: true,
          });
        }
      }
    });
  },
});
