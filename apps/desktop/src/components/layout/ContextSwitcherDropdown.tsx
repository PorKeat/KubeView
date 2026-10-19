"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Server,
  ChevronDown,
  Check,
  Plus,
  Activity,
  ShieldAlert,
  Search,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useClusterStore, ClusterContextInfo } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ContextSwitcherDropdown() {
  const {
    currentContext,
    availableContexts,
    switchContext,
    diagnoseContext,
    connectionStatus,
    latencyMs,
    openKubeconfigModal,
  } = useClusterStore();
  const [search, setSearch] = React.useState("");

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
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">Kind</span>;
      case "eks":
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">AWS EKS</span>;
      case "gke":
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">GCP GKE</span>;
      case "aks":
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">Azure AKS</span>;
      case "minikube":
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">Minikube</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-[var(--surface-active)] text-[var(--foreground)] border border-[var(--border)]">K8s</span>;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-[var(--status-healthy)]";
      case "degraded":
        return "bg-[var(--status-warning)]";
      case "checking":
        return "bg-amber-400";
      case "offline":
      default:
        return "bg-rose-500";
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 px-2.5 py-1 text-xs rounded-md bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--accent)] transition-all text-[var(--foreground)] outline-hidden group select-none"
          title={`Active Context: ${currentContext || "None"} (${connectionStatus})`}
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              {connectionStatus === "checking" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              )}
              <span className={cn("relative inline-flex rounded-full h-2 w-2 transition-colors", getStatusColor())} />
            </span>
            <span className="font-semibold max-w-[130px] truncate">{currentContext || "Select Cluster"}</span>
          </div>
          {getProviderBadge(currentInfo.provider)}
          <span className="text-[10px] text-[var(--muted)] font-mono">({latencyMs}ms)</span>
          <ChevronDown className="w-3 h-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-transform duration-150" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="w-80 p-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 outline-hidden select-none"
        >
          {/* Header & Quick Filter */}
          <div className="p-2 border-b border-[var(--border)] mb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[var(--foreground)] uppercase tracking-wider">
                Cluster Contexts
              </span>
              <span className="text-[10px] text-[var(--muted)] font-mono">
                {availableContexts.length} configured
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cluster or endpoint..."
                className="w-full pl-7 pr-2.5 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Contexts List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filteredContexts.map((ctx) => {
              const isSelected = ctx.name === currentContext;

              return (
                <DropdownMenu.Item
                  key={ctx.name}
                  onSelect={() => {
                    switchContext(ctx.name);
                    toast.info(`Connecting to cluster: ${ctx.name}...`);
                  }}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md cursor-pointer outline-hidden transition-colors text-xs",
                    isSelected
                      ? "bg-[var(--surface-active)] text-[var(--accent)]"
                      : "hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                  )}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate">{ctx.name}</span>
                      {getProviderBadge(ctx.provider)}
                    </div>
                    <span className="text-[10px] text-[var(--muted)] font-mono truncate mt-0.5">
                      {ctx.server}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-[var(--muted)] font-mono">
                      {ctx.latencyMs > 0 ? `${ctx.latencyMs}ms` : ""}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-[var(--accent)]" />}
                  </div>
                </DropdownMenu.Item>
              );
            })}

            {filteredContexts.length === 0 && (
              <div className="py-4 text-center text-xs text-[var(--muted)]">
                No matching clusters found.
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="border-t border-[var(--border)] pt-1.5 mt-1 space-y-0.5">
            <DropdownMenu.Item
              onSelect={() => openKubeconfigModal("browse")}
              className="flex items-center justify-between p-1.5 text-xs rounded hover:bg-[var(--surface-hover)] text-[var(--foreground)] hover:text-[#F08A42] cursor-pointer outline-hidden select-none transition-colors"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-[#F08A42]" />
                <span className="font-medium">Import / Add Kubeconfig...</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F08A42]/10 text-[#F08A42] border border-[#F08A42]/20">
                + Add
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onSelect={async () => {
                toast.info("Running 4-stage connection diagnostic probe...");
                const res = await diagnoseContext();
                if (res?.status === "connected") {
                  toast.success(`Connection verified! ${res.serverVersion} (${res.latencyMs}ms)`);
                } else if (res?.status === "degraded") {
                  toast.warning("Cluster connected with restricted RBAC privileges.");
                } else {
                  toast.error(`Connection failed: ${res?.remediation || "Check API endpoint"}`);
                }
              }}
              className="flex items-center gap-2 p-1.5 text-xs rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer outline-hidden"
            >
              <Activity className="w-3.5 h-3.5 text-[var(--status-healthy)]" />
              <span>Diagnose Active Connection</span>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
