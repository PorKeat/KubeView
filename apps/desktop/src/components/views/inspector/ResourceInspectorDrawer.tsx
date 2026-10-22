"use client";

import * as React from "react";
import { useClusterStore, SelectedResource } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import type {
  PodSummary,
  PodEventItem,
  NodeSummary,
  DeploymentSummary,
  ReplicaSetSummary,
} from "@kubeview/contracts";
import { toast } from "sonner";
import { motion } from "motion/react";
import { LayoutDashboard, Box, HeartPulse, Bell, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

import { InspectorHeader } from "./components/InspectorHeader";
import { InspectorNodeOverview } from "./tabs/InspectorNodeOverview";
import { InspectorPodOverview } from "./tabs/InspectorPodOverview";
import { InspectorContainersTab } from "./tabs/InspectorContainersTab";
import { InspectorConditionsTab } from "./tabs/InspectorConditionsTab";
import { InspectorEventsTab } from "./tabs/InspectorEventsTab";
import { InspectorYamlTab } from "./tabs/InspectorYamlTab";
import { InspectorWorkloadOverview } from "./tabs/InspectorWorkloadOverview";
import {
  InspectorWorkloadConditionsTab,
  type WorkloadConditionLike,
} from "./tabs/InspectorWorkloadConditionsTab";
import { formatLabelSelector } from "@/lib/labelSelector";

function synthesizePodYaml(pod: PodSummary): string {
  const lines: string[] = [
    "apiVersion: v1",
    "kind: Pod",
    "metadata:",
    `  name: ${pod.name}`,
    `  namespace: ${pod.namespace || "default"}`,
  ];

  if (pod.creationTimestamp) {
    lines.push(`  creationTimestamp: "${pod.creationTimestamp}"`);
  }

  if (pod.labels && Object.keys(pod.labels).length > 0) {
    lines.push("  labels:");
    for (const [k, v] of Object.entries(pod.labels)) {
      lines.push(`    ${k}: "${v}"`);
    }
  }

  if (pod.annotations && Object.keys(pod.annotations).length > 0) {
    lines.push("  annotations:");
    for (const [k, v] of Object.entries(pod.annotations)) {
      lines.push(`    ${k}: "${v.replace(/"/g, '\\"')}"`);
    }
  }

  lines.push("spec:");
  if (pod.nodeName) {
    lines.push(`  nodeName: ${pod.nodeName}`);
  }

  if (pod.containers && pod.containers.length > 0) {
    lines.push("  containers:");
    for (const c of pod.containers) {
      lines.push(`  - name: ${c.name}`);
      lines.push(`    image: ${c.image}`);
      if (c.ports && c.ports.length > 0) {
        lines.push("    ports:");
        for (const p of c.ports) {
          lines.push(`    - containerPort: ${p.containerPort}`);
          if (p.name) lines.push(`      name: ${p.name}`);
          if (p.protocol) lines.push(`      protocol: ${p.protocol}`);
        }
      }
      if (c.resources) {
        lines.push("    resources:");
        if (c.resources.requests) {
          lines.push("      requests:");
          if (c.resources.requests.cpu) lines.push(`        cpu: ${c.resources.requests.cpu}`);
          if (c.resources.requests.memory) lines.push(`        memory: ${c.resources.requests.memory}`);
        }
        if (c.resources.limits) {
          lines.push("      limits:");
          if (c.resources.limits.cpu) lines.push(`        cpu: ${c.resources.limits.cpu}`);
          if (c.resources.limits.memory) lines.push(`        memory: ${c.resources.limits.memory}`);
        }
      }
    }
  }

  lines.push("status:");
  lines.push(`  phase: ${pod.status}`);
  if (pod.ip) {
    lines.push(`  podIP: ${pod.ip}`);
  }
  if (pod.qosClass) {
    lines.push(`  qosClass: ${pod.qosClass}`);
  }

  return lines.join("\n");
}

export function ResourceInspectorDrawer() {
  const {
    isInspectorOpen,
    selectedResource,
    closeInspector,
    openLogsModal,
    openExecModal,
    openRestartConfirm,
    openDeleteConfirm,
    getPodYaml,
    getDeploymentYaml,
    getReplicaSetYaml,
    getPodEvents,
    pods,
    loadPods,
    setCurrentNamespace,
    setPodNodeFilter,
    setPodLabelFilter,
    openWorkloadAction,
    openInspector,
  } = useClusterStore();

  const { openTab } = useTabStore();

  const [activeTab, setActiveTab] = React.useState<"overview" | "containers" | "conditions" | "events" | "yaml">("overview");
  const [copiedYaml, setCopiedYaml] = React.useState(false);
  const [liveYaml, setLiveYaml] = React.useState<string>("");
  const [liveEvents, setLiveEvents] = React.useState<PodEventItem[]>([]);
  const [isLoadingYaml, setIsLoadingYaml] = React.useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = React.useState(false);

  // Smooth slide transition state
  const [isRendered, setIsRendered] = React.useState(isInspectorOpen);
  const [isMounted, setIsMounted] = React.useState(false);
  const [cachedResource, setCachedResource] = React.useState<SelectedResource | null>(selectedResource);

  React.useEffect(() => {
    if (selectedResource) {
      setCachedResource(selectedResource);
    }
  }, [selectedResource]);

  React.useEffect(() => {
    if (isInspectorOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => {
        setIsMounted(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsMounted(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isInspectorOpen]);

  const currentResource = selectedResource || cachedResource;

  // Distinguish between Pod, Deployment, ReplicaSet, and Node resources
  const isNode = currentResource?.kind === "Node";
  const isDeployment = currentResource?.kind === "Deployment";
  const isReplicaSet = currentResource?.kind === "ReplicaSet";
  const isWorkload = isDeployment || isReplicaSet;
  const podData =
    !isNode && !isWorkload
      ? (currentResource?.data as unknown as PodSummary | undefined)
      : undefined;
  const nodeData = isNode
    ? (currentResource?.data as unknown as NodeSummary | undefined)
    : undefined;
  const deploymentData = isDeployment
    ? (currentResource?.data as unknown as DeploymentSummary | undefined)
    : undefined;
  const replicaSetData = isReplicaSet
    ? (currentResource?.data as unknown as ReplicaSetSummary | undefined)
    : undefined;
  const workloadConditions: WorkloadConditionLike[] =
    deploymentData?.conditions ?? replicaSetData?.conditions ?? [];

  // Reset to the overview tab whenever a different resource is inspected.
  React.useEffect(() => {
    setActiveTab("overview");
  }, [currentResource?.kind, currentResource?.name]);

  // Filter pods running on the currently inspected node
  const nodePods = React.useMemo(() => {
    if (!isNode || !nodeData?.name) return [];
    const targetNode = nodeData.name.toLowerCase();
    return pods.filter((p) => p.nodeName && p.nodeName.toLowerCase() === targetNode);
  }, [isNode, nodeData?.name, pods]);

  // If inspecting a node and pods list is empty, fetch cluster-wide pods
  React.useEffect(() => {
    if (isInspectorOpen && isNode && pods.length === 0) {
      loadPods("all");
    }
  }, [isInspectorOpen, isNode, pods.length, loadPods]);

  // Load real YAML when YAML tab is active (Pods, Deployments, ReplicaSets)
  const handleReloadYaml = React.useCallback(() => {
    if (!currentResource || isNode) return;
    setIsLoadingYaml(true);

    const resolvedNs =
      currentResource.namespace &&
      currentResource.namespace !== "all" &&
      currentResource.namespace !== "Cluster Scope"
        ? currentResource.namespace
        : podData?.namespace ||
          pods.find((p) => p.name === currentResource.name)?.namespace ||
          "default";

    const fetchManifest = isDeployment
      ? getDeploymentYaml(currentResource.name, resolvedNs)
      : isReplicaSet
        ? getReplicaSetYaml(currentResource.name, resolvedNs)
        : getPodYaml(currentResource.name, resolvedNs);

    fetchManifest
      .then((yamlStr) => {
        if (yamlStr && yamlStr.trim()) {
          setLiveYaml(yamlStr);
        } else if (podData) {
          setLiveYaml(synthesizePodYaml(podData));
        } else {
          setLiveYaml("# No YAML returned from cluster.\n# Click 'Refresh' to try again.");
        }
      })
      .catch((err) => {
        if (podData) {
          setLiveYaml(
            `# Notice: Live cluster YAML fetch unavailable (${err?.message || err})\n# Displaying cached resource definition:\n\n` +
              synthesizePodYaml(podData),
          );
        } else {
          setLiveYaml(
            `# Error loading manifest: ${err?.message || err}\n# Click 'Refresh' above to try fetching again.`,
          );
        }
      })
      .finally(() => setIsLoadingYaml(false));
  }, [currentResource, isNode, isDeployment, isReplicaSet, podData, pods, getPodYaml, getDeploymentYaml, getReplicaSetYaml]);

  React.useEffect(() => {
    if (isInspectorOpen && activeTab === "yaml" && !isNode) {
      handleReloadYaml();
    }
  }, [isInspectorOpen, currentResource?.name, currentResource?.namespace, activeTab, isNode, handleReloadYaml]);

  // Load real Events when events tab is active (Pods only)
  React.useEffect(() => {
    if (isInspectorOpen && currentResource && activeTab === "events" && !isNode && !isWorkload) {
      setIsLoadingEvents(true);
      getPodEvents(currentResource.name, currentResource.namespace)
        .then((evList) => {
          setLiveEvents(evList || []);
        })
        .catch(() => {
          setLiveEvents([]);
        })
        .finally(() => setIsLoadingEvents(false));
    }
  }, [isInspectorOpen, currentResource?.name, currentResource?.namespace, activeTab, getPodEvents, isNode, isWorkload]);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isInspectorOpen) {
        closeInspector();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInspectorOpen, closeInspector]);

  if (!isRendered || !currentResource) return null;

  const copyYaml = () => {
    navigator.clipboard.writeText(liveYaml);
    setCopiedYaml(true);
    toast.success("YAML copied to clipboard");
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  const downloadYaml = () => {
    if (!currentResource) return;
    const blob = new Blob([liveYaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentResource.name}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("YAML manifest downloaded");
  };

  const handleFilterPodsForNode = (nodeName: string) => {
    setCurrentNamespace("all");
    setPodNodeFilter(nodeName);
    loadPods("all");
    openTab({
      id: "pods",
      title: `Pods (${nodeName})`,
      icon: "Box",
      closable: true,
    });
    toast.info(`Filtered pods view to node: ${nodeName}`);
    closeInspector();
  };

  const handleViewAllPods = () => {
    setCurrentNamespace("all");
    setPodNodeFilter(null);
    loadPods("all");
    openTab({
      id: "pods",
      title: "Pods",
      icon: "Box",
      closable: true,
    });
    closeInspector();
  };

  const handleViewPodsForWorkload = () => {
    if (!currentResource || !isWorkload) return;
    const selector = formatLabelSelector(
      deploymentData?.selector ?? replicaSetData?.selector,
    );
    setCurrentNamespace(currentResource.namespace);
    setPodNodeFilter(null);
    setPodLabelFilter(
      selector || null,
      `${currentResource.kind}: ${currentResource.name}`,
    );
    loadPods(currentResource.namespace);
    openTab({ id: "pods", title: "Pods", closable: true });
    toast.info(
      selector
        ? `Filtered pods by ${currentResource.kind.toLowerCase()} '${currentResource.name}'`
        : `Opened pods in namespace '${currentResource.namespace}'`,
    );
    closeInspector();
  };

  const handleScaleWorkload = () => {
    if (!currentResource || !isWorkload) return;
    openWorkloadAction({
      kind: currentResource.kind as "Deployment" | "ReplicaSet",
      action: "scale",
      name: currentResource.name,
      namespace: currentResource.namespace,
      replicas:
        deploymentData?.desiredReplicas ??
        replicaSetData?.desiredReplicas ??
        1,
    });
  };

  const handleRestartWorkload = () => {
    if (!currentResource || !isWorkload) return;
    openWorkloadAction({
      kind: currentResource.kind as "Deployment" | "ReplicaSet",
      action: "restart",
      name: currentResource.name,
      namespace: currentResource.namespace,
      ownerDeployment: replicaSetData?.ownerDeployment,
    });
  };

  const handleDeleteWorkload = () => {
    if (!currentResource || !isWorkload) return;
    openWorkloadAction({
      kind: currentResource.kind as "Deployment" | "ReplicaSet",
      action: "delete",
      name: currentResource.name,
      namespace: currentResource.namespace,
      ownerDeployment: replicaSetData?.ownerDeployment,
    });
  };

  const inspectorTabs = isWorkload
    ? [
        { id: "overview" as const, label: "Overview", icon: LayoutDashboard, count: null },
        { id: "conditions" as const, label: "Conditions", icon: HeartPulse, count: workloadConditions.length },
        { id: "yaml" as const, label: "YAML", icon: FileCode, count: null },
      ]
    : [
        { id: "overview" as const, label: "Overview", icon: LayoutDashboard, count: null },
        { id: "containers" as const, label: "Containers", icon: Box, count: podData?.containers?.length || 0 },
        { id: "conditions" as const, label: "Conditions", icon: HeartPulse, count: podData?.conditions?.length || 0 },
        { id: "events" as const, label: "Events", icon: Bell, count: liveEvents.length > 0 ? liveEvents.length : null },
        { id: "yaml" as const, label: "YAML", icon: FileCode, count: null },
      ];

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 overflow-hidden transition-all duration-200 motion-reduce:transition-none",
        isMounted ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Modal Backdrop / Dim Overlay */}
      <div
        data-testid="resource-inspector-backdrop"
        onClick={closeInspector}
        className={cn(
          "fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity motion-reduce:transition-none cursor-pointer",
          isMounted ? "opacity-100 duration-250 ease-out" : "opacity-0 duration-200 ease-in"
        )}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer */}
      <div
        data-testid="resource-inspector-drawer"
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-full max-w-xl md:max-w-2xl glass-panel border-l border-[var(--border)] shadow-2xl flex flex-col select-none backdrop-blur-xl",
          "transform transition-transform motion-reduce:transition-none motion-reduce:transform-none",
          isMounted
            ? "translate-x-0 duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
            : "translate-x-full duration-200 ease-in"
        )}
      >
        {/* Top Header */}
        <InspectorHeader
          currentResource={currentResource}
          isNode={isNode}
          isDeployment={isDeployment}
          isReplicaSet={isReplicaSet}
          nodeData={nodeData}
          podData={podData}
          onViewPods={handleViewPodsForWorkload}
          onScaleWorkload={handleScaleWorkload}
          onRestartWorkload={
            isDeployment ||
            (isReplicaSet && Boolean(replicaSetData?.ownerDeployment))
              ? handleRestartWorkload
              : undefined
          }
          onDeleteWorkload={handleDeleteWorkload}
          onClose={closeInspector}
          onOpenLogsModal={openLogsModal}
          onOpenExecModal={openExecModal}
          onOpenRestartConfirm={openRestartConfirm}
          onOpenDeleteConfirm={openDeleteConfirm}
        />

        {/* Segmented Tabs Bar (Pods and Workloads) */}
        {!isNode && (
          <div className="h-11 border-b border-[var(--border)] px-4 flex items-center bg-[var(--surface)] shrink-0 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] border border-[var(--border)] text-xs select-none">
              {inspectorTabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    data-testid={`inspector-tab-${t.id}`}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "relative px-2.5 py-1 text-xs rounded-md capitalize transition-colors font-medium cursor-pointer flex items-center gap-1.5 outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--accent)]",
                      isActive
                        ? "text-[var(--foreground)] font-semibold"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="inspector-active-tab-indicator"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        className="absolute inset-0 rounded-md bg-[var(--surface-elevated)] dark:bg-white/10 shadow-xs border border-[var(--border)] -z-10 motion-reduce:transition-none"
                      />
                    )}
                    <Icon className={cn("w-3.5 h-3.5 transition-colors", isActive ? "text-[var(--accent)]" : "text-[var(--muted)]")} />
                    <span>{t.label}</span>
                    {t.count !== null && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded-full text-[9px] font-mono tabular-nums transition-colors",
                          isActive
                            ? "bg-[var(--accent)]/15 text-[var(--accent)] font-bold"
                            : "bg-black/5 dark:bg-white/5 text-[var(--muted)]"
                        )}
                      >
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isNode && nodeData ? (
            <InspectorNodeOverview
              nodeData={nodeData}
              nodePods={nodePods}
              onFilterPodsForNode={handleFilterPodsForNode}
              onInspectPod={openInspector}
              onViewAllPods={handleViewAllPods}
            />
          ) : (
            <>
              {isWorkload ? (
                <>
                  {activeTab === "overview" && (
                    <InspectorWorkloadOverview
                      currentResource={currentResource}
                      deployment={deploymentData}
                      replicaSet={replicaSetData}
                      onViewPods={handleViewPodsForWorkload}
                      onScale={handleScaleWorkload}
                      onRestart={
                        isDeployment ||
                        (isReplicaSet && Boolean(replicaSetData?.ownerDeployment))
                          ? handleRestartWorkload
                          : undefined
                      }
                      onDelete={handleDeleteWorkload}
                    />
                  )}

                  {activeTab === "conditions" && (
                    <InspectorWorkloadConditionsTab
                      conditions={workloadConditions}
                      kind={currentResource.kind}
                    />
                  )}
                </>
              ) : (
                <>
                  {activeTab === "overview" && (
                    <InspectorPodOverview
                      currentResource={currentResource}
                      podData={podData}
                      onOpenLogsModal={openLogsModal}
                      onOpenExecModal={openExecModal}
                    />
                  )}

                  {activeTab === "containers" && (
                    <InspectorContainersTab
                      currentResource={currentResource}
                      podData={podData}
                      onOpenLogsModal={openLogsModal}
                      onOpenExecModal={openExecModal}
                    />
                  )}

                  {activeTab === "conditions" && (
                    <InspectorConditionsTab
                      currentResource={currentResource}
                      podData={podData}
                    />
                  )}

                  {activeTab === "events" && (
                    <InspectorEventsTab
                      events={liveEvents}
                      isLoading={isLoadingEvents}
                    />
                  )}
                </>
              )}

              {activeTab === "yaml" && (
                <InspectorYamlTab
                  yaml={liveYaml}
                  isLoading={isLoadingYaml}
                  onCopy={copyYaml}
                  onDownload={downloadYaml}
                  onRetry={handleReloadYaml}
                  copiedYaml={copiedYaml}
                  resourceName={currentResource?.name}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
