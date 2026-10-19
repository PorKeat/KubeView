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
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  List,
  Grid,
  FileCode,
  Globe,
  Eye,
  EyeOff,
  Network,
  Key,
  Folder,
} from "lucide-react";
import { useClusterStore, SelectedResource } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import type { PodSummary, PodEventItem, NodeSummary, ContainerEnvVar } from "@kubeview/contracts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Split label pill component with copy support
function LabelPill({ labelKey, value }: { labelKey: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  const slashIndex = labelKey.lastIndexOf("/");
  const prefix = slashIndex !== -1 ? labelKey.substring(0, slashIndex + 1) : "";
  const name = slashIndex !== -1 ? labelKey.substring(slashIndex + 1) : labelKey;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${labelKey}=${value}`);
    setCopied(true);
    toast.success(`Copied: ${labelKey}=${value}`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={handleCopy}
      title={`Click to copy: ${labelKey}=${value}`}
      className="group inline-flex items-center text-[10px] font-mono rounded-lg border border-[var(--border)] bg-[var(--surface-active)] hover:border-[var(--accent)]/50 transition-all cursor-pointer overflow-hidden shadow-2xs max-w-full"
    >
      <div className="px-2 py-1 flex items-center gap-0.5 border-r border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] min-w-0 truncate">
        {prefix && (
          <span className="text-[var(--muted)]/60 text-[9px] truncate max-w-[120px]">
            {prefix}
          </span>
        )}
        <span className="font-semibold text-[var(--foreground)]">{name}</span>
      </div>
      <div className="px-2 py-1 font-mono text-[var(--foreground)] bg-black/[0.04] dark:bg-white/[0.05] truncate max-w-[200px] flex items-center gap-1.5">
        <span className="truncate">{value}</span>
        {copied ? (
          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
        ) : (
          <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
        )}
      </div>
    </div>
  );
}

// Container Environment Variables Inspector Section
function ContainerEnvSection({ env }: { env: ContainerEnvVar[] }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showValues, setShowValues] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = search
    ? env.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          (e.value && e.value.toLowerCase().includes(search.toLowerCase())) ||
          (e.valueFrom && e.valueFrom.toLowerCase().includes(search.toLowerCase()))
      )
    : env;

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-black/[0.01] dark:bg-white/[0.01]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold text-[11px] text-[var(--foreground)]">Environment Variables</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
            {env.length}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[var(--muted)]">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-[var(--border)] space-y-2.5 bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search env variables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-lg text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
              />
            </div>
            <button
              onClick={() => setShowValues(!showValues)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono transition-colors cursor-pointer shrink-0",
                showValues
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
              title={showValues ? "Mask sensitive values" : "Reveal all values"}
            >
              {showValues ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showValues ? "Mask" : "Reveal"}</span>
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] font-mono text-[10px]">
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const isSecret = Boolean(item.valueFrom && item.valueFrom.startsWith("Secret:"));
                const displayVal = showValues
                  ? item.value || (item.valueFrom ? item.valueFrom : "")
                  : isSecret || !item.value
                  ? "••••••••"
                  : item.value.length > 35
                  ? item.value.slice(0, 35) + "..."
                  : item.value;

                return (
                  <div key={item.name} className="p-2 flex items-start justify-between gap-2 hover:bg-[var(--surface-hover)] group">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[var(--foreground)] select-all">{item.name}</span>
                        {item.valueFrom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
                            {item.valueFrom}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] select-all break-all">
                        {displayVal}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const copyText = `${item.name}=${item.value || item.valueFrom || ""}`;
                        navigator.clipboard.writeText(copyText);
                        toast.success(`Copied ${item.name}`);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer shrink-0"
                      title="Copy KEY=VALUE"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-[var(--muted)] text-[10px]">
                No environment variables match &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
    getPodEvents,
  } = useClusterStore();

  const [activeTab, setActiveTab] = React.useState<"overview" | "containers" | "conditions" | "events" | "yaml">("overview");
  const [copiedTitle, setCopiedTitle] = React.useState(false);
  const [copiedYaml, setCopiedYaml] = React.useState(false);
  const [labelFilter, setLabelFilter] = React.useState("");
  const [labelViewMode, setLabelViewMode] = React.useState<"chips" | "table">("chips");
  const [showAnnotations, setShowAnnotations] = React.useState(false);
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

  // Distinguish between Pod and Node resources
  const isNode = currentResource?.kind === "Node";
  const podData = !isNode ? (currentResource?.data as unknown as PodSummary | undefined) : undefined;
  const nodeData = isNode ? (currentResource?.data as unknown as NodeSummary | undefined) : undefined;

  // Load real YAML when YAML tab is active (Pods only)
  React.useEffect(() => {
    if (isInspectorOpen && currentResource && activeTab === "yaml" && !isNode) {
      setIsLoadingYaml(true);
      getPodYaml(currentResource.name, currentResource.namespace)
        .then((yamlStr) => {
          setLiveYaml(yamlStr || "# No YAML returned from cluster");
        })
        .catch((err) => {
          setLiveYaml(`# Error loading manifest: ${err?.message || err}`);
        })
        .finally(() => setIsLoadingYaml(false));
    }
  }, [isInspectorOpen, currentResource?.name, currentResource?.namespace, activeTab, getPodYaml, isNode]);

  // Load real Events when events tab is active (Pods only)
  React.useEffect(() => {
    if (isInspectorOpen && currentResource && activeTab === "events" && !isNode) {
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
  }, [isInspectorOpen, currentResource?.name, currentResource?.namespace, activeTab, getPodEvents, isNode]);

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

  const handleCopyTitle = () => {
    if (!currentResource) return;
    navigator.clipboard.writeText(currentResource.name);
    setCopiedTitle(true);
    toast.success(`Copied: ${currentResource.name}`);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

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

  // Status Badge consistent with ResourceListView
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Running":
      case "Active":
      case "Ready":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {status}
          </span>
        );
      case "Pending":
      case "ContainerCreating":
      case "Terminating":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping motion-reduce:animate-none" />
            {status}
          </span>
        );
      case "Completed":
      case "Succeeded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-black/[0.04] dark:bg-white/[0.06] text-[var(--muted)] border border-[var(--border)] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse motion-reduce:animate-none" />
            {status}
          </span>
        );
    }
  };

  // Filtered labels
  const rawLabels = podData?.labels || {};
  const labelEntries = Object.entries(rawLabels);
  const filteredLabels = labelEntries.filter(([k, v]) => {
    if (!labelFilter.trim()) return true;
    const query = labelFilter.toLowerCase();
    return k.toLowerCase().includes(query) || v.toLowerCase().includes(query);
  });

  // Annotations
  const rawAnnotations = podData?.annotations || {};
  const annotationEntries = Object.entries(rawAnnotations);

  // Controlled By parsing
  const controlledByStr = podData?.controlledBy;
  let controllerKind = "";
  let controllerName = "";
  if (controlledByStr) {
    const slash = controlledByStr.indexOf("/");
    if (slash !== -1) {
      controllerKind = controlledByStr.substring(0, slash);
      controllerName = controlledByStr.substring(slash + 1);
    } else {
      controllerName = controlledByStr;
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 overflow-hidden transition-all duration-200 motion-reduce:transition-none",
        isMounted ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Modal Backdrop / Dim Overlay with natural opacity transition */}
      <div
        data-testid="resource-inspector-backdrop"
        onClick={closeInspector}
        className={cn(
          "fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity motion-reduce:transition-none cursor-pointer",
          isMounted ? "opacity-100 duration-250 ease-out" : "opacity-0 duration-200 ease-in"
        )}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer with animate skill rules: 250ms natural deceleration curve (no bounce), 200ms exit */}
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
      <div className="h-16 border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-black/40">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="p-2.5 rounded-xl bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] shrink-0">
            {isNode ? <Server className="w-5 h-5 text-[var(--accent)]" /> : <Box className="w-5 h-5 text-[var(--accent)]" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                onClick={handleCopyTitle}
                title={`Click to copy: ${currentResource.name}`}
                className="text-xs font-bold text-[var(--foreground)] truncate font-mono hover:text-[var(--accent)] cursor-pointer transition-colors max-w-[280px] sm:max-w-[340px]"
              >
                {currentResource.name}
              </span>
              <button
                onClick={handleCopyTitle}
                className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
                title="Copy Full Name"
              >
                {copiedTitle ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
              {renderStatusBadge(currentResource.status)}
            </div>

            {/* Semantic Micro-Badges Subheader */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--muted)] mt-1 font-mono">
              <span className="px-1.5 py-0.2 rounded font-semibold bg-black/5 dark:bg-white/5 text-[var(--foreground)] border border-[var(--border)]">
                {currentResource.kind}
              </span>
              <span>•</span>
              {isNode ? (
                <>
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
                  <div className="flex items-center gap-1">
                    <span>ns:</span>
                    <strong className="text-[var(--foreground)]">{currentResource.namespace}</strong>
                  </div>
                  {podData?.nodeName && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span>node:</span>
                        <strong className="text-[var(--foreground)]">{podData.nodeName}</strong>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-1 shrink-0 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-[var(--border)]">
          {!isNode ? (
            <>
              {/* View Logs */}
              <button
                onClick={() => openLogsModal({ name: currentResource.name, namespace: currentResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title="View Real-Time Logs"
              >
                <FileText className="w-4 h-4" />
              </button>

              {/* Exec Shell */}
              <button
                onClick={() => openExecModal({ name: currentResource.name, namespace: currentResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title="Interactive Exec Shell"
              >
                <Terminal className="w-4 h-4" />
              </button>

              {/* Restart */}
              <button
                onClick={() => openRestartConfirm({ name: currentResource.name, namespace: currentResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title="Restart Pod"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Delete */}
              <button
                onClick={() => openDeleteConfirm({ name: currentResource.name, namespace: currentResource.namespace })}
                className="p-1.5 rounded-lg hover:bg-rose-500/15 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
                title="Delete Pod"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentResource.name);
                toast.success(`Node name copied: ${currentResource.name}`);
              }}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="Copy Node Name"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          <div className="h-4 w-[1px] bg-[var(--border)] mx-0.5" />

          {/* Close */}
          <button
            onClick={closeInspector}
            data-testid="inspector-close-btn"
            aria-label="Close drawer (Escape)"
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Segmented Tabs Bar (Pods Only) */}
      {!isNode && (
        <div className="h-10 border-b border-[var(--border)] px-4 flex items-center gap-1.5 bg-[var(--surface)] shrink-0">
          {(
            [
              { id: "overview", label: "Overview", count: null },
              { id: "containers", label: "Containers", count: podData?.containers?.length || 0 },
              { id: "conditions", label: "Conditions", count: podData?.conditions?.length || 0 },
              { id: "events", label: "Events", count: liveEvents.length > 0 ? liveEvents.length : null },
              { id: "yaml", label: "YAML", count: null },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              data-testid={`inspector-tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "px-3 py-1 text-xs rounded-lg capitalize transition-all font-medium cursor-pointer flex items-center gap-1.5",
                activeTab === t.id
                  ? "bg-[var(--surface-active)] text-[#F08A42] font-semibold border border-[var(--border)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              )}
            >
              <span>{t.label}</span>
              {t.count !== null && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[9px] font-mono",
                    activeTab === t.id
                      ? "bg-[#F08A42]/15 text-[#F08A42]"
                      : "bg-black/5 dark:bg-white/5 text-[var(--muted)]"
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isNode && nodeData ? (
          <div className="space-y-4 text-xs">
            {/* Node Specifications */}
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
              <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block font-mono">
                Node Specification & Status
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--muted)] block text-[10px] font-mono">Role</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {(() => {
                      const rolesList = Array.isArray(nodeData.roles)
                        ? nodeData.roles
                        : typeof nodeData.roles === "string"
                        ? (nodeData.roles as string).split(",").map((r) => r.trim()).filter(Boolean)
                        : [];
                      return rolesList.length > 0 ? (
                        rolesList.map((role: string) => (
                          <span key={role} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)]">
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)]">
                          worker
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px] font-mono">Kubelet Version</span>
                  <span className="font-mono text-[var(--foreground)] font-medium">
                    {nodeData.version || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px] font-mono">Internal IP</span>
                  <span className="font-mono text-[var(--foreground)] font-medium">
                    {nodeData.internalIP || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)] block text-[10px] font-mono">Architecture</span>
                  <span className="font-mono text-[var(--foreground)] font-medium">
                    {nodeData.architecture || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Real Resource Allocations Telemetry (Calm, Unified Semantic Palette) */}
            {(() => {
              const cpuNum = typeof nodeData.cpuPercent === "number"
                ? nodeData.cpuPercent
                : parseFloat(String(nodeData.cpuPercent)) || 0;
              const memNum = typeof nodeData.memoryPercent === "number"
                ? nodeData.memoryPercent
                : parseFloat(String(nodeData.memoryPercent)) || 0;
              const podCap = nodeData.podCapacity || 110;
              const podNum = Math.round(((nodeData.activePods || 0) / podCap) * 100);

              const getGaugeColor = (pct: number) => {
                if (pct >= 90) return "bg-rose-500 dark:bg-rose-400";
                if (pct >= 70) return "bg-amber-500 dark:bg-amber-400";
                return "bg-emerald-500 dark:bg-emerald-400";
              };

              const getTextColor = (pct: number) => {
                if (pct >= 90) return "text-rose-600 dark:text-rose-400";
                if (pct >= 70) return "text-amber-600 dark:text-amber-400";
                return "text-[var(--foreground)]";
              };

              const cleanAlloc = (val: string | undefined) => {
                if (!val) return "0";
                return val.replace(/\s*\(\d+%\)/, "");
              };

              return (
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block font-mono">
                    Resource Allocations
                  </span>

                  {/* CPU Allocation */}
                  <div className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-[var(--muted)]" aria-hidden="true" />
                        <span>CPU Requested</span>
                      </span>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-[var(--foreground)] tabular-nums">{cleanAlloc(nodeData.cpuAllocated)}</span>
                        <span className="text-[var(--muted)]">/ {nodeData.cpuCapacity}</span>
                        <span className={cn("font-semibold text-xs ml-1.5", getTextColor(cpuNum))}>
                          {cpuNum}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                          getGaugeColor(cpuNum)
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, cpuNum))}%` }}
                      />
                    </div>
                  </div>

                  {/* Memory Allocation */}
                  <div className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[var(--muted)]" aria-hidden="true" />
                        <span>Memory Requested</span>
                      </span>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-[var(--foreground)] tabular-nums">{cleanAlloc(nodeData.memoryAllocated)}</span>
                        <span className="text-[var(--muted)]">/ {nodeData.memoryCapacity}</span>
                        <span className={cn("font-semibold text-xs ml-1.5", getTextColor(memNum))}>
                          {memNum}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                          getGaugeColor(memNum)
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, memNum))}%` }}
                      />
                    </div>
                  </div>

                  {/* Pod Density */}
                  <div className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-[var(--muted)]" aria-hidden="true" />
                        <span>Pod Density</span>
                      </span>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-[var(--foreground)] tabular-nums">{nodeData.activePods}</span>
                        <span className="text-[var(--muted)]">/ {podCap}</span>
                        <span className={cn("font-semibold text-xs ml-1.5", getTextColor(podNum))}>
                          {podNum}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                          getGaugeColor(podNum)
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, podNum))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* View Pods on this Node Button (Calm, structured action button) */}
            <button
              type="button"
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
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-[var(--foreground)] font-medium text-xs transition-colors cursor-pointer active:scale-[0.985] motion-reduce:transition-none motion-reduce:transform-none"
            >
              <Box className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <span>Browse All Pods Across Cluster</span>
            </button>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="space-y-4 text-xs">
                {/* Meta Key-Value Grid */}
                <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#F08A42]" /> Resource Metadata
                    </span>
                    <span className="text-[10px] font-mono text-[var(--muted)]">
                      {podData?.creationTimestamp ? new Date(podData.creationTimestamp).toLocaleString() : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Node */}
                    <div className="group/node">
                      <span className="text-[var(--muted)] block text-[10px]">Node</span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-mono text-[var(--foreground)] font-medium truncate">
                          {podData?.nodeName || "Pending placement"}
                        </span>
                        {podData?.nodeName && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(podData.nodeName);
                              toast.success(`Node name copied: ${podData.nodeName}`);
                            }}
                            className="opacity-0 group-hover/node:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer"
                            title="Copy Node Name"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pod IP */}
                    <div className="group/ip">
                      <span className="text-[var(--muted)] block text-[10px]">Pod IP</span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-mono text-[var(--foreground)] font-medium">
                          {podData?.ip || "-"}
                        </span>
                        {podData?.ip && podData.ip !== "-" && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(podData.ip);
                              toast.success(`Pod IP copied: ${podData.ip}`);
                            }}
                            className="opacity-0 group-hover/ip:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer"
                            title="Copy Pod IP"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Restarts */}
                    <div>
                      <span className="text-[var(--muted)] block text-[10px]">Restarts</span>
                      <div className="mt-0.5">
                        {(podData?.restarts ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            {podData?.restarts} restarts
                          </span>
                        ) : (
                          <span className="font-mono text-[var(--foreground)] font-medium">0</span>
                        )}
                      </div>
                    </div>

                    {/* Created / Age */}
                    <div>
                      <span className="text-[var(--muted)] block text-[10px]">Created / Age</span>
                      <div className="mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--muted)]" />
                        <span className="font-mono text-[var(--foreground)] font-medium">
                          {podData?.age ? `${podData.age} ago` : "-"}
                        </span>
                      </div>
                    </div>

                    {/* QoS Class */}
                    {podData?.qosClass && (
                      <div>
                        <span className="text-[var(--muted)] block text-[10px]">QoS Class</span>
                        <div className="mt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-black/5 dark:bg-white/5 text-[var(--foreground)] border border-[var(--border)]">
                            {podData.qosClass}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Controlled By Controller */}
                    {controlledByStr && (
                      <div className="col-span-2 pt-1 border-t border-[var(--border)]">
                        <span className="text-[var(--muted)] block text-[10px] mb-1">Controlled By</span>
                        <div className="flex items-center gap-2">
                          {controllerKind && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F08A42]/15 text-[#F08A42] border border-[#F08A42]/25 font-mono">
                              {controllerKind}
                            </span>
                          )}
                          <span className="font-mono text-xs font-medium text-[var(--foreground)] truncate flex-1" title={controlledByStr}>
                            {controllerName}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(controlledByStr);
                              toast.success("Controller copied to clipboard");
                            }}
                            className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded transition-colors cursor-pointer"
                            title="Copy Controller"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resource Telemetry Quick Strip */}
                  {(podData?.cpu || podData?.memory || podData?.ready) && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]">
                      <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
                        <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Ready
                        </span>
                        <span className="font-mono font-semibold text-xs text-[var(--foreground)] mt-0.5 block">
                          {podData?.ready || "-"}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
                        <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-[var(--accent)]" /> CPU
                        </span>
                        <span className="font-mono font-semibold text-xs text-[var(--foreground)] mt-0.5 block">
                          {podData?.cpu || "-"}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
                        <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                          <Activity className="w-3 h-3 text-blue-500" /> Memory
                        </span>
                        <span className="font-mono font-semibold text-xs text-[var(--foreground)] mt-0.5 block">
                          {podData?.memory || "-"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Labels Card */}
                {labelEntries.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                        <Tag className="w-3.5 h-3.5 text-[#F08A42]" />
                        <span>Labels</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                          {labelEntries.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Search Input for Labels */}
                        {labelEntries.length > 3 && (
                          <div className="relative">
                            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                            <input
                              type="text"
                              value={labelFilter}
                              onChange={(e) => setLabelFilter(e.target.value)}
                              placeholder="Filter labels..."
                              className="w-28 sm:w-36 h-6 pl-6 pr-2 text-[10px] rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] outline-hidden focus:border-[var(--accent)] transition-colors font-mono"
                            />
                          </div>
                        )}

                        {/* View Mode Toggle */}
                        <div className="flex items-center border border-[var(--border)] rounded-lg p-0.5 bg-black/[0.02] dark:bg-white/[0.02]">
                          <button
                            onClick={() => setLabelViewMode("chips")}
                            className={cn(
                              "p-1 rounded cursor-pointer transition-colors",
                              labelViewMode === "chips" ? "bg-[var(--surface-active)] text-[#F08A42]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                            title="Chips View"
                          >
                            <Grid className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setLabelViewMode("table")}
                            className={cn(
                              "p-1 rounded cursor-pointer transition-colors",
                              labelViewMode === "table" ? "bg-[var(--surface-active)] text-[#F08A42]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                            title="Table View"
                          >
                            <List className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Copy All */}
                        <button
                          onClick={() => {
                            const yamlLabels = Object.entries(rawLabels)
                              .map(([k, v]) => `  ${k}: "${v}"`)
                              .join("\n");
                            navigator.clipboard.writeText(`labels:\n${yamlLabels}`);
                            toast.success("All labels copied to clipboard");
                          }}
                          className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                          title="Copy All Labels"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Chips View */}
                    {labelViewMode === "chips" ? (
                      <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto pr-1">
                        {filteredLabels.length > 0 ? (
                          filteredLabels.map(([k, v]) => (
                            <LabelPill key={k} labelKey={k} value={v} />
                          ))
                        ) : (
                          <div className="text-[11px] text-[var(--muted)] py-2">
                            No labels match &ldquo;{labelFilter}&rdquo;
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Table View */
                      <div className="border border-[var(--border)] rounded-xl overflow-hidden max-h-64 overflow-y-auto font-mono text-[10px]">
                        <table className="w-full text-left">
                          <thead className="bg-black/5 dark:bg-white/5 border-b border-[var(--border)] text-[var(--muted)]">
                            <tr>
                              <th className="px-2.5 py-1.5 font-semibold">Key</th>
                              <th className="px-2.5 py-1.5 font-semibold">Value</th>
                              <th className="px-2 py-1.5 text-right w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {filteredLabels.map(([k, v]) => (
                              <tr key={k} className="hover:bg-[var(--surface-hover)] transition-colors group">
                                <td className="px-2.5 py-1.5 text-[var(--foreground)] font-semibold truncate max-w-[180px]">
                                  {k}
                                </td>
                                <td className="px-2.5 py-1.5 text-[var(--muted)] truncate max-w-[200px]">
                                  {v}
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${k}=${v}`);
                                      toast.success(`Copied: ${k}=${v}`);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity"
                                    title="Copy Label"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Annotations Section */}
                {annotationEntries.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2 shadow-2xs">
                    <button
                      onClick={() => setShowAnnotations(!showAnnotations)}
                      className="w-full flex items-center justify-between text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-[#F08A42]" />
                        <span>Annotations</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                          {annotationEntries.length}
                        </span>
                      </div>
                      {showAnnotations ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)]" />
                      )}
                    </button>

                    {showAnnotations && (
                      <div className="pt-2 space-y-1.5 border-t border-[var(--border)] max-h-56 overflow-y-auto font-mono text-[10px]">
                        {annotationEntries.map(([k, v]) => (
                          <div
                            key={k}
                            className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] flex items-start justify-between gap-2 group"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-[var(--foreground)] block truncate">{k}</span>
                              <span className="text-[var(--muted)] block truncate text-[9px] mt-0.5">{v}</span>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${k}=${v}`);
                                toast.success(`Copied annotation: ${k}`);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer shrink-0"
                              title="Copy Annotation"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Status Incident Warning */}
                {currentResource.status !== "Running" && currentResource.status !== "Completed" && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Status: {currentResource.status}</span>
                    </div>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                      Pod state is currently not in steady running phase. Open the logs or events tab for root-cause diagnosis.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Containers Tab */}
            {activeTab === "containers" && (
              <div className="space-y-3 text-xs">
                {podData?.containers && podData.containers.length > 0 ? (
                  podData.containers.map((c) => (
                    <div key={c.name} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-[#F08A42]" />
                          <span className="font-semibold text-[var(--foreground)] font-mono text-xs">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border",
                              c.ready
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", c.ready ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-amber-500 animate-ping")} />
                            {c.ready ? "Ready" : "Not Ready"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                            {c.state}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-[var(--muted)] space-y-2 font-mono bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-xl border border-[var(--border)]">
                        <div className="flex items-center justify-between group/img">
                          <span className="text-[var(--muted)]">Image:</span>
                          <div className="flex items-center gap-1.5 max-w-[70%]">
                            <span className="text-[var(--foreground)] truncate font-mono text-[10px]" title={c.image}>
                              {c.image}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(c.image);
                                toast.success("Image copied to clipboard");
                              }}
                              className="opacity-0 group-hover/img:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer"
                              title="Copy Image"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {c.stateReason && (
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--muted)]">State Reason:</span>
                            <span className="text-amber-500 font-medium">{c.stateReason}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-[var(--muted)]">Restarts:</span>
                          <span className={cn(c.restartCount > 0 ? "text-amber-500 font-bold" : "text-[var(--foreground)]")}>
                            {c.restartCount}
                          </span>
                        </div>
                      </div>

                      {/* Ports */}
                      {c.ports && c.ports.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-[var(--muted)] font-mono block">Exposed Ports:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {c.ports.map((p, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              >
                                <Network className="w-3 h-3 text-blue-500" />
                                {p.name ? `${p.name}: ` : ""}{p.containerPort}/{p.protocol || "TCP"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resources Requests & Limits */}
                      {c.resources && (c.resources.requests || c.resources.limits) && (
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono p-2.5 rounded-xl border border-[var(--border)] bg-black/[0.01] dark:bg-white/[0.01]">
                          <div>
                            <span className="text-[var(--muted)] block text-[9px]">Requests:</span>
                            <span className="text-[var(--foreground)] font-semibold">
                              CPU: {c.resources.requests?.cpu || "-"}, Mem: {c.resources.requests?.memory || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[var(--muted)] block text-[9px]">Limits:</span>
                            <span className="text-[var(--foreground)] font-semibold">
                              CPU: {c.resources.limits?.cpu || "-"}, Mem: {c.resources.limits?.memory || "-"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Volume Mounts */}
                      {c.volumeMounts && c.volumeMounts.length > 0 && (
                        <div className="border border-[var(--border)] rounded-xl p-2.5 bg-black/[0.01] dark:bg-white/[0.01] space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--foreground)]">
                            <Folder className="w-3 h-3 text-[var(--muted)]" />
                            <span>Volume Mounts ({c.volumeMounts.length})</span>
                          </div>
                          <div className="space-y-1 max-h-28 overflow-y-auto font-mono text-[10px]">
                            {c.volumeMounts.map((vm, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[var(--muted)] hover:text-[var(--foreground)] gap-2">
                                <span className="truncate max-w-[160px]" title={vm.name}>{vm.name}</span>
                                <span className="text-[var(--foreground)] truncate max-w-[180px] select-all text-right font-medium" title={vm.mountPath}>
                                  {vm.mountPath}
                                  {vm.readOnly && <span className="ml-1 text-[9px] text-amber-500 font-normal">(ro)</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Environment Variables */}
                      {c.env && c.env.length > 0 && (
                        <ContainerEnvSection env={c.env} />
                      )}

                      {/* Direct container actions */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border)]">
                        <button
                          onClick={() => openLogsModal({ name: currentResource.name, namespace: currentResource.namespace, container: c.name })}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#F08A42]" />
                          <span>Container Logs</span>
                        </button>
                        <button
                          onClick={() => openExecModal({ name: currentResource.name, namespace: currentResource.namespace, container: c.name })}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
                        >
                          <Terminal className="w-3.5 h-3.5 text-[#F08A42]" />
                          <span>Exec Shell</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[var(--muted)]">No container details available</div>
                )}
              </div>
            )}

            {/* Conditions Tab */}
            {activeTab === "conditions" && (
              <div className="space-y-2.5 text-xs">
                {(podData?.conditions && podData.conditions.length > 0
                  ? podData.conditions
                  : [
                      { type: "PodScheduled", status: "True", reason: "PodScheduled", message: "All pods have been placed on an active cluster worker node", lastTransitionTime: "" },
                      { type: "Initialized", status: "True", reason: "PodInitialized", message: "All init containers have executed and exited cleanly", lastTransitionTime: "" },
                      { type: "ContainersReady", status: currentResource.status === "Running" ? "True" : "False", reason: currentResource.status, message: "All primary application containers in the pod are ready", lastTransitionTime: "" },
                      { type: "Ready", status: currentResource.status === "Running" ? "True" : "False", reason: currentResource.status, message: "Pod is capable of serving ingress traffic and endpoints", lastTransitionTime: "" },
                    ]
                ).map((c) => {
                  const isOk = c.status === "True";
                  return (
                    <div key={c.type} className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-start justify-between gap-3 shadow-2xs">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isOk ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                          <span className="font-semibold text-[var(--foreground)] font-mono text-xs">{c.type}</span>
                          {c.reason && (
                            <span className="text-[10px] font-mono text-[var(--muted)] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)]">
                              {c.reason}
                            </span>
                          )}
                        </div>
                        {c.message && (
                          <p className="text-[11px] text-[var(--muted)] pl-6 leading-relaxed font-mono break-all">{c.message}</p>
                        )}
                        {c.lastTransitionTime && (
                          <span className="text-[9px] text-[var(--muted)]/70 pl-6 block font-mono">
                            Transitioned: {new Date(c.lastTransitionTime).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono border shrink-0",
                        isOk ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25" : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25"
                      )}>
                        {c.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Events Tab */}
            {activeTab === "events" && (
              <div className="space-y-2.5 text-xs">
                {isLoadingEvents ? (
                  <div className="p-8 flex items-center justify-center text-[var(--muted)] gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-[#F08A42]" />
                    <span>Loading pod events...</span>
                  </div>
                ) : liveEvents.length === 0 ? (
                  <div className="p-8 text-center text-[var(--muted)] text-xs border border-dashed border-[var(--border)] rounded-2xl">
                    No recent events recorded for this pod.
                  </div>
                ) : (
                  liveEvents.map((e, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          e.type === "Normal" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                          {e.reason}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] font-mono">{e.lastTimestamp}</span>
                      </div>
                      <p className="text-[11px] text-[var(--foreground)] font-mono leading-relaxed">{e.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* YAML Tab */}
            {activeTab === "yaml" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-mono text-[var(--muted)]">Live Kubernetes YAML Definition</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={downloadYaml}
                      disabled={isLoadingYaml}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={copyYaml}
                      disabled={isLoadingYaml}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[#F08A42] hover:bg-[#d97530] text-white font-medium transition-colors cursor-pointer shadow-xs"
                    >
                      {copiedYaml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedYaml ? "Copied" : "Copy YAML"}</span>
                    </button>
                  </div>
                </div>

                {isLoadingYaml ? (
                  <div className="h-64 flex items-center justify-center text-[var(--muted)] gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-[#F08A42]" />
                    <span>Fetching live object from cluster...</span>
                  </div>
                ) : (
                  <pre className="p-4 rounded-2xl bg-slate-950 border border-[var(--border)] text-[11px] font-mono text-emerald-400 dark:text-emerald-300/90 overflow-x-auto leading-relaxed select-text shadow-inner max-h-[65vh]">
                    {liveYaml}
                  </pre>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </div>
);
}
