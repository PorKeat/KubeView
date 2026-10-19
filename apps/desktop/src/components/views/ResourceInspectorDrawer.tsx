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
} from "lucide-react";
import { useClusterStore, SelectedResource } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InspectorSkeleton, NotFoundState } from "@/components/ui";

export function ResourceInspectorDrawer() {
  const { isInspectorOpen, selectedResource, closeInspector } = useClusterStore();
  const [activeTab, setActiveTab] = React.useState<"overview" | "containers" | "conditions" | "events" | "yaml">("overview");
  const [copied, setCopied] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Trigger brief shimmer loading on resource inspection
  React.useEffect(() => {
    if (isInspectorOpen && selectedResource) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isInspectorOpen, selectedResource?.name, selectedResource?.namespace]);

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

  if (selectedResource.status === "NotFound") {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl glass-panel border-l border-white/10 shadow-2xl flex flex-col select-none animate-in slide-in-from-right duration-200 backdrop-blur-xl">
        <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between shrink-0 bg-black/30">
          <span className="text-xs font-semibold text-[var(--foreground)] font-mono">Resource Not Found</span>
          <button onClick={closeInspector} className="p-1.5 rounded-lg hover:bg-white/[0.08] text-[var(--muted)] hover:text-white transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <NotFoundState
          resourceKind={selectedResource.kind}
          resourceName={selectedResource.name}
          message="This resource was terminated or no longer exists in the current namespace."
        />
      </div>
    );
  }

  const mockYaml = `apiVersion: v1
kind: ${selectedResource.kind}
metadata:
  name: ${selectedResource.name}
  namespace: ${selectedResource.namespace}
  creationTimestamp: "2026-10-18T19:30:00Z"
  labels:
    app.kubernetes.io/name: ${selectedResource.name.split("-")[0]}
    app.kubernetes.io/instance: prod-cluster
    app.kubernetes.io/managed-by: kubeview
    environment: ${selectedResource.namespace}
spec:
  containers:
  - name: main-app
    image: ghcr.io/cloud-native/${selectedResource.name.split("-")[0]}:v2.1.0
    imagePullPolicy: IfNotPresent
    ports:
    - containerPort: 8080
      name: http
      protocol: TCP
    resources:
      limits:
        cpu: 500m
        memory: 512Mi
      requests:
        cpu: 100m
        memory: 128Mi
status:
  phase: ${selectedResource.status}
  hostIP: 192.168.1.100
  podIP: 10.244.0.24
  startTime: "2026-10-18T19:30:05Z"`;

  const copyYaml = () => {
    navigator.clipboard.writeText(mockYaml);
    setCopied(true);
    toast.success("YAML copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Running":
      case "Active":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "CrashLoopBackOff":
      case "Failed":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "Pending":
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
            <Box className="w-4 h-4" />
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
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] mt-0.5">
              <span>{selectedResource.kind}</span>
              <span>•</span>
              <span>ns: <strong className="font-mono text-[var(--foreground)]">{selectedResource.namespace}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => toast.success(`Streaming logs from ${selectedResource.name}...`)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="View Logs"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => toast.success(`Opening terminal session into ${selectedResource.name}...`)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Terminal Exec"
          >
            <Terminal className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => {
                setIsLoading(false);
                toast.success(`Refreshed ${selectedResource.name}`);
              }, 350);
            }}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Refresh Resource Details"
          >
            <RotateCw className={cn("w-4 h-4", isLoading && "animate-spin text-[var(--accent)]")} />
          </button>
          <div className="h-4 w-[1px] bg-[var(--border)] mx-1" />
          <button
            onClick={closeInspector}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="h-9 border-b border-[var(--border)] px-3 flex items-center gap-1 bg-[var(--surface)] shrink-0">
        {(["overview", "containers", "conditions", "events", "yaml"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1 text-xs rounded-md capitalize transition-colors font-medium",
              activeTab === tab
                ? "bg-[var(--surface-active)] text-[var(--accent)] font-semibold"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content or Loading Skeleton */}
      {isLoading ? (
        <InspectorSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "overview" && (
          <div className="space-y-4 text-xs">
            {/* Meta Key-Value Grid */}
            <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-2">
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-2">
                Resource Metadata
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Node</span>
                  <span className="font-mono text-[var(--foreground)] font-medium">kind-control-plane</span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Pod IP</span>
                  <span className="font-mono text-[var(--foreground)] font-medium">10.244.0.24</span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">QoS Class</span>
                  <span className="font-mono text-[var(--foreground)] font-medium">Burstable</span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px]">Start Time</span>
                  <span className="font-mono text-[var(--foreground)] font-medium">Today at 19:30 UTC</span>
                </div>
              </div>
            </div>

            {/* Labels Chips */}
            <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Labels</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["app=api-gateway", "tier=backend", "version=v2.1", "managed-by=kubeview"].map((label) => (
                  <span
                    key={label}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-active)] text-[var(--foreground)] border border-[var(--border)]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Warning Message Box if degraded */}
            {selectedResource.status === "CrashLoopBackOff" && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>CrashLoopBackOff Detected</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Back-off restarting failed container. Exit Code: 137 (OOMKilled or SIGKILL). Check container memory limits.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "containers" && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-[var(--accent)]" />
                  <span className="font-semibold text-[var(--foreground)] font-mono">main-app</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Ready (1/1)
                </span>
              </div>
              <div className="text-[11px] text-[var(--muted)] space-y-1 font-mono">
                <div>Image: <span className="text-[var(--foreground)]">ghcr.io/cloud-native/app:v2.1.0</span></div>
                <div>Ports: <span className="text-[var(--foreground)]">8080/TCP (http)</span></div>
                <div>Restarts: <span className="text-[var(--foreground)]">0</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "conditions" && (
          <div className="space-y-2 text-xs">
            {[
              { type: "PodScheduled", status: "True", reason: "Scheduled", age: "4h ago" },
              { type: "Initialized", status: "True", reason: "PodCompleted", age: "4h ago" },
              { type: "ContainersReady", status: selectedResource.status === "Running" ? "True" : "False", reason: "Ready", age: "2m ago" },
              { type: "Ready", status: selectedResource.status === "Running" ? "True" : "False", reason: "Ready", age: "2m ago" },
            ].map((c) => (
              <div key={c.type} className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[var(--foreground)] block font-mono">{c.type}</span>
                  <span className="text-[10px] text-[var(--muted)]">{c.reason} • {c.age}</span>
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
            {[
              { type: "Normal", reason: "Pulled", message: "Container image already present on machine", age: "4h ago" },
              { type: "Normal", reason: "Created", message: "Created container main-app", age: "4h ago" },
              { type: "Normal", reason: "Started", message: "Started container main-app", age: "4h ago" },
              { type: "Warning", reason: "Unhealthy", message: "Readiness probe failed: HTTP 503", age: "12m ago" },
            ].map((e, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "font-semibold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
                    e.type === "Normal" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {e.reason}
                  </span>
                  <span className="text-[10px] text-[var(--muted)] font-mono">{e.age}</span>
                </div>
                <p className="text-[11px] text-[var(--foreground)]">{e.message}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "yaml" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[10px] font-mono text-[var(--muted)]">Resource Manifest (Live YAML)</span>
              <button
                onClick={copyYaml}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy YAML"}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-900 dark:bg-black/60 border border-[var(--border)] text-[11px] font-mono text-emerald-400 dark:text-emerald-300/90 overflow-x-auto leading-relaxed select-text shadow-inner">
              {mockYaml}
            </pre>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
