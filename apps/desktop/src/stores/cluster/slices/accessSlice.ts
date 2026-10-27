import type { StateCreator } from "zustand";
import type {
  ListCRDsResult,
  ListRBACResourcesResult,
  ListServiceAccountsResult,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import {
  dedupeResourceFetch,
  inFlightResourcePromises,
  resolveQueryNamespace,
} from "../shared";
import type { ClusterState } from "../types/cluster";
import type { AccessSlice } from "../types/access";

export const createAccessSlice: StateCreator<
  ClusterState,
  [],
  [],
  AccessSlice
> = (set, get) => ({
  serviceAccounts: [],
  totalServiceAccountsCount: 0,
  isServiceAccountsLoading: false,
  hasLoadedServiceAccountsOnce: false,
  rbacResources: [],
  totalRBACResourcesCount: 0,
  isRBACResourcesLoading: false,
  hasLoadedRBACResourcesOnce: false,
  crds: [],
  totalCRDsCount: 0,
  isCRDsLoading: false,
  hasLoadedCRDsOnce: false,
  loadServiceAccounts: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        serviceAccounts: [],
        totalServiceAccountsCount: 0,
        isServiceAccountsLoading: false,
      });
      return;
    }
    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `serviceaccounts::${targetCtx}::${queryNs}`;
    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }
    set({ isServiceAccountsLoading: true });
    return dedupeResourceFetch(fetchKey, async () => {
      try {
        const res = await invokeRpc<ListServiceAccountsResult>(
          "serviceaccounts.list",
          {
            contextName: targetCtx,
            namespace: queryNs,
          },
        );
        if (get().currentContext === targetCtx) {
          set({
            serviceAccounts: res?.items ?? [],
            totalServiceAccountsCount:
              res?.totalCount ?? res?.items?.length ?? 0,
            isServiceAccountsLoading: false,
            hasLoadedServiceAccountsOnce: true,
          });
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load ServiceAccounts:", err);
        if (get().currentContext === targetCtx) {
          set({
            serviceAccounts: [],
            totalServiceAccountsCount: 0,
            isServiceAccountsLoading: false,
            hasLoadedServiceAccountsOnce: true,
          });
        }
      }
    });
  },

  loadRBACResources: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        rbacResources: [],
        totalRBACResourcesCount: 0,
        isRBACResourcesLoading: false,
      });
      return;
    }
    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `rbac::${targetCtx}::${queryNs}`;
    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }
    set({ isRBACResourcesLoading: true });
    return dedupeResourceFetch(fetchKey, async () => {
      try {
        const res = await invokeRpc<ListRBACResourcesResult>("rbac.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });
        if (get().currentContext === targetCtx) {
          set({
            rbacResources: res?.items ?? [],
            totalRBACResourcesCount: res?.totalCount ?? res?.items?.length ?? 0,
            isRBACResourcesLoading: false,
            hasLoadedRBACResourcesOnce: true,
          });
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load RBAC resources:", err);
        if (get().currentContext === targetCtx) {
          set({
            rbacResources: [],
            totalRBACResourcesCount: 0,
            isRBACResourcesLoading: false,
            hasLoadedRBACResourcesOnce: true,
          });
        }
      }
    });
  },

  loadCRDs: async (contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ crds: [], totalCRDsCount: 0, isCRDsLoading: false });
      return;
    }
    const fetchKey = `crds::${targetCtx}`;
    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }
    set({ isCRDsLoading: true });
    return dedupeResourceFetch(fetchKey, async () => {
      try {
        const res = await invokeRpc<ListCRDsResult>("crds.list", {
          contextName: targetCtx,
        });
        if (get().currentContext === targetCtx) {
          set({
            crds: res?.items ?? [],
            totalCRDsCount: res?.totalCount ?? res?.items?.length ?? 0,
            isCRDsLoading: false,
            hasLoadedCRDsOnce: true,
          });
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load CRDs:", err);
        if (get().currentContext === targetCtx) {
          set({
            crds: [],
            totalCRDsCount: 0,
            isCRDsLoading: false,
            hasLoadedCRDsOnce: true,
          });
        }
      }
    });
  },
});
