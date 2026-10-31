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
      <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
        <span>Available contexts in KubeView</span>
        <span className="font-mono text-[10px] tabular-nums">
          {availableContexts.length} total
        </span>
      </div>

      <div className="max-h-80 divide-y divide-[var(--border)] overflow-y-auto border-y border-[var(--border)] pr-1">
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
                "group flex items-center justify-between gap-3 border-l-2 py-3 pl-3 pr-1 transition-colors",
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent)]/[0.04]"
                  : "cursor-pointer border-transparent hover:bg-[var(--surface-hover)]",
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Server
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isSelected ? "text-[var(--accent)]" : "text-[var(--muted)]",
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-[var(--foreground)]">
                      {ctx.name}
                    </span>
                    {getProviderBadge(ctx.provider)}
                    {isSelected && (
                      <span className="rounded-full bg-[var(--accent)]/15 px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--accent)]">
                        Active
                      </span>
                    )}
                    {isInternal && (
                      <span className="rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] text-amber-600 dark:text-amber-400">
                        Internal
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--muted)]">
                    {ctx.server}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {isSelected ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--accent)]">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Current
                  </span>
                ) : (
                  <button
                    type="button"
                    className="cursor-pointer rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors group-hover:bg-[var(--surface-hover)] group-hover:text-[var(--foreground)]"
                  >
                    Connect
                  </button>
                )}

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEndpointModal(ctx.name, ctx.server);
                  }}
                  className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                  title="Configure API server IP / endpoint"
                  aria-label={`Configure endpoint for ${ctx.name}`}
                >
                  <SlidersHorizontal
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (
                      confirm(
                        `Remove cluster context '${ctx.name}' from KubeView?`,
                      )
                    ) {
                      deleteContext(ctx.name);
                      toast.success(`Removed context '${ctx.name}'`);
                    }
                  }}
                  className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                  title="Remove this context"
                  aria-label={`Remove ${ctx.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}

        {availableContexts.length === 0 && (
          <div className="py-8 text-center text-[11px] text-[var(--muted)]">
            No cluster contexts configured yet. Import your first kubeconfig
            using the tabs above.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("browse")}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Import more kubeconfigs or select a folder
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
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-medium text-rose-500/80 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            Reset all clusters (clean slate)
          </button>
        )}
      </div>
    </div>
  );
}
