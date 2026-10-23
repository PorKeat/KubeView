"use client";

import * as React from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import { toast } from "sonner";
import { OverviewSkeleton, OfflineState, ErrorBanner } from "@/components/ui";
import { ConnectionDiagnosticsDrawer } from "../ConnectionDiagnosticsDrawer";

import { ClusterOverviewHeader } from "./components/ClusterOverviewHeader";
import { NamespaceScopeBanner } from "./components/NamespaceScopeBanner";
import { BentoMetricCards } from "./components/BentoMetricCards";
import { NodeTopologySection } from "./components/NodeTopologySection";
import { WorkloadControllersCard } from "./components/WorkloadControllersCard";
import {
  WarningEventsCard,
  extractPodName,
} from "./components/WarningEventsCard";
import type { NodeSummary, PodEventItem } from "@kubeview/contracts";

export function ClusterOverviewView() {
  const {
    currentContext,
    currentNamespace,
    serverVersion,
    latencyMs,
    openInspector,
    diagnosticResult,
    connectionStatus,
    diagnoseContext,
    availableNamespaces,
    clusterOverview,
    isOverviewLoading,
    loadClusterOverview,
    setCurrentNamespace,
    loadPods,
    loadStatefulSets,
    loadDaemonSets,
    pods,
    autoRefreshInterval,
    setAutoRefreshInterval,
  } = useClusterStore();

  const { openTab } = useTabStore();
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
  const [nodeViewMode, setNodeViewMode] = React.useState<"grid" | "table">(
    "grid",
  );
  const [telemetryMode, setTelemetryMode] = React.useState<
    "usage" | "allocation"
  >("usage");
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = React.useState(false);

  React.useEffect(() => {
    if (connectionStatus === "connected" || connectionStatus === "degraded") {
      loadClusterOverview(currentContext, currentNamespace);
      if (useClusterStore.getState().pods.length === 0) {
        loadPods();
      }
    }
  }, [
    connectionStatus,
    currentContext,
    currentNamespace,
    loadClusterOverview,
    loadPods,
  ]);

  // Periodic Auto-refresh timer for live telemetry sync
  React.useEffect(() => {
    if (autoRefreshInterval <= 0 || !currentContext) return;
    const timer = setInterval(() => {
      loadClusterOverview(currentContext, currentNamespace);
    }, autoRefreshInterval);
    return () => clearInterval(timer);
  }, [
    autoRefreshInterval,
    currentContext,
    currentNamespace,
    loadClusterOverview,
  ]);

  const isNamespaceScoped = currentNamespace !== "all";

  // Instantaneous 0ms cached metrics from in-memory pods
  const scopedPods = React.useMemo(() => {
    if (!isNamespaceScoped) return pods;
    return pods.filter(
      (p) => p.namespace.toLowerCase() === currentNamespace.toLowerCase(),
    );
  }, [pods, currentNamespace, isNamespaceScoped]);

  // Nodes hosting pods for this namespace
  const nodesHostingNamespace = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of scopedPods) {
      if (p.nodeName) set.add(p.nodeName.trim());
    }
    return set;
  }, [scopedPods]);

  // Pod counts per node in current namespace
  const nodeScopedPodCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of scopedPods) {
      if (p.nodeName) {
        const k = p.nodeName.trim();
        map[k] = (map[k] || 0) + 1;
      }
    }
    return map;
  }, [scopedPods]);

  if (connectionStatus === "offline") {
    return <OfflineState />;
  }

  if (
    (connectionStatus === "checking" && !diagnosticResult) ||
    (isOverviewLoading && !clusterOverview)
  ) {
    return <OverviewSkeleton />;
  }

  const nodes = clusterOverview?.nodes || [];
  const hasMetrics = Boolean(clusterOverview?.hasMetrics);
  const effectiveMode = hasMetrics ? telemetryMode : "allocation";

  const handleOpenDiagnostics = () => setIsDiagnosticsOpen(true);

  const handleBrowsePods = () => {
    openTab({
      id: "pods",
      title: isNamespaceScoped ? `Pods (${currentNamespace})` : "Pods",
      closable: true,
    });
    loadPods(isNamespaceScoped ? currentNamespace : "all");
    toast.info(
      isNamespaceScoped
        ? `Showing pods in namespace '${currentNamespace}'`
        : `Showing all ${clusterOverview?.totalPods ?? 0} pods across namespaces`,
    );
  };

  const handleRefresh = async () => {
    toast.info("Refreshing cluster telemetry...");
    await Promise.all([
      diagnoseContext(),
      loadClusterOverview(currentContext, currentNamespace),
    ]);
    toast.success("Telemetry refreshed!");
  };

  const handleInspectNode = (n: NodeSummary) => {
    setSelectedNode(n.name);
    openInspector({
      kind: "Node",
      name: n.name,
      namespace: isNamespaceScoped ? currentNamespace : "Cluster Scope",
      status: n.status,
      data: {
        name: n.name,
        status: n.status,
        roles: n.roles,
        version: n.version,
        architecture: n.architecture,
        internalIP: n.internalIP,
        cpuCapacity: n.cpuCapacity,
        cpuAllocated: n.cpuAllocated,
        cpuPercent: n.cpuPercent,
        cpuUsage: n.cpuUsage,
        cpuUsagePercent: n.cpuUsagePercent,
        memoryCapacity: n.memoryCapacity,
        memoryAllocated: n.memoryAllocated,
        memoryPercent: n.memoryPercent,
        memoryUsage: n.memoryUsage,
        memoryUsagePercent: n.memoryUsagePercent,
        podCapacity: n.podCapacity,
        activePods: n.activePods,
      },
    });
  };

  const handleFilterPodsForNode = (nodeName: string) => {
    useClusterStore.getState().setPodNodeFilter(nodeName);
    openTab({
      id: "pods",
      title: isNamespaceScoped
        ? `Pods (${nodeName} · ${currentNamespace})`
        : `Pods (${nodeName})`,
      icon: "Box",
      closable: true,
    });
    loadPods(isNamespaceScoped ? currentNamespace : "all");
    toast.info(
      isNamespaceScoped
        ? `Filtered pods to node ${nodeName} in namespace '${currentNamespace}'`
        : `Filtered pods view to node: ${nodeName}`,
    );
  };

  const handleTriageEvent = async (event: PodEventItem, targetPod?: string) => {
    const rawPodName = targetPod || extractPodName(event);
    const targetNs =
      event.involvedObjectNamespace ||
      (isNamespaceScoped ? currentNamespace : undefined);

    if (rawPodName) {
      // 1. Check if pod is already loaded in store
      let found = pods.find(
        (p) =>
          (p.name === rawPodName || p.name.includes(rawPodName)) &&
          (!targetNs || p.namespace === targetNs),
      );
      if (!found) {
        found = pods.find(
          (p) => p.name === rawPodName || p.name.includes(rawPodName),
        );
      }

      if (found) {
        openInspector({
          kind: "Pod",
          name: found.name,
          namespace: found.namespace,
          status: found.status,
          data: found as unknown as Record<string, unknown>,
        });
        toast.info(`Inspecting pod '${found.name}' (${found.namespace})`);
        return;
      }

      // 2. Pod not currently in memory: switch namespace if different, and fetch pods
      if (targetNs && targetNs !== currentNamespace && targetNs !== "all") {
        setCurrentNamespace(targetNs);
      }
      await loadPods(
        targetNs || (isNamespaceScoped ? currentNamespace : "all"),
      );
      const latestPods = useClusterStore.getState().pods;
      const latestFound =
        latestPods.find(
          (p) =>
            (p.name === rawPodName || p.name.includes(rawPodName)) &&
            (!targetNs || p.namespace === targetNs),
        ) ||
        latestPods.find(
          (p) => p.name === rawPodName || p.name.includes(rawPodName),
        );

      if (latestFound) {
        openInspector({
          kind: "Pod",
          name: latestFound.name,
          namespace: latestFound.namespace,
          status: latestFound.status,
          data: latestFound as unknown as Record<string, unknown>,
        });
        toast.info(
          `Inspecting pod '${latestFound.name}' (${latestFound.namespace})`,
        );
        return;
      }

      // 3. Fallback: open inspector with known event metadata (API streams live YAML & events)
      openInspector({
        kind: "Pod",
        name: rawPodName,
        namespace: targetNs || currentNamespace || "default",
        status: "Warning",
        data: {
          name: rawPodName,
          namespace: targetNs || currentNamespace || "default",
          status: "Warning",
        },
      });
      toast.info(`Inspecting pod '${rawPodName}'`);
      return;
    }

    handleBrowsePods();
  };

  const handleInspectWorkload = (targetNs: string) => {
    setCurrentNamespace(targetNs);
    openTab({ id: "pods", title: `Pods (${targetNs})`, closable: true });
    loadPods(targetNs);
  };

  const handleInspectStatefulSets = (targetNs: string) => {
    setCurrentNamespace(targetNs);
    openTab({
      id: "statefulsets",
      title: targetNs === "all" ? "StatefulSets" : `StatefulSets (${targetNs})`,
      closable: true,
    });
    loadStatefulSets(targetNs);
  };

  const handleInspectDaemonSets = (targetNs: string) => {
    setCurrentNamespace(targetNs);
    openTab({
      id: "daemonsets",
      title: targetNs === "all" ? "DaemonSets" : `DaemonSets (${targetNs})`,
      closable: true,
    });
    loadDaemonSets(targetNs);
  };

  const handleScrollToNodes = () => {
    const el = document.getElementById("cluster-nodes-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 space-y-4 select-none w-full">
      {/* Degraded Warning Banner */}
      {connectionStatus === "degraded" && (
        <ErrorBanner
          message="Cluster connectivity is operating in degraded mode. Some network probes or RBAC checks reported issues."
          actionLabel="Re-run Diagnostics"
          onAction={() => diagnoseContext()}
        />
      )}

      {/* 1. Page Header */}
      <ClusterOverviewHeader
        currentContext={currentContext}
        connectionStatus={connectionStatus}
        serverVersion={serverVersion}
        latencyMs={latencyMs}
        isNamespaceScoped={isNamespaceScoped}
        currentNamespace={currentNamespace}
        totalPodsCount={clusterOverview?.totalPods ?? scopedPods.length}
        onOpenDiagnostics={handleOpenDiagnostics}
        onBrowsePods={handleBrowsePods}
        onRefresh={handleRefresh}
      />

      {/* Dynamic Namespace Filter Ambient Banner */}
      {isNamespaceScoped && (
        <NamespaceScopeBanner
          currentNamespace={currentNamespace}
          totalPods={clusterOverview?.totalPods ?? scopedPods.length}
          hostingNodesCount={nodesHostingNamespace.size}
          totalNodesCount={clusterOverview?.totalNodes ?? 0}
          onViewPods={handleBrowsePods}
          onClearFilter={() => {
            setCurrentNamespace("all");
            toast.info("Cleared namespace filter. Showing all namespaces.");
          }}
        />
      )}

      {/* 2. Unified Telemetry Command Strip & 4 Bento Cards */}
      <BentoMetricCards
        clusterOverview={clusterOverview}
        isNamespaceScoped={isNamespaceScoped}
        currentNamespace={currentNamespace}
        scopedPodsCount={scopedPods.length}
        nodesHostingCount={nodesHostingNamespace.size}
        availableNamespacesCount={availableNamespaces.length}
        hasMetrics={hasMetrics}
        effectiveMode={effectiveMode}
        telemetryMode={telemetryMode}
        onSetTelemetryMode={setTelemetryMode}
        onOpenPodsView={handleBrowsePods}
        onScrollToNodes={handleScrollToNodes}
      />

      {/* 3. Node Topology & Infrastructure */}
      <NodeTopologySection
        nodes={nodes}
        readyNodesCount={clusterOverview?.readyNodes ?? 0}
        totalCpuCores={clusterOverview?.totalCpuCores ?? 0}
        totalMemoryGiB={clusterOverview?.totalMemoryGiB ?? 0}
        selectedNode={selectedNode}
        nodeViewMode={nodeViewMode}
        effectiveMode={effectiveMode}
        isNamespaceScoped={isNamespaceScoped}
        currentNamespace={currentNamespace}
        nodesHostingCount={nodesHostingNamespace.size}
        nodeScopedPodCounts={nodeScopedPodCounts}
        onSetNodeViewMode={setNodeViewMode}
        onInspectNode={handleInspectNode}
        onFilterPodsForNode={handleFilterPodsForNode}
      />

      {/* 4. Adaptive Layout: Workload Controllers & Incident Journal */}
      {clusterOverview?.warningEvents &&
      clusterOverview.warningEvents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          <WorkloadControllersCard
            workloads={clusterOverview?.workloads}
            isNamespaceScoped={isNamespaceScoped}
            currentNamespace={currentNamespace}
            isFullWidth={false}
            onInspectWorkload={handleInspectWorkload}
            onInspectStatefulSets={handleInspectStatefulSets}
            onInspectDaemonSets={handleInspectDaemonSets}
          />

          <div
            id="cluster-warning-events-card"
            className="h-full flex flex-col"
          >
            <WarningEventsCard
              warningEvents={clusterOverview?.warningEvents}
              isNamespaceScoped={isNamespaceScoped}
              currentNamespace={currentNamespace}
              availableNamespacesCount={availableNamespaces.length}
              onOpenPodsView={handleBrowsePods}
              onTriageEvent={handleTriageEvent}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Calm Incident Indicator when 0 Active Warnings */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] shadow-xs select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[var(--foreground)]">
                  Cluster Health:
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  0 Active Warnings
                </span>
                <span className="text-[var(--muted)] font-mono hidden md:inline">
                  All cluster workloads report healthy condition
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBrowsePods}
              className="text-[var(--accent)] hover:underline font-mono text-xs font-medium flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Pods Explorer</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Full-width 3-Column Workload Controllers */}
          <WorkloadControllersCard
            workloads={clusterOverview?.workloads}
            isNamespaceScoped={isNamespaceScoped}
            currentNamespace={currentNamespace}
            isFullWidth={true}
            onInspectWorkload={handleInspectWorkload}
            onInspectStatefulSets={handleInspectStatefulSets}
            onInspectDaemonSets={handleInspectDaemonSets}
          />
        </div>
      )}

      {/* Connection & Security Diagnostics On-Demand Drawer */}
      <ConnectionDiagnosticsDrawer
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
    </div>
  );
}
