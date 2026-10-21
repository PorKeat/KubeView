"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PodEventItem } from "@kubeview/contracts";

export interface WarningEventsCardProps {
  warningEvents: PodEventItem[] | undefined;
  isNamespaceScoped: boolean;
  currentNamespace: string;
  availableNamespacesCount: number;
  onOpenPodsView: () => void;
  onTriageEvent?: (event: PodEventItem, targetPod?: string) => void;
}

export function extractPodName(ev: PodEventItem): string | null {
  if (!ev) return null;

  // 1. Direct involvedObject metadata from engine/K8s
  if (ev.involvedObjectKind === "Pod" && ev.involvedObjectName) {
    return ev.involvedObjectName;
  }
  if (
    ev.involvedObjectName &&
    (!ev.involvedObjectKind || ev.involvedObjectKind.toLowerCase() === "pod")
  ) {
    return ev.involvedObjectName;
  }

  // 2. Pattern matching in event message
  const msg = ev.message || "";
  const match1 = msg.match(/(?:in\s+pod|pod)\s+["']?([a-zA-Z0-9_.-]+)["']?/i);
  if (match1 && match1[1] && !match1[1].includes("/")) return match1[1];

  const match2 = msg.match(/pod\/([a-zA-Z0-9_.-]+)/i);
  if (match2 && match2[1]) return match2[1];

  const match3 = msg.match(/Pod:\s*([a-zA-Z0-9_.-]+)/i);
  if (match3 && match3[1]) return match3[1];

  // 3. Fallback to source component
  if (ev.source && ev.source.startsWith("pod/")) {
    return ev.source.replace("pod/", "");
  }

  // 4. Fallback to involvedObjectName even if kind not populated
  if (ev.involvedObjectName) {
    return ev.involvedObjectName;
  }

  return null;
}

export function WarningEventsCard({
  warningEvents,
  isNamespaceScoped,
  currentNamespace,
  availableNamespacesCount,
  onOpenPodsView,
  onTriageEvent,
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
            {events.length} Active
            {isNamespaceScoped ? ` in ${currentNamespace}` : ""}
          </span>
        </div>

        <div className="divide-y divide-[var(--border)]/50 overflow-y-auto min-h-[175px] max-h-[230px] pr-1 scrollbar-thin">
          {events.length === 0 ? (
            <div className="h-full min-h-[175px] flex flex-col items-center justify-center text-center text-xs text-[var(--muted)] gap-2 py-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-medium text-xs text-[var(--foreground)]">
                {isNamespaceScoped
                  ? `No Warnings in ${currentNamespace}`
                  : "Cluster Operating Normally"}
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
                ev.message?.toLowerCase().includes("backoff") ||
                ev.reason?.toLowerCase().includes("crash");

              const detectedPod = extractPodName(ev);

              let formattedTime = ev.lastTimestamp || "";
              if (ev.lastTimestamp) {
                try {
                  const d = new Date(ev.lastTimestamp);
                  if (!isNaN(d.getTime())) {
                    formattedTime = d.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });
                  }
                } catch {
                  // Fallback to raw timestamp
                }
              }

              return (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (onTriageEvent) {
                      onTriageEvent(ev, detectedPod || undefined);
                    } else {
                      onOpenPodsView();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (onTriageEvent) {
                        onTriageEvent(ev, detectedPod || undefined);
                      } else {
                        onOpenPodsView();
                      }
                    }
                  }}
                  className="py-2.5 px-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer select-none space-y-1.5 group/ev focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                >
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          isSevere ? "bg-rose-500" : "bg-amber-400"
                        )}
                      />
                      <span
                        className={cn(
                          "font-mono font-semibold text-xs tracking-tight shrink-0",
                          isSevere
                            ? "text-rose-500 dark:text-rose-400"
                            : "text-amber-500 dark:text-amber-400"
                        )}
                      >
                        {ev.reason}
                      </span>
                      {detectedPod && (
                        <span
                          title={`Pod: ${detectedPod}`}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/25 truncate max-w-[150px]"
                        >
                          pod/{detectedPod}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center shrink-0 font-mono text-xs select-none">
                      <span className="text-xs font-mono tabular-nums text-zinc-400 dark:text-zinc-500 group-hover/ev:text-zinc-500 dark:group-hover/ev:text-zinc-400 transition-colors">
                        {formattedTime}
                      </span>
                      <div className="grid grid-cols-[0fr] group-hover/ev:grid-cols-[1fr] transition-all duration-200 ease-out motion-reduce:transition-none">
                        <div className="overflow-hidden">
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--accent)] pl-2 opacity-0 group-hover/ev:opacity-100 translate-x-1.5 group-hover/ev:translate-x-0 transition-all duration-200 ease-out whitespace-nowrap motion-reduce:translate-x-0">
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p
                    className="text-xs font-mono text-zinc-700 dark:text-zinc-200 group-hover/ev:text-zinc-950 dark:group-hover/ev:text-white transition-colors duration-150 line-clamp-1 pl-3.5 leading-relaxed"
                    title={ev.message}
                  >
                    {ev.message}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono pl-3.5 pt-0.5">
                    <span className="text-zinc-400 dark:text-zinc-500">
                      Source:{" "}
                      <span className="font-medium text-zinc-600 dark:text-zinc-300">
                        {ev.source || "kubelet"}
                      </span>
                    </span>
                    {ev.count > 1 && (
                      <span
                        className={cn(
                          "tabular-nums font-semibold",
                          isSevere
                            ? "text-rose-600/90 dark:text-rose-400/90"
                            : "text-amber-600/90 dark:text-amber-400/90"
                        )}
                      >
                        Occurred {ev.count} times
                      </span>
                    )}
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
          aria-label={
            isNamespaceScoped
              ? `View ${currentNamespace} pods explorer`
              : "View pods explorer"
          }
          className="text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1 font-medium text-xs transition-colors duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded focus-visible:outline-hidden"
        >
          <span>
            View{" "}
            {isNamespaceScoped ? `${currentNamespace} Pods` : "Pods Explorer"}
          </span>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </SpotlightCard>
  );
}
