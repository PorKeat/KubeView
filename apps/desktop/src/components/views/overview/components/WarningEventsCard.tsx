"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { SpotlightCard } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PodEventItem } from "@kubeview/contracts";

export interface WarningEventsCardProps {
  warningEvents: PodEventItem[] | undefined;
  isNamespaceScoped: boolean;
  currentNamespace: string;
  availableNamespacesCount: number;
  onOpenPodsView: () => void;
}

export function WarningEventsCard({
  warningEvents,
  isNamespaceScoped,
  currentNamespace,
  availableNamespacesCount,
  onOpenPodsView,
}: WarningEventsCardProps) {
  const events = warningEvents || [];

  return (
    <SpotlightCard className="p-5 flex flex-col justify-between h-full space-y-4">
      <div className="flex flex-col">
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]/70">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
              Warning Events & Incidents
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 tabular-nums">
            {events.length} Active{isNamespaceScoped ? ` in ${currentNamespace}` : ""}
          </span>
        </div>

        <div className="divide-y divide-[var(--border)]/60 overflow-y-auto min-h-[175px] max-h-[220px] pr-1">
          {events.length === 0 ? (
            <div className="h-full min-h-[175px] flex flex-col items-center justify-center text-center text-xs text-[var(--muted)] gap-2 py-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <span className="font-semibold text-xs text-[var(--foreground)]">
                {isNamespaceScoped ? `No Warnings in ${currentNamespace}` : "Cluster Operating Normally"}
              </span>
              <p className="text-xs text-[var(--muted)] max-w-xs">
                {isNamespaceScoped
                  ? `No active warning events found for namespace '${currentNamespace}'.`
                  : "No active warning events found across namespaces."}
              </p>
            </div>
          ) : (
            events.map((ev, idx) => {
              const isSevere =
                ev.reason?.toLowerCase().includes("fail") ||
                ev.message?.toLowerCase().includes("fail") ||
                ev.message?.toLowerCase().includes("backoff");

              let formattedTime = ev.lastTimestamp || "";
              try {
                const d = new Date(ev.lastTimestamp);
                if (!isNaN(d.getTime())) {
                  formattedTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                }
              } catch {
                // Fallback to raw timestamp
              }

              return (
                <div key={idx} className="py-2.5 first:pt-2 last:pb-1 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          isSevere ? "bg-rose-500" : "bg-amber-500"
                        )}
                      />
                      <span
                        className={cn(
                          "font-semibold text-xs",
                          isSevere ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {ev.reason}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--muted)] font-mono tabular-nums">{formattedTime}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] font-mono line-clamp-1 pl-3.5" title={ev.message}>
                    {ev.message}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-[var(--muted)] font-mono pl-3.5 pt-0.5">
                    <span>Source: {ev.source || "k8s-event"}</span>
                    {ev.count > 1 && <span className="tabular-nums">Occurred {ev.count} times</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-2.5 border-t border-[var(--border)]/60 text-xs text-[var(--muted)] flex items-center justify-between">
        <span className="tabular-nums font-mono text-xs">
          {isNamespaceScoped
            ? `Filtered to namespace: ${currentNamespace}`
            : `Aggregated across ${availableNamespacesCount} namespaces`}
        </span>
        <button
          onClick={onOpenPodsView}
          aria-label={isNamespaceScoped ? `View ${currentNamespace} pods explorer` : "View pods explorer"}
          className="text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1 font-medium text-xs transition-colors duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded focus-visible:outline-hidden"
        >
          <span>View {isNamespaceScoped ? `${currentNamespace} Pods` : "Pods Explorer"}</span>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </SpotlightCard>
  );
}
