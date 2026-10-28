import type { StateCreator } from "zustand";
import type {
  ListEndpointsResult,
  ListGatewayResourcesResult,
  ListIngressesResult,
  ListNetworkPoliciesResult,
  ListServicesResult,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { inFlightResourcePromises, resolveQueryNamespace } from "../shared";
import type { ClusterState } from "../types/cluster";
import type { NetworkingSlice } from "../types/networking";

export const createNetworkingSlice: StateCreator<
  ClusterState,
  [],
  [],
  NetworkingSlice
> = (set, get) => ({
  services: [],
  totalServicesCount: 0,
  isServicesLoading: true,
  hasLoadedServicesOnce: false,
  endpoints: [],
  totalEndpointsCount: 0,
  isEndpointsLoading: true,
  hasLoadedEndpointsOnce: false,
  ingresses: [],
  totalIngressesCount: 0,
  isIngressesLoading: true,
  hasLoadedIngressesOnce: false,
  gatewayResources: [],
  totalGatewayResourcesCount: 0,
  isGatewayResourcesLoading: true,
  hasLoadedGatewayResourcesOnce: false,
  gatewayApiAvailable: false,
  networkPolicies: [],
  totalNetworkPoliciesCount: 0,
  isNetworkPoliciesLoading: true,
  hasLoadedNetworkPoliciesOnce: false,
  loadServices: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ services: [], totalServicesCount: 0, isServicesLoading: false });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `services::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().services.length === 0 && get().currentContext === targetCtx) {
      set({ isServicesLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListServicesResult>("services.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              services: res.items,
              totalServicesCount: res.totalCount ?? res.items.length,
              isServicesLoading: false,
              hasLoadedServicesOnce: true,
            });
          } else {
            set({
              services: [],
              totalServicesCount: 0,
              isServicesLoading: false,
              hasLoadedServicesOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load services:", err);
        if (get().currentContext === targetCtx) {
          set({ isServicesLoading: false, hasLoadedServicesOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadEndpoints: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ endpoints: [], totalEndpointsCount: 0, isEndpointsLoading: false });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `endpoints::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().endpoints.length === 0 && get().currentContext === targetCtx) {
      set({ isEndpointsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListEndpointsResult>("endpoints.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              endpoints: res.items,
              totalEndpointsCount: res.totalCount ?? res.items.length,
              isEndpointsLoading: false,
              hasLoadedEndpointsOnce: true,
            });
          } else {
            set({
              endpoints: [],
              totalEndpointsCount: 0,
              isEndpointsLoading: false,
              hasLoadedEndpointsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load endpoints:", err);
        if (get().currentContext === targetCtx) {
          set({ isEndpointsLoading: false, hasLoadedEndpointsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadIngresses: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ ingresses: [], totalIngressesCount: 0, isIngressesLoading: false });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `ingresses::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().ingresses.length === 0 && get().currentContext === targetCtx) {
      set({ isIngressesLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListIngressesResult>("ingresses.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              ingresses: res.items,
              totalIngressesCount: res.totalCount ?? res.items.length,
              isIngressesLoading: false,
              hasLoadedIngressesOnce: true,
            });
          } else {
            set({
              ingresses: [],
              totalIngressesCount: 0,
              isIngressesLoading: false,
              hasLoadedIngressesOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load ingresses:", err);
        if (get().currentContext === targetCtx) {
          set({ isIngressesLoading: false, hasLoadedIngressesOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadGatewayResources: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        gatewayResources: [],
        totalGatewayResourcesCount: 0,
        isGatewayResourcesLoading: false,
        gatewayApiAvailable: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `gatewayresources::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (
      get().gatewayResources.length === 0 &&
      get().currentContext === targetCtx
    ) {
      set({ isGatewayResourcesLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListGatewayResourcesResult>(
          "gatewayresources.list",
          {
            contextName: targetCtx,
            namespace: queryNs,
          },
        );

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              gatewayResources: res.items,
              totalGatewayResourcesCount: res.totalCount ?? res.items.length,
              gatewayApiAvailable: Boolean(res.available),
              isGatewayResourcesLoading: false,
              hasLoadedGatewayResourcesOnce: true,
            });
          } else {
            set({
              gatewayResources: [],
              totalGatewayResourcesCount: 0,
              gatewayApiAvailable: false,
              isGatewayResourcesLoading: false,
              hasLoadedGatewayResourcesOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn(
          "[ClusterStore] Failed to load Gateway API resources:",
          err,
        );
        if (get().currentContext === targetCtx) {
          set({
            isGatewayResourcesLoading: false,
            hasLoadedGatewayResourcesOnce: true,
          });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadNetworkPolicies: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        networkPolicies: [],
        totalNetworkPoliciesCount: 0,
        isNetworkPoliciesLoading: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `networkpolicies::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (
      get().networkPolicies.length === 0 &&
      get().currentContext === targetCtx
    ) {
      set({ isNetworkPoliciesLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListNetworkPoliciesResult>(
          "networkpolicies.list",
          {
            contextName: targetCtx,
            namespace: queryNs,
          },
        );

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              networkPolicies: res.items,
              totalNetworkPoliciesCount: res.totalCount ?? res.items.length,
              isNetworkPoliciesLoading: false,
              hasLoadedNetworkPoliciesOnce: true,
            });
          } else {
            set({
              networkPolicies: [],
              totalNetworkPoliciesCount: 0,
              isNetworkPoliciesLoading: false,
              hasLoadedNetworkPoliciesOnce: true,
              portForwards: [],
              isPortForwardsLoading: false,
              portForwardsError: null,
              ciliumResources: null,
              isCiliumLoading: false,
              hasLoadedCiliumOnce: true,
              hubbleFlows: [],
              isHubbleFlowsLoading: false,
              hubbleFlowsError: null,
              networkingCounts: null,
              isNetworkingCountsLoading: false,
              hasLoadedNetworkingCountsOnce: false,
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
              networkObservability: null,
              isNetworkObservabilityLoading: false,
              hasLoadedNetworkObservabilityOnce: false,
              networkObservabilityError: null,
              resourceEditorTarget: null,
              resourceEditorYaml: "",
              resourceEditorCapabilities: null,
              resourceEditorCapabilityWarning: null,
              isResourceEditorLoading: false,
              isResourceEditorValidating: false,
              resourceEditorValidationSuccess: false,
              isResourceEditorSaving: false,
              resourceEditorError: null,
              deleteResourceTarget: null,
              diagnosticsTarget: null,
              diagnosticsResult: null,
              isDiagnosticsLoading: false,
              diagnosticsError: null,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load network policies:", err);
        if (get().currentContext === targetCtx) {
          set({
            isNetworkPoliciesLoading: false,
            hasLoadedNetworkPoliciesOnce: true,
          });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },
});
