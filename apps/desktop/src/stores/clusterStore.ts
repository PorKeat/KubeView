import { create } from "zustand";
import { toast } from "sonner";
import type {
  ContextSummary,
  DiagnosticResult,
  ListContextsResult,
  ListNamespacesResult,
  ProviderType,
  SwitchContextResult,
  ImportKubeconfigParams,
  ImportKubeconfigResult,
  PodSummary,
  ListPodsResult,
  DeploymentSummary,
  ListDeploymentsResult,
  ReplicaSetSummary,
  ListReplicaSetsResult,
  DeploymentActionParams,
  ReplicaSetActionParams,
  StatefulSetSummary,
  ListStatefulSetsResult,
  StatefulSetActionParams,
  DaemonSetSummary,
  ListDaemonSetsResult,
  DaemonSetActionParams,
  JobSummary,
  ListJobsResult,
  JobActionParams,
  CronJobSummary,
  ListCronJobsResult,
  CronJobActionParams,
  CronJobTriggerResult,
  PodLogsParams,
  PodLogsResult,
  DeletePodParams,
  RestartPodParams,
  ExecPodParams,
  ExecPodResult,
  PodEventItem,
  PodEventsResult,
  PodYamlResult,
  ClusterOverviewResult,
  DetectedContextInfo,
  DetectSystemConfigsResult,
  ImportDetectedContextItem,
  ImportDetectedContextsParams,
  PodChangeEvent,
} from "@kubeview/contracts";
import {
  invokeRpc,
  listenNotification,
  resetStreamCredentials,
} from "@/lib/ipc";
import type {
  ClusterState,
  ClusterContextInfo,
  SelectedResource,
} from "./clusterTypes";

export * from "./clusterTypes";

const inFlightResourcePromises = new Map<string, Promise<void>>();
const inFlightOverviewPromises = new Map<
  string,
  Promise<ClusterOverviewResult | null>
>();
let contextSwitchSeq = 0;

function resolveQueryNamespace(
  state: Pick<ClusterState, "rbacMode" | "availableContexts">,
  contextName: string,
  namespace: string,
): string {
  if (state.rbacMode !== "namespace-scoped") return "";
  if (namespace !== "all") return namespace;
  return (
    state.availableContexts.find((context) => context.name === contextName)
      ?.namespace || "default"
  );
}

export const useClusterStore = create<ClusterState>((set, get) => ({
  currentContext: "",
  availableContexts: [],
  currentNamespace: "all",
  availableNamespaces: ["all", "default"],
  connectionStatus: "checking",
  serverVersion: "Detecting...",
  latencyMs: 0,
  rbacMode: "cluster-admin",
  configPath: "",
  diagnosticResult: null,
  selectedResource: null,
  isInspectorOpen: false,
  isLoading: false,
  isKubeconfigModalOpen: false,
  kubeconfigModalTab: "browse",
  splashDismissed: false,

  clusterOverview: null,
  isOverviewLoading: false,
  pods: [],
  totalPodsCount: 0,
  isPodsLoading: true,
  hasLoadedPodsOnce: false,
  podNodeFilter: null,
  podLabelFilter: null,
  podLabelFilterSource: null,
  deployments: [],
  totalDeploymentsCount: 0,
  isDeploymentsLoading: true,
  hasLoadedDeploymentsOnce: false,
  replicaSets: [],
  totalReplicaSetsCount: 0,
  isReplicaSetsLoading: true,
  hasLoadedReplicaSetsOnce: false,
  statefulSets: [],
  totalStatefulSetsCount: 0,
  isStatefulSetsLoading: true,
  hasLoadedStatefulSetsOnce: false,
  daemonSets: [],
  totalDaemonSetsCount: 0,
  isDaemonSetsLoading: true,
  hasLoadedDaemonSetsOnce: false,
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
  setPodNodeFilter: (nodeName) => {
    set({ podNodeFilter: nodeName });
    if (get().pods.length === 0 && get().currentContext) {
      get().loadPods();
    }
  },

  setPodLabelFilter: (selector, source = null) => {
    set({ podLabelFilter: selector, podLabelFilterSource: source });
  },
  setJobOwnerFilter: (owner) => set({ jobOwnerFilter: owner }),
  setJobsViewMode: (mode) => set({ jobsViewMode: mode }),

  detectedSystemConfigs: [],
  isDetectingConfigs: false,

  logsModalPod: null,
  execModalPod: null,
  deleteConfirmPod: null,
  restartConfirmPod: null,
  bulkDeleteConfirmPods: null,
  bulkRestartConfirmPods: null,
  workloadAction: null,
  bulkWorkloadAction: null,

  autoRefreshInterval: 0,
  setAutoRefreshInterval: (interval) => set({ autoRefreshInterval: interval }),

  isEndpointModalOpen: false,
  endpointModalContextName: "",
  endpointModalCurrentServer: "",
  openEndpointModal: (contextName, currentServer) =>
    set({
      isEndpointModalOpen: true,
      endpointModalContextName: contextName,
      endpointModalCurrentServer: currentServer,
    }),
  closeEndpointModal: () =>
    set({
      isEndpointModalOpen: false,
      endpointModalContextName: "",
      endpointModalCurrentServer: "",
    }),

  openLogsModal: (pod) => set({ logsModalPod: pod }),
  closeLogsModal: () => set({ logsModalPod: null }),
  openExecModal: (pod) => set({ execModalPod: pod }),
  closeExecModal: () => set({ execModalPod: null }),
  openDeleteConfirm: (pod) => set({ deleteConfirmPod: pod }),
  closeDeleteConfirm: () => set({ deleteConfirmPod: null }),
  openRestartConfirm: (pod) => set({ restartConfirmPod: pod }),
  closeRestartConfirm: () => set({ restartConfirmPod: null }),
  openBulkDeleteConfirm: (pods) => set({ bulkDeleteConfirmPods: pods }),
  closeBulkDeleteConfirm: () => set({ bulkDeleteConfirmPods: null }),
  openBulkRestartConfirm: (pods) => set({ bulkRestartConfirmPods: pods }),
  closeBulkRestartConfirm: () => set({ bulkRestartConfirmPods: null }),

  openWorkloadAction: (action) => set({ workloadAction: action }),
  closeWorkloadAction: () => set({ workloadAction: null }),
  openBulkWorkloadAction: (action) => set({ bulkWorkloadAction: action }),
  closeBulkWorkloadAction: () => set({ bulkWorkloadAction: null }),

  executeBulkWorkloadAction: async (action) => {
    const targetCtx = get().currentContext;
    let succeeded = 0;
    let failed = 0;

    for (const target of action.targets) {
      const params = {
        name: target.name,
        namespace: target.namespace,
        contextName: targetCtx,
      };
      try {
        if (action.kind === "ReplicaSet") {
          if (action.action !== "delete") {
            throw new Error("Bulk restart is not supported for ReplicaSets");
          }
          await invokeRpc("replicasets.delete", params);
        } else if (action.kind === "StatefulSet") {
          await invokeRpc(
            action.action === "restart"
              ? "statefulsets.restart"
              : "statefulsets.delete",
            params,
          );
        } else if (action.kind === "DaemonSet") {
          await invokeRpc(
            action.action === "restart"
              ? "daemonsets.restart"
              : "daemonsets.delete",
            params,
          );
        } else if (action.kind === "Job") {
          await invokeRpc("jobs.delete", params);
        } else {
          throw new Error("Unsupported bulk action kind");
        }
        succeeded += 1;
      } catch (error) {
        failed += 1;
        console.error(
          `Bulk ${action.action} failed for ${action.kind} ${target.namespace}/${target.name}:`,
          error,
        );
      }
    }

    if (succeeded > 0) {
      if (action.kind === "ReplicaSet") {
        await get().loadReplicaSets();
      } else if (action.kind === "StatefulSet") {
        await get().loadStatefulSets();
      } else if (action.kind === "DaemonSet") {
        await get().loadDaemonSets();
      } else {
        await get().loadJobs();
      }
      await get().loadPods();
      await get().loadClusterOverview();
    }

    return { succeeded, failed };
  },

  loadContexts: async () => {
    set({ isLoading: true });
    try {
      const res = await invokeRpc<ListContextsResult>("clusters.listContexts");
      if (res && res.contexts && res.contexts.length > 0) {
        const contexts: ClusterContextInfo[] = res.contexts.map(
          (c: ContextSummary) => ({
            name: c.name,
            cluster: c.cluster,
            server: c.server,
            provider: c.provider,
            status: c.name === res.currentContext ? "checking" : "offline",
            latencyMs: 0,
            namespace: c.namespace,
            authType: c.authType,
          }),
        );

        set({
          availableContexts: contexts,
          currentContext: res.currentContext || (contexts[0]?.name ?? ""),
          configPath: res.configPath,
          isLoading: false,
        });

        const activeCtx = res.currentContext || contexts[0]?.name;
        if (activeCtx) {
          get().diagnoseContext(activeCtx);
          get().loadNamespaces(activeCtx);
          get().loadClusterOverview(activeCtx);
          get().loadPods(get().currentNamespace, activeCtx);
        }
      } else {
        set({
          availableContexts: [],
          currentContext: "",
          connectionStatus: "offline",
          serverVersion: "No cluster connected",
          latencyMs: 0,
          isLoading: false,
          clusterOverview: null,
          pods: [],
          totalPodsCount: 0,
          isPodsLoading: false,
          hasLoadedPodsOnce: true,
          podLabelFilter: null,
          podLabelFilterSource: null,
          deployments: [],
          totalDeploymentsCount: 0,
          isDeploymentsLoading: false,
          hasLoadedDeploymentsOnce: true,
          replicaSets: [],
          totalReplicaSetsCount: 0,
          isReplicaSetsLoading: false,
          hasLoadedReplicaSetsOnce: true,
          statefulSets: [],
          totalStatefulSetsCount: 0,
          isStatefulSetsLoading: false,
          hasLoadedStatefulSetsOnce: true,
          daemonSets: [],
          totalDaemonSetsCount: 0,
          isDaemonSetsLoading: false,
          hasLoadedDaemonSetsOnce: true,
          jobs: [],
          totalJobsCount: 0,
          isJobsLoading: false,
          hasLoadedJobsOnce: true,
          jobOwnerFilter: null,
          jobsViewMode: "jobs",
          cronJobs: [],
          totalCronJobsCount: 0,
          isCronJobsLoading: false,
          hasLoadedCronJobsOnce: true,
        });
      }
    } catch (err) {
      console.error("[ClusterStore] Failed to load contexts:", err);
      set({
        isLoading: false,
        connectionStatus: "offline",
        clusterOverview: null,
        pods: [],
        totalPodsCount: 0,
        isPodsLoading: false,
        hasLoadedPodsOnce: true,
        podLabelFilter: null,
        podLabelFilterSource: null,
        deployments: [],
        totalDeploymentsCount: 0,
        isDeploymentsLoading: false,
        hasLoadedDeploymentsOnce: true,
        replicaSets: [],
        totalReplicaSetsCount: 0,
        isReplicaSetsLoading: false,
        hasLoadedReplicaSetsOnce: true,
        statefulSets: [],
        totalStatefulSetsCount: 0,
        isStatefulSetsLoading: false,
        hasLoadedStatefulSetsOnce: true,
        daemonSets: [],
        totalDaemonSetsCount: 0,
        isDaemonSetsLoading: false,
        hasLoadedDaemonSetsOnce: true,
        jobs: [],
        totalJobsCount: 0,
        isJobsLoading: false,
        hasLoadedJobsOnce: true,
        jobOwnerFilter: null,
        jobsViewMode: "jobs",
        cronJobs: [],
        totalCronJobsCount: 0,
        isCronJobsLoading: false,
        hasLoadedCronJobsOnce: true,
      });
    }
  },

  switchContext: async (contextName: string) => {
    const seq = ++contextSwitchSeq;
    set({
      currentContext: contextName,
      connectionStatus: "checking",
      diagnosticResult: null,
      hasLoadedPodsOnce: false,
      isPodsLoading: true,
      pods: [],
      podNodeFilter: null,
      podLabelFilter: null,
      podLabelFilterSource: null,
      workloadAction: null,
      bulkWorkloadAction: null,
      deployments: [],
      totalDeploymentsCount: 0,
      isDeploymentsLoading: true,
      hasLoadedDeploymentsOnce: false,
      replicaSets: [],
      totalReplicaSetsCount: 0,
      isReplicaSetsLoading: true,
      hasLoadedReplicaSetsOnce: false,
      statefulSets: [],
      totalStatefulSetsCount: 0,
      isStatefulSetsLoading: true,
      hasLoadedStatefulSetsOnce: false,
      daemonSets: [],
      totalDaemonSetsCount: 0,
      isDaemonSetsLoading: true,
      hasLoadedDaemonSetsOnce: false,
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
    });

    try {
      const res = await invokeRpc<SwitchContextResult>(
        "clusters.switchContext",
        {
          contextName,
        },
      );

      if (seq !== contextSwitchSeq || get().currentContext !== contextName)
        return;

      if (res && res.status === "ready") {
        set((state) => ({
          availableContexts: state.availableContexts.map((c) => ({
            ...c,
            status: c.name === contextName ? "checking" : c.status,
          })),
        }));

        await get().diagnoseContext(contextName);
        if (seq !== contextSwitchSeq || get().currentContext !== contextName)
          return;
        await Promise.all([
          get().loadNamespaces(contextName),
          get().loadClusterOverview(contextName),
          get().loadPods(get().currentNamespace, contextName),
        ]);
      }
    } catch (err) {
      if (seq !== contextSwitchSeq) return;
      console.error(
        `[ClusterStore] Failed to switch to context '${contextName}':`,
        err,
      );
      set({ connectionStatus: "offline" });
    }
  },

  diagnoseContext: async (contextName?: string) => {
    const target = contextName || get().currentContext;
    if (!target) return null;

    if (get().currentContext === target) {
      set({ connectionStatus: "checking" });
    }

    try {
      const diag = await invokeRpc<DiagnosticResult>("clusters.diagnose", {
        contextName: target,
      });

      if (diag) {
        const newStatus =
          diag.status === "connected"
            ? "connected"
            : diag.status === "degraded"
              ? "degraded"
              : "offline";

        const isClusterAdmin =
          diag.stages?.rbac?.details?.clusterAdmin !== false;

        set((state) => {
          const isActive = state.currentContext === target;
          const apiLatency =
            diag.stages?.tls?.passed &&
            typeof diag.stages.tls.latencyMs === "number" &&
            diag.stages.tls.latencyMs > 0
              ? diag.stages.tls.latencyMs
              : diag.stages?.network?.passed &&
                  typeof diag.stages.network.latencyMs === "number" &&
                  diag.stages.network.latencyMs > 0
                ? diag.stages.network.latencyMs
                : diag.latencyMs || 0;

          return {
            availableContexts: state.availableContexts.map((c) =>
              c.name === target
                ? { ...c, status: newStatus, latencyMs: apiLatency }
                : c,
            ),
            ...(isActive
              ? {
                  diagnosticResult: diag,
                  connectionStatus: newStatus,
                  serverVersion: diag.serverVersion || "Unavailable",
                  latencyMs: apiLatency,
                  rbacMode: isClusterAdmin
                    ? "cluster-admin"
                    : "namespace-scoped",
                }
              : {}),
          };
        });

        return diag;
      }
    } catch (err) {
      console.error(`[ClusterStore] Diagnostics failed for '${target}':`, err);
      if (get().currentContext === target) {
        set({ connectionStatus: "offline" });
      }
    }

    return null;
  },

  loadNamespaces: async (contextName?: string) => {
    const target = contextName || get().currentContext;
    if (!target) return;

    try {
      const res = await invokeRpc<ListNamespacesResult>(
        "clusters.listNamespaces",
        {
          contextName: target,
        },
      );

      if (res && res.namespaces && res.namespaces.length > 0) {
        const combined = Array.from(new Set(["all", ...res.namespaces]));
        set({ availableNamespaces: combined });
      }
    } catch (err) {
      console.warn("[ClusterStore] Namespace listing skipped/failed:", err);
    }
  },

  loadClusterOverview: async (contextName?: string, namespace?: string) => {
    const target = contextName || get().currentContext;
    if (!target) {
      set({ clusterOverview: null, isOverviewLoading: false });
      return null;
    }

    const targetNs =
      namespace !== undefined ? namespace : get().currentNamespace;
    const queryNs = targetNs === "all" ? "" : targetNs;
    const fetchKey = `${target}::${queryNs}`;

    // Deduplicate concurrent in-flight requests for same context & namespace
    if (inFlightOverviewPromises.has(fetchKey)) {
      return inFlightOverviewPromises.get(fetchKey)!;
    }

    const promise = (async () => {
      if (!get().clusterOverview && get().currentContext === target) {
        set({ isOverviewLoading: true });
      }

      try {
        const res = await invokeRpc<ClusterOverviewResult>(
          "clusters.overview",
          {
            contextName: target,
            namespace: queryNs,
          },
        );

        if (res) {
          // Verify context and namespace haven't changed while request was in-flight
          if (
            get().currentContext === target &&
            (namespace === undefined || get().currentNamespace === targetNs)
          ) {
            set({
              clusterOverview: res,
              ...(get().isOverviewLoading ? { isOverviewLoading: false } : {}),
            });
          }
          return res;
        }

        if (get().currentContext === target && get().isOverviewLoading) {
          set({ isOverviewLoading: false });
        }
        return null;
      } catch (err) {
        console.warn(
          "[ClusterStore] Failed to load cluster overview (preserving existing telemetry):",
          err,
        );
        // Stale-while-revalidate: Preserve existing clusterOverview so dashboard does not flicker to empty state
        if (get().currentContext === target && get().isOverviewLoading) {
          set({ isOverviewLoading: false });
        }
        return null;
      } finally {
        inFlightOverviewPromises.delete(fetchKey);
      }
    })();

    inFlightOverviewPromises.set(fetchKey, promise);
    return promise;
  },

  loadPods: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({ pods: [], totalPodsCount: 0, isPodsLoading: false });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `pods::${targetCtx}::${queryNs}`;

    // Deduplicate in-flight requests for the same context & namespace
    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    const currentPods = get().pods;
    // Stale-While-Revalidate: Only display skeleton loader on first initial cold load for active context
    if (currentPods.length === 0 && get().currentContext === targetCtx) {
      set({ isPodsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListPodsResult>("pods.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        // Context race condition guard: Only commit pods if user is still on this context
        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              pods: res.items,
              totalPodsCount: res.totalCount ?? res.items.length,
              isPodsLoading: false,
              hasLoadedPodsOnce: true,
            });
          } else {
            set({
              pods: [],
              totalPodsCount: 0,
              isPodsLoading: false,
              hasLoadedPodsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load pods:", err);
        if (get().currentContext === targetCtx) {
          set({ isPodsLoading: false, hasLoadedPodsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadDeployments: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        deployments: [],
        totalDeploymentsCount: 0,
        isDeploymentsLoading: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `deployments::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().deployments.length === 0 && get().currentContext === targetCtx) {
      set({ isDeploymentsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListDeploymentsResult>("deployments.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              deployments: res.items,
              totalDeploymentsCount: res.totalCount ?? res.items.length,
              isDeploymentsLoading: false,
              hasLoadedDeploymentsOnce: true,
            });
          } else {
            set({
              deployments: [],
              totalDeploymentsCount: 0,
              isDeploymentsLoading: false,
              hasLoadedDeploymentsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load deployments:", err);
        if (get().currentContext === targetCtx) {
          set({ isDeploymentsLoading: false, hasLoadedDeploymentsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadReplicaSets: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        replicaSets: [],
        totalReplicaSetsCount: 0,
        isReplicaSetsLoading: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `replicasets::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().replicaSets.length === 0 && get().currentContext === targetCtx) {
      set({ isReplicaSetsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListReplicaSetsResult>("replicasets.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              replicaSets: res.items,
              totalReplicaSetsCount: res.totalCount ?? res.items.length,
              isReplicaSetsLoading: false,
              hasLoadedReplicaSetsOnce: true,
            });
          } else {
            set({
              replicaSets: [],
              totalReplicaSetsCount: 0,
              isReplicaSetsLoading: false,
              hasLoadedReplicaSetsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load replica sets:", err);
        if (get().currentContext === targetCtx) {
          set({ isReplicaSetsLoading: false, hasLoadedReplicaSetsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadStatefulSets: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        statefulSets: [],
        totalStatefulSetsCount: 0,
        isStatefulSetsLoading: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `statefulsets::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().statefulSets.length === 0 && get().currentContext === targetCtx) {
      set({ isStatefulSetsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListStatefulSetsResult>(
          "statefulsets.list",
          {
            contextName: targetCtx,
            namespace: queryNs,
          },
        );

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              statefulSets: res.items,
              totalStatefulSetsCount: res.totalCount ?? res.items.length,
              isStatefulSetsLoading: false,
              hasLoadedStatefulSetsOnce: true,
            });
          } else {
            set({
              statefulSets: [],
              totalStatefulSetsCount: 0,
              isStatefulSetsLoading: false,
              hasLoadedStatefulSetsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load stateful sets:", err);
        if (get().currentContext === targetCtx) {
          set({
            isStatefulSetsLoading: false,
            hasLoadedStatefulSetsOnce: true,
          });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

  loadDaemonSets: async (namespace?: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    if (!targetCtx) {
      set({
        daemonSets: [],
        totalDaemonSetsCount: 0,
        isDaemonSetsLoading: false,
      });
      return;
    }

    const targetNs = namespace ?? get().currentNamespace;
    const queryNs = resolveQueryNamespace(get(), targetCtx, targetNs);
    const fetchKey = `daemonsets::${targetCtx}::${queryNs}`;

    if (inFlightResourcePromises.has(fetchKey)) {
      return inFlightResourcePromises.get(fetchKey);
    }

    if (get().daemonSets.length === 0 && get().currentContext === targetCtx) {
      set({ isDaemonSetsLoading: true });
    }

    const promise = (async () => {
      try {
        const res = await invokeRpc<ListDaemonSetsResult>("daemonsets.list", {
          contextName: targetCtx,
          namespace: queryNs,
        });

        if (get().currentContext === targetCtx) {
          if (res && res.items) {
            set({
              daemonSets: res.items,
              totalDaemonSetsCount: res.totalCount ?? res.items.length,
              isDaemonSetsLoading: false,
              hasLoadedDaemonSetsOnce: true,
            });
          } else {
            set({
              daemonSets: [],
              totalDaemonSetsCount: 0,
              isDaemonSetsLoading: false,
              hasLoadedDaemonSetsOnce: true,
            });
          }
        }
      } catch (err) {
        console.warn("[ClusterStore] Failed to load daemonsets:", err);
        if (get().currentContext === targetCtx) {
          set({ isDaemonSetsLoading: false, hasLoadedDaemonSetsOnce: true });
        }
      } finally {
        inFlightResourcePromises.delete(fetchKey);
      }
    })();

    inFlightResourcePromises.set(fetchKey, promise);
    return promise;
  },

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

  getPodLogs: async (params: PodLogsParams) => {
    const targetCtx = params.contextName || get().currentContext;
    return await invokeRpc<PodLogsResult>("pods.logs", {
      ...params,
      contextName: targetCtx,
    });
  },

  deletePod: async (params: DeletePodParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("pods.delete", {
      ...params,
      contextName: targetCtx,
    });
    // Refresh live pods list and overview telemetry
    await get().loadPods();
    await get().loadClusterOverview();
  },

  restartPod: async (params: RestartPodParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("pods.restart", {
      ...params,
      contextName: targetCtx,
    });
    // Refresh live pods list and overview telemetry
    await get().loadPods();
    await get().loadClusterOverview();
  },

  restartDeployment: async (params: DeploymentActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("deployments.restart", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadDeployments();
    await get().loadReplicaSets();
    await get().loadClusterOverview();
  },

  scaleDeployment: async (params: DeploymentActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("deployments.scale", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadDeployments();
    await get().loadClusterOverview();
  },

  deleteDeployment: async (params: DeploymentActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("deployments.delete", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadDeployments();
    await get().loadReplicaSets();
    await get().loadClusterOverview();
  },

  scaleReplicaSet: async (params: ReplicaSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("replicasets.scale", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadReplicaSets();
    await get().loadClusterOverview();
  },

  deleteReplicaSet: async (params: ReplicaSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("replicasets.delete", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadReplicaSets();
    await get().loadClusterOverview();
  },

  restartStatefulSet: async (params: StatefulSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("statefulsets.restart", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadStatefulSets();
    await get().loadPods();
    await get().loadClusterOverview();
  },

  scaleStatefulSet: async (params: StatefulSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("statefulsets.scale", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadStatefulSets();
    await get().loadPods();
    await get().loadClusterOverview();
  },

  deleteStatefulSet: async (params: StatefulSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("statefulsets.delete", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadStatefulSets();
    await get().loadPods();
    await get().loadClusterOverview();
  },

  restartDaemonSet: async (params: DaemonSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("daemonsets.restart", {
      ...params,
      contextName: targetCtx,
    });
    await get().loadDaemonSets();
    await get().loadPods();
    await get().loadClusterOverview();
  },

  deleteDaemonSet: async (params: DaemonSetActionParams) => {
    const targetCtx = params.contextName || get().currentContext;
    await invokeRpc("daemonsets.delete", { ...params, contextName: targetCtx });
    await get().loadDaemonSets();
    await get().loadPods();
    await get().loadClusterOverview();
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

  bulkDeletePods: async (
    pods: { name: string; namespace: string }[],
    force?: boolean,
  ) => {
    const targetCtx = get().currentContext;
    let succeeded = 0;
    let failed = 0;
    for (const p of pods) {
      try {
        await invokeRpc("pods.delete", {
          contextName: targetCtx,
          namespace: p.namespace,
          podName: p.name,
          gracePeriodSeconds: force ? 0 : undefined,
        });
        succeeded++;
      } catch (err) {
        console.error(`Failed to delete pod ${p.namespace}/${p.name}:`, err);
        failed++;
      }
    }
    await get().loadPods();
    await get().loadClusterOverview();
    return { succeeded, failed };
  },

  bulkRestartPods: async (pods: { name: string; namespace: string }[]) => {
    const targetCtx = get().currentContext;
    let succeeded = 0;
    let failed = 0;
    for (const p of pods) {
      try {
        await invokeRpc("pods.restart", {
          contextName: targetCtx,
          namespace: p.namespace,
          podName: p.name,
        });
        succeeded++;
      } catch (err) {
        console.error(`Failed to restart pod ${p.namespace}/${p.name}:`, err);
        failed++;
      }
    }
    await get().loadPods();
    await get().loadClusterOverview();
    return { succeeded, failed };
  },

  execPod: async (params: ExecPodParams) => {
    const targetCtx = params.contextName || get().currentContext;
    return await invokeRpc<ExecPodResult>("pods.exec", {
      ...params,
      contextName: targetCtx,
    });
  },

  getPodYaml: async (
    podName: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("pods.yaml", {
      contextName: targetCtx,
      namespace,
      podName,
    });
    return res?.yaml || "";
  },

  getDeploymentYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("deployments.yaml", {
      contextName: targetCtx,
      namespace,
      deploymentName: name,
    });
    return res?.yaml || "";
  },

  getReplicaSetYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("replicasets.yaml", {
      contextName: targetCtx,
      namespace,
      replicaSetName: name,
    });
    return res?.yaml || "";
  },

  getStatefulSetYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("statefulsets.yaml", {
      contextName: targetCtx,
      namespace,
      statefulSetName: name,
    });
    return res?.yaml || "";
  },

  getDaemonSetYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("daemonsets.yaml", {
      contextName: targetCtx,
      namespace,
      daemonSetName: name,
    });
    return res?.yaml || "";
  },

  getJobYaml: async (name: string, namespace: string, contextName?: string) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("jobs.yaml", {
      contextName: targetCtx,
      namespace,
      jobName: name,
    });
    return res?.yaml || "";
  },

  getCronJobYaml: async (
    name: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodYamlResult>("cronjobs.yaml", {
      contextName: targetCtx,
      namespace,
      cronJobName: name,
    });
    return res?.yaml || "";
  },

  getPodEvents: async (
    podName: string,
    namespace: string,
    contextName?: string,
  ) => {
    const targetCtx = contextName || get().currentContext;
    const res = await invokeRpc<PodEventsResult>("pods.events", {
      contextName: targetCtx,
      namespace,
      podName,
    });
    return res?.events || [];
  },

  setCurrentContext: (context) => set({ currentContext: context }),
  setCurrentNamespace: (namespace) => {
    set({ currentNamespace: namespace });
    // In namespace-scoped mode or if pods haven't loaded yet, query the scoped namespace
    if (get().rbacMode === "namespace-scoped" || get().pods.length === 0) {
      get().loadPods(namespace);
    }
    // Refresh cluster overview dynamically for the scoped namespace
    get().loadClusterOverview(get().currentContext, namespace);
  },
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setServerInfo: (version, latency) =>
    set({ serverVersion: version, latencyMs: latency }),
  openInspector: (resource) =>
    set({ selectedResource: resource, isInspectorOpen: true }),
  closeInspector: () => set({ selectedResource: null, isInspectorOpen: false }),

  openKubeconfigModal: (tab = "browse") =>
    set({ isKubeconfigModalOpen: true, kubeconfigModalTab: tab }),
  closeKubeconfigModal: () => set({ isKubeconfigModalOpen: false }),
  setSplashDismissed: (dismissed) => set({ splashDismissed: dismissed }),

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
      set({
        availableContexts: [],
        currentContext: "",
        connectionStatus: "offline",
        serverVersion: "No cluster connected",
        latencyMs: 0,
        availableNamespaces: ["all", "default"],
        clusterOverview: null,
        pods: [],
        totalPodsCount: 0,
        podLabelFilter: null,
        podLabelFilterSource: null,
        deployments: [],
        totalDeploymentsCount: 0,
        isDeploymentsLoading: false,
        hasLoadedDeploymentsOnce: false,
        replicaSets: [],
        totalReplicaSetsCount: 0,
        isReplicaSetsLoading: false,
        hasLoadedReplicaSetsOnce: false,
        statefulSets: [],
        totalStatefulSetsCount: 0,
        isStatefulSetsLoading: false,
        hasLoadedStatefulSetsOnce: false,
        daemonSets: [],
        totalDaemonSetsCount: 0,
        isDaemonSetsLoading: false,
        hasLoadedDaemonSetsOnce: false,
        jobs: [],
        totalJobsCount: 0,
        isJobsLoading: false,
        hasLoadedJobsOnce: false,
        jobOwnerFilter: null,
        jobsViewMode: "jobs",
        cronJobs: [],
        totalCronJobsCount: 0,
        isCronJobsLoading: false,
        hasLoadedCronJobsOnce: false,
      });
    } catch (err) {
      console.error("Failed to clear contexts:", err);
      toast.error(
        `Failed to clear contexts: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },

  initEventListener: async () => {
    const unlistenContexts = await listenNotification<ListContextsResult>(
      "clusters:contextsChanged",
      (res) => {
        console.log("[ClusterStore] Kubeconfig contexts changed on disk:", res);
        const previousContext = get().currentContext;
        if (res && res.contexts && res.contexts.length > 0) {
          const contexts: ClusterContextInfo[] = res.contexts.map(
            (c: ContextSummary) => ({
              name: c.name,
              cluster: c.cluster,
              server: c.server,
              provider: c.provider,
              status:
                c.name === previousContext ? get().connectionStatus : "offline",
              latencyMs: 0,
              namespace: c.namespace,
              authType: c.authType,
            }),
          );
          const activeContext =
            contexts.find((context) => context.name === previousContext)
              ?.name ??
            contexts.find((context) => context.name === res.currentContext)
              ?.name ??
            contexts[0].name;
          set({ availableContexts: contexts, configPath: res.configPath });
          if (activeContext !== previousContext) {
            void get().switchContext(activeContext);
          } else {
            set({ currentContext: activeContext });
          }
        } else {
          set({
            availableContexts: [],
            currentContext: "",
            connectionStatus: "offline",
            serverVersion: "No cluster connected",
            latencyMs: 0,
            clusterOverview: null,
            diagnosticResult: null,
            availableNamespaces: ["all", "default"],
            currentNamespace: "all",
            pods: [],
            totalPodsCount: 0,
          });
        }
      },
    );

    const unlistenEngineRestart = await listenNotification<unknown>(
      "engine:restarted",
      () => {
        resetStreamCredentials();
        void get().loadContexts();
      },
    );

    // Real-Time K8s Pod Watcher stream, batched to avoid render churn.
    let pendingPodEvents: PodChangeEvent[] = [];
    let podFlushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushPodEvents = () => {
      podFlushTimer = null;
      if (pendingPodEvents.length === 0) return;
      const events = pendingPodEvents;
      pendingPodEvents = [];

      const activeContext = get().currentContext;
      const activeNamespace = get().currentNamespace;
      const namespaceScoped = get().rbacMode === "namespace-scoped";
      const podMap = new Map(
        get().pods.map((pod) => [`${pod.namespace}/${pod.name}`, pod]),
      );
      let delta = 0;
      for (const event of events) {
        if (event.context && event.context !== activeContext) continue;
        if (
          namespaceScoped &&
          activeNamespace !== "all" &&
          event.pod.namespace !== activeNamespace
        ) {
          continue;
        }
        const key = `${event.pod.namespace}/${event.pod.name}`;
        if (event.type === "DELETED") {
          if (podMap.delete(key)) delta -= 1;
        } else {
          if (!podMap.has(key)) delta += 1;
          podMap.set(key, event.pod);
        }
      }
      set({
        pods: Array.from(podMap.values()),
        totalPodsCount: Math.max(0, get().totalPodsCount + delta),
      });
    };

    const unlistenPods = await listenNotification<PodChangeEvent>(
      "pods:changed",
      (event) => {
        if (!event || !event.pod) return;
        // Verify event belongs to the current active context
        if (event.context && event.context !== get().currentContext) {
          return;
        }
        if (get().rbacMode === "namespace-scoped") {
          const targetNs = get().currentNamespace;
          if (targetNs !== "all" && event.pod.namespace !== targetNs) {
            return;
          }
        }

        pendingPodEvents.push(event);
        if (!podFlushTimer) {
          podFlushTimer = setTimeout(flushPodEvents, 100);
        }
      },
    );

    // Real-Time Cluster Overview & Workloads stream with trailing debounce (350ms)
    let overviewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unlistenOverview = await listenNotification<{ context: string }>(
      "clusters:overviewChanged",
      (payload) => {
        if (
          !payload ||
          !payload.context ||
          payload.context === get().currentContext
        ) {
          if (overviewDebounceTimer) clearTimeout(overviewDebounceTimer);
          overviewDebounceTimer = setTimeout(() => {
            get().loadClusterOverview();
          }, 350);
        }
      },
    );

    // Real-Time Warning Events Stream
    const unlistenEvents = await listenNotification<PodEventItem>(
      "events:warning",
      (item) => {
        if (!item) return;
        if (item.context && item.context !== get().currentContext) return;
        if (get().rbacMode === "namespace-scoped") {
          const targetNs = get().currentNamespace;
          if (
            targetNs !== "all" &&
            item.involvedObjectNamespace &&
            item.involvedObjectNamespace !== targetNs
          ) {
            return;
          }
        }
        const ov = get().clusterOverview;
        if (ov) {
          const existing = ov.warningEvents || [];
          set({
            clusterOverview: {
              ...ov,
              warningEvents: [
                item,
                ...existing.filter(
                  (e) =>
                    e.message !== item.message ||
                    e.involvedObjectNamespace !== item.involvedObjectNamespace,
                ),
              ].slice(0, 15),
            },
          });
        }
      },
    );

    return () => {
      if (overviewDebounceTimer) clearTimeout(overviewDebounceTimer);
      if (podFlushTimer) clearTimeout(podFlushTimer);
      unlistenContexts();
      unlistenEngineRestart();
      unlistenPods();
      unlistenOverview();
      unlistenEvents();
    };
  },
}));
