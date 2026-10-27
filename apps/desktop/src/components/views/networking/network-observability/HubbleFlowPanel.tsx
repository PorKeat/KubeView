"use client";

import { Activity, Network, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  StatusBeacon,
  type StatusBeaconVariant,
} from "@/components/ui";
import type { HubbleFlowSummary } from "@kubeview/contracts";

function verdictVariant(verdict: string): StatusBeaconVariant {
  if (verdict.includes("FORWARDED")) return "healthy";
  if (verdict.includes("DROPPED")) return "critical";
  return "muted";
}

export function HubbleFlowPanel({
  flows,
  isLoading,
  error,
  hubbleAvailable,
  onLoad,
  searching,
}: {
  flows: HubbleFlowSummary[];
  isLoading: boolean;
  error: string | null;
  hubbleAvailable: boolean;
  onLoad: () => void;
  searching: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--muted)]">
          <Network className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Latest flows via hubble-relay gRPC</span>
          {!hubbleAvailable && (
            <span className="text-amber-600 dark:text-amber-400">
              Hubble relay is not available
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onLoad}
          disabled={isLoading || !hubbleAvailable}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md transition-all disabled:opacity-50",
            hubbleAvailable
              ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] cursor-pointer"
              : "border border-[var(--border)] bg-black/5 text-[var(--muted)] dark:bg-white/5 cursor-not-allowed",
          )}
          data-testid="hubble-load-flows"
        >
          {isLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          {isLoading ? "Loading..." : "Load Flows"}
        </button>
      </div>

      {error && (
        <div className="m-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {flows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            variant="empty"
            title={searching ? "No flows match your search" : "No flows loaded"}
            description={
              searching
                ? "Clear the search to show all loaded Hubble flows."
                : "Load the most recent Hubble flows from the relay to inspect allowed and dropped traffic."
            }
            action={
              hubbleAvailable
                ? {
                    label: "Load Flows",
                    icon: <Activity className="w-3.5 h-3.5" />,
                    onClick: onLoad,
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div
          className="flex-1 overflow-auto min-h-0"
          data-testid="cilium-table-scroll"
        >
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)]">
              <tr className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8 whitespace-nowrap">
                <th className="w-[8%] py-1 px-2">Time</th>
                <th className="w-[12%] py-1 px-2">Verdict</th>
                <th className="w-[17%] py-1 px-2">Source</th>
                <th className="w-[17%] py-1 px-2">Destination</th>
                <th className="w-[8%] py-1 px-2">L4</th>
                <th className="w-[10%] py-1 px-2">Node</th>
                <th className="w-[28%] py-1 px-2">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {flows.map((flow, index) => (
                <tr
                  key={`${flow.time}-${index}`}
                  data-testid="cilium-flow-row"
                  className="h-9 hover:bg-[var(--surface-hover)] transition-colors"
                  title={flow.rawJson}
                >
                  <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)]">
                    {flow.time ? new Date(flow.time).toLocaleTimeString() : "—"}
                  </td>
                  <td className="py-1 px-3">
                    <StatusBeacon
                      variant={verdictVariant(flow.verdict)}
                      label={flow.verdict || "UNKNOWN"}
                      size="xs"
                    />
                  </td>
                  <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)] truncate max-w-[190px]">
                    {flow.sourceNamespace ? `${flow.sourceNamespace}/` : ""}
                    {flow.sourcePod || flow.sourceIp || "—"}
                  </td>
                  <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)] truncate max-w-[190px]">
                    {flow.destinationNamespace
                      ? `${flow.destinationNamespace}/`
                      : ""}
                    {flow.destinationPod || flow.destinationIp || "—"}
                  </td>
                  <td className="py-1 px-3 font-mono text-[10px]">
                    {flow.protocol
                      ? `${flow.protocol}/${flow.destinationPort || flow.sourcePort || "?"}`
                      : "—"}
                  </td>
                  <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)]">
                    {flow.nodeName || "—"}
                  </td>
                  <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)] truncate max-w-[280px]">
                    {flow.summary}
                    {flow.dropReason ? ` (${flow.dropReason})` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
