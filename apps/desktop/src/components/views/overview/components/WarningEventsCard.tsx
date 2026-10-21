"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ArrowRight,
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

        <div className="space-y-2 overflow-y-auto min-h-[175px] max-h-[235px] pr-1.5 scrollbar-thin">
          {events.length === 0 ? (
            <div className="h-full min-h-[175px] flex flex-col items-center justify-center text-center text-xs text-[var(--muted)] gap-2 py-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <span className="font-semibold text-xs text-[var(--foreground)]">
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
                  className={cn(
                    "p-3 rounded-xl border transition-all duration-150 cursor-pointer select-none space-y-1.5 group/ev",
                    "bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
                    isSevere
                      ? "border-rose-500/20 hover:border-rose-500/50 hover:shadow-[0_2px_12px_rgba(244,63,94,0.08)]"
                      : "border-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_2px_12px_rgba(245,158,11,0.08)]",
                    "hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  )}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex h-2 w-2 shrink-0">
                        {isSevere && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-40" />
                        )}
                        <span
                          className={cn(
                            "relative inline-flex rounded-full h-2 w-2",
                            isSevere
                              ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]"
                              : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]",
                          )}
                        />
                      </span>
                      <span
                        className={cn(
                          "font-mono font-bold text-xs tracking-tight",
                          isSevere
                            ? "text-rose-600 dark:text-rose-400 group-hover/ev:text-rose-500 dark:group-hover/ev:text-rose-300"
                            : "text-amber-600 dark:text-amber-400 group-hover/ev:text-amber-500 dark:group-hover/ev:text-amber-300",
                        )}
                      >
                        {ev.reason}
                      </span>
                      {detectedPod && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--border)] text-[var(--foreground)] group-hover/ev:border-[var(--accent)]/40 group-hover/ev:text-[var(--accent)] transition-colors truncate max-w-[150px]">
                          pod/{detectedPod}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-[var(--muted)]">
                      <span className="tabular-nums group-hover/ev:text-[var(--foreground)]/70 transition-colors">
                        {formattedTime}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--accent)] opacity-0 group-hover/ev:opacity-100 transition-all duration-150 transform translate-x-1 group-hover/ev:translate-x-0">
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                  <p
                    className="text-xs text-[var(--foreground)]/80 dark:text-[var(--foreground)]/85 font-mono line-clamp-1 pl-4 group-hover/ev:text-[var(--foreground)] transition-colors leading-relaxed"
                    title={ev.message}
                  >
                    {ev.message}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--muted)] pl-4 pt-1 border-t border-[var(--border)]/40">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider opacity-60">Source:</span>
                      <span className="text-[var(--foreground)]/80 font-medium">{ev.source || "kubelet"}</span>
                    </span>
                    {ev.count > 1 ? (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-semibold border",
                          isSevere
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                        )}
                      >
                        Occurred {ev.count} times
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]">1st occurrence</span>
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
