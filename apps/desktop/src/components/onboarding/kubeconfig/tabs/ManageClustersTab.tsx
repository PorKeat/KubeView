"use client";

import * as React from "react";
import { Server, Check, SlidersHorizontal, Trash2, Plus } from "lucide-react";
import type { ClusterContextInfo } from "@/stores/clusterStore";
import { isInternalEndpoint } from "@/lib/endpointUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getProviderBadge } from "../types";

export interface ManageClustersTabProps {
  availableContexts: ClusterContextInfo[];
  currentContext: string | null;
  switchContext: (name: string) => Promise<void>;
  deleteContext: (name: string) => Promise<void>;
  clearAllContexts: () => Promise<void>;
  openEndpointModal: (name: string, server: string) => void;
  setActiveTab: (tab: "auto" | "browse" | "paste" | "manage") => void;
}

export function ManageClustersTab({
  availableContexts,
  currentContext,
  switchContext,
  deleteContext,
  clearAllContexts,
  openEndpointModal,
  setActiveTab,
}: ManageClustersTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span>Available Contexts in KubeView</span>
        <span className="font-mono text-[11px]">
          {availableContexts.length} total
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
        {availableContexts.map((ctx) => {
          const isSelected = ctx.name === currentContext;
          const isInternal = isInternalEndpoint(ctx.server);
          return (
            <div
              key={ctx.name}
              onClick={() => {
                if (!isSelected) {
                  switchContext(ctx.name);
                  toast.info(`Switched active context to: ${ctx.name}`);
                }
              }}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                isSelected
                  ? "bg-[#F08A42]/10 border-[#F08A42]/40 shadow-xs"
                  : "bg-black/[0.02] dark:bg-white/[0.02] border-[var(--border)] hover:border-black/20 dark:hover:border-white/20 hover:bg-[var(--surface-hover)]",
              )}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                    isSelected
                      ? "bg-[#F08A42]/20 text-[#F08A42] border-[#F08A42]/40"
                      : "bg-black/5 dark:bg-white/5 text-[var(--muted)] border-[var(--border)]",
                  )}
                >
                  <Server className="w-4 h-4" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                      {ctx.name}
                    </span>
                    {getProviderBadge(ctx.provider)}
                    {isSelected && (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono font-medium rounded-full bg-[#F08A42]/20 text-[#F08A42] border border-[#F08A42]/30">
                        ACTIVE
                      </span>
                    )}
                    {isInternal && (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono font-medium rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                        INTERNAL HOST
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--muted)] font-mono truncate block mt-0.5">
                    {ctx.server}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isSelected ? (
                  <div className="flex items-center gap-1.5 text-xs text-[#F08A42] font-medium">
                    <Check className="w-4 h-4" />
                    <span>Current</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="px-2.5 py-1 text-xs rounded-lg bg-[var(--surface-active)] text-[var(--muted)] group-hover:text-[var(--foreground)] group-hover:border-black/20 dark:group-hover:border-white/20 border border-[var(--border)] transition-colors cursor-pointer"
                  >
                    Connect
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEndpointModal(ctx.name, ctx.server);
                  }}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  title="Configure API Server IP / Endpoint"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        `Remove cluster context '${ctx.name}' from KubeView?`,
                      )
                    ) {
                      deleteContext(ctx.name);
                      toast.success(`Removed context '${ctx.name}'`);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
                  title="Remove this context"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {availableContexts.length === 0 && (
          <div className="text-center py-8 text-xs text-[var(--muted)]">
            No cluster contexts configured yet. Import your first kubeconfig
            using the tabs above.
          </div>
        )}
      </div>

      {/* Add More Contexts Trigger Button & Reset Button */}
      <div className="pt-2 border-t border-[var(--border)] space-y-2">
        <button
          onClick={() => setActiveTab("browse")}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[var(--border)] hover:border-black/30 dark:hover:border-white/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-all cursor-pointer font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Import More Kubeconfigs or Select a Folder</span>
        </button>

        {availableContexts.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to remove all clusters from KubeView and start completely clean?",
                )
              ) {
                clearAllContexts();
                toast.success(
                  "All cluster configs removed. Clean slate ready.",
                );
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-xs text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset All Clusters (Clean Slate)</span>
          </button>
        )}
      </div>
    </div>
  );
}
