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

function extractPodName(msg: string, source: string): string | null {
  if (!msg) return null;
  const match1 = msg.match(/pod\s+["']?([a-zA-Z0-9_.-]+)["']?/i);
  if (match1 && match1[1] && !match1[1].includes("/")) return match1[1];
  const match2 = msg.match(/pod\/([a-zA-Z0-9_.-]+)/i);
  if (match2 && match2[1]) return match2[1];
  if (source && source.startsWith("pod/")) return source.replace("pod/", "");
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
                ev.message?.toLowerCase().includes("backoff");

              const detectedPod = extractPodName(ev.message, ev.source);

              let formattedTime = ev.lastTimestamp || "";
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
                  className="py-2.5 px-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer select-none space-y-1 group/ev focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          isSevere ? "bg-rose-500" : "bg-amber-400"
                        )}
                      />
                      <span
                        className={cn(
                          "font-mono font-semibold text-xs tracking-tight",
                          isSevere
                            ? "text-rose-500 dark:text-rose-400"
                            : "text-amber-500 dark:text-amber-400"
                        )}
                      >
                        {ev.reason}
                      </span>
                      {detectedPod && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/[0.04] dark:bg-white/[0.05] border border-[var(--border)]/60 text-[var(--muted)] group-hover/ev:text-[var(--foreground)] transition-colors truncate max-w-[140px]">
                          pod/{detectedPod}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-[var(--muted)]">
                      <span className="tabular-nums">{formattedTime}</span>
                      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--accent)] opacity-0 group-hover/ev:opacity-100 transition-opacity duration-150">
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" aria-hidden="true" />
                      </span>
                    </div>
                  </div>

                  <p
                    className="text-xs text-[var(--muted)] group-hover/ev:text-[var(--foreground)] transition-colors duration-150 font-mono line-clamp-1 pl-3.5"
                    title={ev.message}
                  >
                    {ev.message}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--muted)] pl-3.5 pt-0.5">
                    <span>Source: {ev.source || "kubelet"}</span>
                    {ev.count > 1 && (
                      <span className="tabular-nums text-[var(--muted)] font-medium">
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
