"use client";

import * as React from "react";
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
import { WarningEventsCard } from "./components/WarningEventsCard";
import type { NodeSummary } from "@kubeview/contracts";

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
    pods,
  } = useClusterStore();

  const { openTab } = useTabStore();
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
  const [nodeViewMode, setNodeViewMode] = React.useState<"grid" | "table">("grid");
  const [telemetryMode, setTelemetryMode] = React.useState<"usage" | "allocation">("usage");
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = React.useState(false);

  React.useEffect(() => {
    if (connectionStatus === "connected" || connectionStatus === "degraded") {
      loadClusterOverview(currentContext, currentNamespace);
    }
  }, [connectionStatus, currentContext, currentNamespace]);

  const isNamespaceScoped = currentNamespace !== "all";

  // Instantaneous 0ms cached metrics from in-memory pods
  const scopedPods = React.useMemo(() => {
    if (!isNamespaceScoped) return pods;
    return pods.filter((p) => p.namespace === currentNamespace);
  }, [pods, currentNamespace, isNamespaceScoped]);

  // Nodes hosting pods for this namespace
  const nodesHostingNamespace = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of scopedPods) {
      if (p.nodeName) set.add(p.nodeName);
    }
    return set;
  }, [scopedPods]);

  // Pod counts per node in current namespace
  const nodeScopedPodCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of scopedPods) {
      if (p.nodeName) {
        map[p.nodeName] = (map[p.nodeName] || 0) + 1;
      }
    }
    return map;
  }, [scopedPods]);

  if (connectionStatus === "offline") {
    return <OfflineState />;
  }

  if ((connectionStatus === "checking" && !diagnosticResult) || (isOverviewLoading && !clusterOverview)) {
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
        : `Showing all ${clusterOverview?.totalPods ?? 0} pods across namespaces`
    );
  };

  const handleRefresh = async () => {
    toast.info("Refreshing cluster telemetry...");
    await Promise.all([diagnoseContext(), loadClusterOverview(currentContext, currentNamespace)]);
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
      title: isNamespaceScoped ? `Pods (${nodeName} · ${currentNamespace})` : `Pods (${nodeName})`,
      icon: "Box",
      closable: true,
    });
    loadPods(isNamespaceScoped ? currentNamespace : "all");
    toast.info(
      isNamespaceScoped
        ? `Filtered pods to node ${nodeName} in namespace '${currentNamespace}'`
        : `Filtered pods view to node: ${nodeName}`
    );
  };

  const handleInspectWorkload = (targetNs: string) => {
    setCurrentNamespace(targetNs);
    openTab({ id: "pods", title: `Pods (${targetNs})`, closable: true });
    loadPods(targetNs);
  };

  const handleScrollToNodes = () => {
    const el = document.getElementById("cluster-nodes-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-6 lg:p-8 space-y-6 select-none w-full">
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

      {/* 4. Split Grid: Workload Controllers & Warning Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <WorkloadControllersCard
          workloads={clusterOverview?.workloads}
          isNamespaceScoped={isNamespaceScoped}
          currentNamespace={currentNamespace}
          onInspectWorkload={handleInspectWorkload}
        />

        <WarningEventsCard
          warningEvents={clusterOverview?.warningEvents}
          isNamespaceScoped={isNamespaceScoped}
          currentNamespace={currentNamespace}
          availableNamespacesCount={availableNamespaces.length}
          onOpenPodsView={handleBrowsePods}
        />
      </div>

      {/* Connection & Security Diagnostics On-Demand Drawer */}
      <ConnectionDiagnosticsDrawer
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
    </div>
  );
}
