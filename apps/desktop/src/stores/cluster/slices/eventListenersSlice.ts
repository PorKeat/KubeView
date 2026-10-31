import type { StateCreator } from "zustand";
import type {
  ContextSummary,
  ListContextsResult,
  PodChangeEvent,
  PodEventItem,
  PodSummary,
} from "@kubeview/contracts";
import { listenNotification, resetStreamCredentials } from "@/lib/ipc";
import type { ClusterState } from "../types/cluster";
import type { ClusterContextInfo } from "../types/contexts";
import type { EventListenersSlice } from "../types/events";

export const createEventListenersSlice: StateCreator<
  ClusterState,
  [],
  [],
  EventListenersSlice
> = (set, get) => ({
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
      let changed = false;
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
          if (podMap.delete(key)) {
            delta -= 1;
            changed = true;
          }
        } else {
          const existing = podMap.get(key);
          if (!existing) {
            delta += 1;
            changed = true;
          } else if (!podSummariesEqual(existing, event.pod)) {
            changed = true;
          }
          podMap.set(key, event.pod);
        }
      }
      // Skip no-op updates so subscribers are not re-rendered for events
      // whose derived summary did not change.
      if (!changed) return;
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
});

/**
 * Cheap change detection for pod watch batches. Compares the volatile fields
 * first and only falls back to a deep comparison when they match.
 */
function podSummariesEqual(a: PodSummary, b: PodSummary): boolean {
  if (
    a.name !== b.name ||
    a.namespace !== b.namespace ||
    a.status !== b.status ||
    a.ready !== b.ready ||
    a.restarts !== b.restarts ||
    a.age !== b.age ||
    a.cpu !== b.cpu ||
    a.cpuPercent !== b.cpuPercent ||
    a.memory !== b.memory ||
    a.memoryPercent !== b.memoryPercent ||
    a.nodeName !== b.nodeName ||
    a.ip !== b.ip
  ) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}
