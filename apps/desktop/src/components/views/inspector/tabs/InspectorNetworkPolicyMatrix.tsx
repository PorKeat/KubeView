"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  NetworkPolicyRuleDetail,
  NetworkPolicySummary,
} from "@kubeview/contracts";

type Direction = "ingress" | "egress";

export function InspectorNetworkPolicyMatrix({
  policy,
}: {
  policy: NetworkPolicySummary;
}) {
  const [direction, setDirection] = React.useState<Direction>("ingress");
  const ingressSelected = policy.policyTypes.includes("Ingress");
  const egressSelected = policy.policyTypes.includes("Egress");
  const selected = direction === "ingress" ? ingressSelected : egressSelected;
  const details: NetworkPolicyRuleDetail[] =
    (direction === "ingress" ? policy.ingressDetails : policy.egressDetails) ??
    [];
  const denied = selected && details.length === 0;
  const DirectionIcon = direction === "ingress" ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold flex items-center gap-1">
        <Network className="w-3 h-3 opacity-60" /> Traffic Matrix
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DirectionCard
          direction="ingress"
          active={direction === "ingress"}
          selected={ingressSelected}
          ruleCount={(policy.ingressDetails ?? []).length}
          onClick={() => setDirection("ingress")}
        />
        <DirectionCard
          direction="egress"
          active={direction === "egress"}
          selected={egressSelected}
          ruleCount={(policy.egressDetails ?? []).length}
          onClick={() => setDirection("egress")}
        />
      </div>

      <div
        className={cn(
          "rounded-xl border p-3 space-y-2",
          !selected &&
            "border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02]",
          denied && "border-rose-500/25 bg-rose-500/5",
          selected && !denied && "border-emerald-500/25 bg-emerald-500/5",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <DirectionIcon
            className={cn(
              "w-3.5 h-3.5",
              !selected
                ? "text-[var(--muted)]"
                : denied
                  ? "text-rose-500"
                  : "text-emerald-500",
            )}
          />
          <span className="text-[11px] font-semibold text-[var(--foreground)] capitalize">
            {direction}
          </span>
          <span className="text-[10px] font-mono text-[var(--muted)]">
            {!selected
              ? "not evaluated by this policy"
              : denied
                ? "denied by default"
                : `${details.length} allowed rule set${details.length === 1 ? "" : "s"}`}
          </span>
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border",
              !selected
                ? "bg-black/5 dark:bg-white/5 text-[var(--muted)] border-[var(--border)]"
                : denied
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
            )}
          >
            {selected && !denied ? (
              <CheckCircle2 className="w-2.5 h-2.5" />
            ) : (
              <Ban className="w-2.5 h-2.5" />
            )}
            {!selected ? "N/A" : denied ? "Deny" : "Allow"}
          </span>
        </div>

        {!selected && (
          <div className="text-[10px] text-[var(--muted)] italic">
            This policy does not evaluate {direction} traffic.
          </div>
        )}

        {denied && (
          <div className="text-[10px] text-rose-600 dark:text-rose-400 leading-relaxed">
            {direction === "ingress" ? "Ingress" : "Egress"} is selected and no
            rules allow traffic, so all {direction} is denied for the selected
            pods.
          </div>
        )}

        {selected &&
          details.map((rule, index) => (
            <div
              key={`${direction}-${index}`}
              className="rounded-lg border border-[var(--border)]/70 bg-[var(--surface)] p-2 space-y-1.5"
            >
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">
                <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] font-mono">
                  Rule {index + 1}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {rule.peers.map((peer, peerIndex) => (
                  <span
                    key={`${peer}-${peerIndex}`}
                    className="inline-flex max-w-full items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 truncate"
                    title={peer}
                  >
                    {peer}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {rule.ports.map((port, portIndex) => (
                  <span
                    key={`${port}-${portIndex}`}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]"
                  >
                    {port}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function DirectionCard({
  direction,
  active,
  selected,
  ruleCount,
  onClick,
}: {
  direction: Direction;
  active: boolean;
  selected: boolean;
  ruleCount: number;
  onClick: () => void;
}) {
  const Icon = direction === "ingress" ? ArrowDownLeft : ArrowUpRight;
  const denied = selected && ruleCount === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative text-left rounded-xl border p-2.5 transition-colors cursor-pointer",
        active
          ? "border-[var(--accent)]/40 bg-[var(--accent)]/5"
          : "border-[var(--border)] hover:bg-[var(--surface-hover)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold capitalize text-[var(--foreground)]">
          <Icon
            className={cn(
              "w-3.5 h-3.5",
              active ? "text-[var(--accent)]" : "text-[var(--muted)]",
            )}
          />
          {direction}
        </span>
        <span
          className={cn(
            "text-[9px] font-mono px-1.5 py-0.5 rounded border",
            !selected
              ? "bg-black/5 dark:bg-white/5 text-[var(--muted)] border-[var(--border)]"
              : denied
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
          )}
        >
          {!selected ? "N/A" : denied ? "deny" : `${ruleCount} allow`}
        </span>
      </div>
      <div className="mt-1 text-[10px] font-mono text-[var(--muted)]">
        {!selected
          ? "Not selected"
          : denied
            ? "Deny all traffic"
            : `${ruleCount} rule set${ruleCount === 1 ? "" : "s"}`}
      </div>
    </button>
  );
}
