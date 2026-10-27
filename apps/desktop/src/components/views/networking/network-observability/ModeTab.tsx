"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type Mode = "overview" | "policies" | "endpoints" | "flows";

export function ModeTab({
  id,
  label,
  count,
  icon: Icon,
  active,
  onClick,
}: {
  id: Mode;
  label: string;
  count?: number;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={
        id === "overview"
          ? "network-observability-tab-overview"
          : `cilium-tab-${id}`
      }
      onClick={onClick}
      className={cn(
        "relative px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        active
          ? "text-[var(--foreground)] font-semibold"
          : "text-[var(--muted)] hover:text-[var(--foreground)]",
      )}
    >
      {active && (
        <motion.span
          layoutId="network-observability-tab"
          className="absolute inset-0 rounded-md bg-[var(--surface-elevated)] dark:bg-white/10 shadow-xs border border-[var(--border)] -z-10"
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
        />
      )}
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/5 text-[var(--muted)]">
          {count}
        </span>
      )}
    </button>
  );
}
