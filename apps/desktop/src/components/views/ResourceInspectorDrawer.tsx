"use client";

import * as React from "react";
import {
  X,
  Terminal,
  FileText,
  Copy,
  Trash2,
  RotateCw,
  ExternalLink,
  Check,
  AlertTriangle,
  Layers,
  Box,
  Cpu,
  Clock,
  Shield,
  Tag,
  Code,
  Download,
  Server,
  Activity,
  HardDrive,
} from "lucide-react";
import { useClusterStore, SelectedResource } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import type { PodSummary, PodEventItem, NodeSummary } from "@kubeview/contracts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InspectorSkeleton, NotFoundState } from "@/components/ui";

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
    getPodEvents,
  } = useClusterStore();

  const [activeTab, setActiveTab] = React.useState<"overview" | "containers" | "conditions" | "events" | "yaml">("overview");
  const [copied, setCopied] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [liveYaml, setLiveYaml] = React.useState<string>("");
  const [liveEvents, setLiveEvents] = React.useState<PodEventItem[]>([]);
  const [isLoadingYaml, setIsLoadingYaml] = React.useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = React.useState(false);

  // Distinguish between Pod and Node resources
  const isNode = selectedResource?.kind === "Node";
  const podData = !isNode ? (selectedResource?.data as unknown as PodSummary | undefined) : undefined;
  const nodeData = isNode ? (selectedResource?.data as unknown as NodeSummary | undefined) : undefined;

  // Load real YAML when YAML tab is active (Pods only)
  React.useEffect(() => {
    if (isInspectorOpen && selectedResource && activeTab === "yaml" && !isNode) {
      setIsLoadingYaml(true);
      getPodYaml(selectedResource.name, selectedResource.namespace)
        .then((yamlStr) => {
          setLiveYaml(yamlStr || "# No YAML returned from cluster");
        })
        .catch((err) => {
          setLiveYaml(`# Error loading manifest: ${err?.message || err}`);
        })
        .finally(() => setIsLoadingYaml(false));
    }
  }, [isInspectorOpen, selectedResource?.name, selectedResource?.namespace, activeTab, getPodYaml, isNode]);

  // Load real Events when events tab is active (Pods only)
  React.useEffect(() => {
    if (isInspectorOpen && selectedResource && activeTab === "events" && !isNode) {
      setIsLoadingEvents(true);
      getPodEvents(selectedResource.name, selectedResource.namespace)
        .then((evList) => {
          setLiveEvents(evList || []);
        })
        .catch(() => {
          setLiveEvents([]);
        })
        .finally(() => setIsLoadingEvents(false));
    }
  }, [isInspectorOpen, selectedResource?.name, selectedResource?.namespace, activeTab, getPodEvents, isNode]);

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

  if (!isInspectorOpen || !selectedResource) return null;

  const copyYaml = () => {
    navigator.clipboard.writeText(liveYaml);
    setCopied(true);
    toast.success("YAML copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadYaml = () => {
    const blob = new Blob([liveYaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedResource.name}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("YAML manifest downloaded");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Running":
      case "Active":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "CrashLoopBackOff":
      case "Failed":
      case "Error":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "Pending":
      case "ContainerCreating":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default:
        return "bg-[var(--surface-hover)] text-[var(--muted)] border-[var(--border)]";
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl glass-panel border-l border-[var(--border)] shadow-2xl flex flex-col select-none animate-in slide-in-from-right duration-200 backdrop-blur-xl">
      {/* Top Header */}
      <div className="h-14 border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-black/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20 shadow-xs">
            {isNode ? <Server className="w-4 h-4" /> : <Box className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--foreground)] truncate font-mono">
                {selectedResource.name}
              </span>
              <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-full border shadow-xs", getStatusColor(selectedResource.status))}>
                {selectedResource.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] mt-0.5 font-mono">
              <span>{selectedResource.kind}</span>
              {isNode ? (
                <>
                  <span>•</span>
                  <span>IP: <strong className="text-[var(--foreground)]">{nodeData?.internalIP || "-"}</strong></span>
                  {nodeData?.architecture && (
                    <>
                      <span>•</span>
                      <span>Arch: <strong className="text-[var(--foreground)]">{nodeData.architecture}</strong></span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span>•</span>
                  <span>ns: <strong className="text-[var(--foreground)]">{selectedResource.namespace}</strong></span>
                  {podData?.nodeName && (
                    <>
                      <span>•</span>
                      <span>node: <strong className="text-[var(--foreground)]">{podData.nodeName}</strong></span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {!isNode ? (
            <>
              {/* View Logs */}
              <button
                onClick={() => openLogsModal({ name: selectedResource.name, namespace: selectedResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title="View Real-Time Logs"
              >
                <FileText className="w-4 h-4" />
              </button>

              {/* Exec Shell */}
              <button
                onClick={() => openExecModal({ name: selectedResource.name, namespace: selectedResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title="Interactive Exec Shell"
              >
                <Terminal className="w-4 h-4" />
              </button>

              {/* Restart */}
              <button
                onClick={() => openRestartConfirm({ name: selectedResource.name, namespace: selectedResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title="Restart Pod"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Delete */}
              <button
                onClick={() => openDeleteConfirm({ name: selectedResource.name, namespace: selectedResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-rose-500/15 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
                title="Delete Pod"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedResource.name);
                toast.success(`Node name copied: ${selectedResource.name}`);
              }}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="Copy Node Name"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          <div className="h-4 w-[1px] bg-[var(--border)] mx-1" />

          {/* Close */}
          <button
            onClick={closeInspector}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Bar (Pods Only) */}
      {!isNode && (
        <div className="h-9 border-b border-[var(--border)] px-3 flex items-center gap-1 bg-[var(--surface)] shrink-0">
          {(["overview", "containers", "conditions", "events", "yaml"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1 text-xs rounded-md capitalize transition-colors font-medium cursor-pointer",
                activeTab === tab
                  ? "bg-[var(--surface-active)] text-[var(--accent)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isNode && nodeData ? (
          <div className="space-y-4 text-xs">
            {/* Node Specifications */}
            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                Node Specification & Status
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Role</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {nodeData.roles && nodeData.roles.length > 0 ? (
                      nodeData.roles.map((role) => (
                        <span key={role} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-active)] text-[var(--foreground)] border border-[var(--border)]">
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="font-mono text-[var(--foreground)]">worker</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Kubelet Version</span>
                  <span className="font-mono text-[var(--foreground)] font-medium">
                    {nodeData.version || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Internal IP</span>
                  <span className="font-mono text-[var(--foreground)] font-medium">
                    {nodeData.internalIP || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Architecture</span>
                  <span className="font-mono text-[var(--foreground)] font-medium">
                    {nodeData.architecture || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Real Resource Allocations Telemetry */}
            <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                Resource Allocations
              </span>

              {/* CPU Allocation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" /> CPU Requested
                  </span>
                  <span className="font-mono text-[var(--muted)] text-[11px]">
                    {nodeData.cpuAllocated || "0"} / {nodeData.cpuCapacity} ({nodeData.cpuPercent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-hover)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      nodeData.cpuPercent >= 90
                        ? "bg-rose-500"
                        : nodeData.cpuPercent >= 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, nodeData.cpuPercent))}%` }}
                  />
                </div>
              </div>

              {/* Memory Allocation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-400" /> Memory Requested
                  </span>
                  <span className="font-mono text-[var(--muted)] text-[11px]">
                    {nodeData.memoryAllocated || "0"} / {nodeData.memoryCapacity} ({nodeData.memoryPercent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-hover)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      nodeData.memoryPercent >= 90
                        ? "bg-rose-500"
                        : nodeData.memoryPercent >= 70
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, nodeData.memoryPercent))}%` }}
                  />
                </div>
              </div>

              {/* Pod Density */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-purple-400" /> Pod Density
                  </span>
                  <span className="font-mono text-[var(--muted)] text-[11px]">
                    {nodeData.activePods} / {nodeData.podCapacity || 110} (
                    {Math.round((nodeData.activePods / (nodeData.podCapacity || 110)) * 100)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-hover)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, Math.round((nodeData.activePods / (nodeData.podCapacity || 110)) * 100))
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* View Pods on this Node Button */}
            <button
              onClick={() => {
                useClusterStore.getState().setCurrentNamespace("all");
                useClusterStore.getState().loadPods("all");
                useTabStore.getState().openTab({
                  id: "pods",
                  title: "Pods",
                  icon: "Box",
                  closable: true,
                });
                closeInspector();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Box className="w-4 h-4" />
              <span>Browse All Pods Across Cluster</span>
            </button>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="space-y-4 text-xs">
                {/* Meta Key-Value Grid */}
                <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
                  <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-2">
                    Resource Metadata
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[var(--muted)] block text-[10px]">Node</span>
                      <span className="font-mono text-[var(--foreground)] font-medium">
                        {podData?.nodeName || "Pending placement"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block text-[10px]">Pod IP</span>
                      <span className="font-mono text-[var(--foreground)] font-medium">
                        {podData?.ip || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block text-[10px]">Restarts</span>
                      <span className="font-mono text-[var(--foreground)] font-medium">
                        {podData?.restarts ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block text-[10px]">Created / Age</span>
                      <span className="font-mono text-[var(--foreground)] font-medium">
                        {podData?.age ? `${podData.age} ago` : "-"}
                      </span>
                    </div>
                    {podData?.controlledBy && (
                      <div className="col-span-2">
                        <span className="text-[var(--muted)] block text-[10px]">Controlled By</span>
                        <span className="font-mono text-[var(--accent)] font-medium">
                          {podData.controlledBy}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Labels */}
                {podData?.labels && Object.keys(podData.labels).length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Labels</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(podData.labels).map(([k, v]) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-active)] text-[var(--foreground)] border border-[var(--border)]"
                        >
                          {k}={v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Incident Warning */}
                {selectedResource.status !== "Running" && selectedResource.status !== "Completed" && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Status: {selectedResource.status}</span>
                    </div>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                      Pod state is currently not in steady running phase. Open the logs or events tab for root-cause diagnosis.
                    </p>
                  </div>
                )}
              </div>
            )}

        {activeTab === "containers" && (
          <div className="space-y-3 text-xs">
            {podData?.containers && podData.containers.length > 0 ? (
              podData.containers.map((c) => (
                <div key={c.name} className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-[var(--accent)]" />
                      <span className="font-semibold text-[var(--foreground)] font-mono">{c.name}</span>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium border",
                        c.ready ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      )}
                    >
                      {c.ready ? "Ready" : "Not Ready"}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--muted)] space-y-1 font-mono">
                    <div className="truncate">Image: <span className="text-[var(--foreground)]">{c.image}</span></div>
                    <div>State: <span className="text-[var(--foreground)] font-semibold">{c.state}</span> {c.stateReason && `(${c.stateReason})`}</div>
                    <div>Restarts: <span className="text-[var(--foreground)]">{c.restartCount}</span></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-[var(--muted)]">No container details available</div>
            )}
          </div>
        )}

        {activeTab === "conditions" && (
          <div className="space-y-2 text-xs">
            {[
              { type: "PodScheduled", status: "True", reason: "Pod Scheduled to Node" },
              { type: "Initialized", status: "True", reason: "Init Containers Complete" },
              { type: "ContainersReady", status: selectedResource.status === "Running" ? "True" : "False", reason: selectedResource.status },
              { type: "Ready", status: selectedResource.status === "Running" ? "True" : "False", reason: selectedResource.status },
            ].map((c) => (
              <div key={c.type} className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[var(--foreground)] block font-mono">{c.type}</span>
                  <span className="text-[10px] text-[var(--muted)]">{c.reason}</span>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-medium font-mono border",
                  c.status === "True" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                )}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "events" && (
          <div className="space-y-2 text-xs">
            {isLoadingEvents ? (
              <div className="p-6 flex items-center justify-center text-[var(--muted)] gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                <span>Loading pod events...</span>
              </div>
            ) : liveEvents.length === 0 ? (
              <div className="p-6 text-center text-[var(--muted)] text-xs">
                No recent events recorded for this pod.
              </div>
            ) : (
              liveEvents.map((e, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "font-semibold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
                      e.type === "Normal" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}>
                      {e.reason}
                    </span>
                    <span className="text-[10px] text-[var(--muted)] font-mono">{e.lastTimestamp}</span>
                  </div>
                  <p className="text-[11px] text-[var(--foreground)]">{e.message}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "yaml" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-mono text-[var(--muted)]">Live Kubernetes YAML Definition</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={downloadYaml}
                  disabled={isLoadingYaml}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={copyYaml}
                  disabled={isLoadingYaml}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy YAML"}</span>
                </button>
              </div>
            </div>

            {isLoadingYaml ? (
              <div className="h-48 flex items-center justify-center text-[var(--muted)] gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                <span>Fetching live object from cluster...</span>
              </div>
            ) : (
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-[var(--border)] text-[11px] font-mono text-emerald-400 dark:text-emerald-300/90 overflow-x-auto leading-relaxed select-text shadow-inner max-h-[60vh]">
                {liveYaml}
              </pre>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
