import type { StateCreator } from "zustand";
import type {
  CronJobActionParams,
  CronJobTriggerResult,
  JobActionParams,
  ListCronJobsResult,
  ListJobsResult,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { inFlightResourcePromises, resolveQueryNamespace } from "../shared";
import type { ClusterState } from "../types/cluster";
import type { JobsSlice } from "../types/jobs";

export const createJobsSlice: StateCreator<ClusterState, [], [], JobsSlice> = (
  set,
  get,
) => ({
  jobs: [],
  totalJobsCount: 0,
  isJobsLoading: true,
  hasLoadedJobsOnce: false,
  jobOwnerFilter: null,
  jobsViewMode: "jobs",
  cronJobs: [],
  totalCronJobsCount: 0,
  isCronJobsLoading: true,
  hasLoadedCronJobsOnce: false,
  setJobOwnerFilter: (owner) => set({ jobOwnerFilter: owner }),
  setJobsViewMode: (mode) => set({ jobsViewMode: mode }),
  loadJobs: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ jobs: [], totalJobsCount: 0, isJobsLoading: false });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `jobs::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().jobs.length === 0 && get().currentContext === targetCtx) {
      set({ isJobsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListJobsResult>("jobs.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              jobs: res.items,
              totalJobsCount: res.totalCount ?? res.items.length,
              isJobsLoading: false,
              hasLoadedJobsOnce: true,
            });
          } else {
            set({
              jobs: [],
              totalJobsCount: 0,
              isJobsLoading: false,
              hasLoadedJobsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load jobs:", err);
        if (get().currentContext === targetCtx) {
          set({ isJobsLoading: false, hasLoadedJobsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },
  loadCronJobs: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ cronJobs: [], totalCronJobsCount: 0, isCronJobsLoading: false });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `cronjobs::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().cronJobs.length === 0 && get().currentContext === targetCtx) {
      set({ isCronJobsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListCronJobsResult>("cronjobs.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              cronJobs: res.items,
              totalCronJobsCount: res.totalCount ?? res.items.length,
              isCronJobsLoading: false,
              hasLoadedCronJobsOnce: true,
            });
          } else {
            set({
              cronJobs: [],
              totalCronJobsCount: 0,
              isCronJobsLoading: false,
              hasLoadedCronJobsOnce: true,
              services: [],
              totalServicesCount: 0,
              isServicesLoading: false,
              hasLoadedServicesOnce: true,
              endpoints: [],
              totalEndpointsCount: 0,
              isEndpointsLoading: false,
              hasLoadedEndpointsOnce: true,
              ingresses: [],
              totalIngressesCount: 0,
              isIngressesLoading: false,
              hasLoadedIngressesOnce: true,
              gatewayResources: [],
              totalGatewayResourcesCount: 0,
              isGatewayResourcesLoading: false,
              hasLoadedGatewayResourcesOnce: true,
              gatewayApiAvailable: false,
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
        console.warn("[ClusterStore] Failed to load cronjobs:", err);
        if (get().currentContext === targetCtx) {
          set({ isCronJobsLoading: false, hasLoadedCronJobsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },
  deleteJob: async (params: JobActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("jobs.delete", { ...params, contextName: targetCtx });
    await get().loadJobs();
    await get().loadPods();
    await get().loadClusterOverview();
  },

  deleteCronJob: async (params: CronJobActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("cronjobs.delete", { ...params, contextName: targetCtx });
    await get().loadCronJobs();
    await get().loadJobs();
    await get().loadPods();
    await get().loadClusterOverview();
  },

  suspendCronJob: async (params: CronJobActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("cronjobs.suspend", { ...params, contextName: targetCtx });
    await get().loadCronJobs();
  },

  resumeCronJob: async (params: CronJobActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("cronjobs.resume", { ...params, contextName: targetCtx });
    await get().loadCronJobs();
  },

  triggerCronJob: async (params: CronJobActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    const res = await invokeRpc<CronJobTriggerResult>("cronjobs.trigger", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadJobs();
    await get().loadCronJobs();
    await get().loadPods();
    await get().loadClusterOverview();
    return res?.jobName || "";
  },
});
