"use client";

import * as React from "react";
import {
  Server,
  ChevronDown,
  Check,
  Plus,
  Stethoscope,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useClusterStore, ClusterContextInfo } from "@/stores/clusterStore";
import { isInternalEndpoint } from "@/lib/endpointUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

interface ContextSwitcherDropdownProps {
  variant?: "default" | "unified";
  className?: string;
}

export function ContextSwitcherDropdown({
  variant = "default",
  className,
}: ContextSwitcherDropdownProps = {}) {
  const {
    currentContext,
    availableContexts,
    switchContext,
    diagnoseContext,
    connectionStatus,
    latencyMs,
    openKubeconfigModal,
    openEndpointModal,
    deleteContext,
  } = useClusterStore();
  const [search, setSearch] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click and Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const currentInfo = availableContexts.find((c) => c.name === currentContext) || {
    name: currentContext || "Select Cluster",
    cluster: currentContext || "none",
    server: "https://127.0.0.1:6443",
    provider: "generic" as const,
    status: connectionStatus,
    latencyMs,
  };

  const filteredContexts = availableContexts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.server.toLowerCase().includes(search.toLowerCase())
  );

  const getProviderBadge = (provider: ClusterContextInfo["provider"]) => {
    switch (provider) {
      case "kind":
        return (
          <span className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Kind
          </span>
        );
      case "eks":
        return (
          <span className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            EKS
          </span>
        );
      case "gke":
        return (
          <span className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            GKE
          </span>
        );
      case "aks":
        return (
          <span className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            AKS
          </span>
        );
      case "minikube":
        return (
          <span className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Minikube
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-black/[0.03] dark:bg-white/[0.05] text-[var(--muted)] border border-[var(--border)]">
            K8s
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        data-testid="context-switcher-trigger"
        aria-label={`Active Kubernetes cluster: ${currentContext || "Select Cluster"}, status ${connectionStatus}`}
        aria-expanded={isOpen}
        className={cn(
          "flex min-w-0 max-w-[170px] items-center gap-2 text-xs transition-colors text-[var(--foreground)] outline-hidden group select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden sm:max-w-none",
          variant === "default" &&
            "px-2.5 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-black/20 dark:hover:border-white/20",
          variant === "unified" &&
            "px-2.5 py-1.5 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/[0.06]",
          isOpen && variant === "unified" && "bg-black/[0.08] dark:bg-white/[0.1]",
          className
        )}
        title={`Active Context: ${currentContext || "None"} (${connectionStatus})`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Server className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors shrink-0" />
          <span className="font-semibold max-w-[90px] truncate sm:max-w-[130px]">{currentContext || "Select Cluster"}</span>
        </div>
        <span className="hidden sm:inline-flex">
          {getProviderBadge(currentInfo.provider)}
        </span>
        {latencyMs > 0 && (
          <span className="hidden sm:inline text-[11px] text-[var(--muted)] font-mono tabular-nums">({latencyMs}ms)</span>
        )}
        <ChevronDown
          className={cn(
            "w-3 h-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 30,
              mass: 0.8,
            }}
            style={{ transformOrigin: "top left" }}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-1.5 z-50 w-[360px] max-w-[calc(100vw-2rem)] p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl shadow-black/30 dark:shadow-black/70 backdrop-blur-xl outline-hidden select-none"
          >
            {/* Header & Quick Filter */}
            <div className="px-2 pt-1 pb-2 border-b border-[var(--border)] mb-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--foreground)] tracking-tight flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>Cluster Contexts</span>
                </span>
                <span className="text-[11px] text-[var(--muted)] font-mono tabular-nums">
                  {availableContexts.length} configured
                </span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const firstItem = listRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
                      firstItem?.focus();
                    } else if (e.key === "Enter" && filteredContexts.length > 0) {
                      e.preventDefault();
                      switchContext(filteredContexts[0].name);
                      toast.info(`Connecting to cluster: ${filteredContexts[0].name}...`);
                      setIsOpen(false);
                    }
                  }}
                  aria-label="Filter cluster contexts"
                  placeholder="Search cluster or endpoint..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-black/[0.025] dark:bg-white/[0.035] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)] focus-visible:ring-1 focus-visible:ring-[var(--accent)] font-mono transition-all"
                />
              </div>
            </div>

            {/* Contexts List */}
            <div ref={listRef} className="max-h-60 overflow-y-auto p-1 space-y-1" role="menu" aria-label="Available Clusters">
              {filteredContexts.map((ctx) => {
                const isSelected = ctx.name === currentContext;
                const isInternal = isInternalEndpoint(ctx.server);

                return (
                  <div
                    key={ctx.name}
                    role="menuitem"
                    tabIndex={0}
                    data-testid="context-item"
                    data-context-name={ctx.name}
                    onClick={() => {
                      switchContext(ctx.name);
                      toast.info(`Connecting to cluster: ${ctx.name}...`);
                      setIsOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        switchContext(ctx.name);
                        toast.info(`Connecting to cluster: ${ctx.name}...`);
                        setIsOpen(false);
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                        next?.focus();
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                        if (prev) {
                          prev.focus();
                        } else {
                          inputRef.current?.focus();
                        }
                      }
                    }}
                    className={cn(
                      "w-full text-left flex items-start justify-between p-2 rounded-lg transition-all text-xs font-mono group cursor-pointer outline-hidden select-none border focus-visible:ring-1 focus-visible:ring-[var(--accent)]",
                      isSelected
                        ? "bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10 text-[var(--foreground)] shadow-xs"
                        : "border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:border-[var(--border)] text-[var(--foreground)]"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("truncate font-medium", isSelected ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]")}>
                          {ctx.name}
                        </span>
                        {getProviderBadge(ctx.provider)}
                        {isInternal && (
                          <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            internal
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--muted)] font-mono truncate mt-0.5">
                        {ctx.server}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <Tooltip content="Configure endpoint IP / URL" side="left">
                        <button
                          type="button"
                          data-testid="configure-endpoint-btn"
                          aria-label={`Configure endpoint for ${ctx.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            setTimeout(() => {
                              openEndpointModal(ctx.name, ctx.server);
                            }, 50);
                          }}
                          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </Tooltip>

                      <Tooltip content="Remove this cluster" side="left">
                        <button
                          type="button"
                          data-testid="remove-cluster-btn"
                          aria-label={`Remove cluster ${ctx.name}`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            toast.info(`Removing ${ctx.name}...`);
                            await deleteContext(ctx.name);
                            toast.success(`Cluster removed: ${ctx.name}`);
                          }}
                          className="p-1 rounded hover:bg-rose-500/15 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </Tooltip>
                      {ctx.latencyMs > 0 && (
                        <span className="text-[10px] text-[var(--muted)] font-mono tabular-nums">
                          {ctx.latencyMs}ms
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" aria-hidden="true" />}
                    </div>
                  </div>
                );
              })}

              {filteredContexts.length === 0 && (
                <div className="py-6 text-center text-xs text-[var(--muted)]" role="status">
                  No matching clusters found.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-[var(--border)] pt-1.5 mt-1 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  openKubeconfigModal("browse");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[var(--foreground)] cursor-pointer outline-hidden select-none transition-colors group"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="font-medium">Import or Add Kubeconfig...</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsOpen(false);
                  toast.info("Running connection diagnostic probe...");
                  const res = await diagnoseContext();
                  if (res?.status === "connected") {
                    toast.success(`Connection verified! ${res.serverVersion} (${res.latencyMs}ms)`);
                  } else if (res?.status === "degraded") {
                    toast.warning("Cluster connected with restricted RBAC privileges.");
                  } else {
                    toast.error(`Connection failed: ${res?.remediation || "Check API endpoint"}`);
                  }
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer outline-hidden select-none transition-colors group"
              >
                <Stethoscope className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors" />
                <span>Diagnose Active Connection</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
