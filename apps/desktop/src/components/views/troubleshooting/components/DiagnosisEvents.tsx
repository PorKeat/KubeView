"use client";

import { Bell } from "lucide-react";
import type { PodEventItem } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";
import { statusMeta } from "../lib/diagnosis";

export function DiagnosisEvents({ events = [] }: { events?: PodEventItem[] }) {
  return (
    <section
      data-testid="pod-diagnosis-events"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)]">
        <Bell className="h-3.5 w-3.5 text-[var(--accent)]" />
        Kubernetes events
      </div>
      {events.length === 0 ? (
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          No recent pod events were returned.
        </p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {events.map((event, index) => {
            const status = statusMeta(
              event.type === "Warning" ? "warning" : "pass",
            );
            return (
              <div
                key={`${event.reason}-${event.lastTimestamp}-${index}`}
                className="min-w-0 rounded-md border border-[var(--border)]/70 bg-black/[0.02] px-2 py-1.5 dark:bg-black/20"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] font-semibold text-[var(--foreground)]">
                    {event.reason}
                  </span>
                  <StatusBeacon
                    size="xs"
                    variant={status.variant}
                    label={event.type}
                  />
                  <span className="ml-auto shrink-0 font-mono text-[8px] text-[var(--muted)]">
                    {event.count > 1 ? `×${event.count}` : event.lastTimestamp}
                  </span>
                </div>
                <p className="mt-0.5 break-words font-mono text-[9px] leading-relaxed text-[var(--muted)]">
                  {event.message}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
