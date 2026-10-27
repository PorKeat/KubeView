"use client";

import { Globe, Waypoints } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { IngressMode } from "./ingressHelpers";

export function IngressModeTabs({
  mode,
  onModeChange,
  totalIngressesCount,
  totalGatewayResourcesCount,
}: {
  mode: IngressMode;
  onModeChange: (mode: IngressMode) => void;
  totalIngressesCount: number;
  totalGatewayResourcesCount: number;
}) {
  return (
    <div className="h-11 border-b border-[var(--border)] px-3 flex items-center justify-between shrink-0 bg-[var(--surface)] gap-3">
      <div className="relative flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] border border-[var(--border)] text-xs">
        <button
          type="button"
          data-testid="ingresses-view-tab"
          onClick={() => onModeChange("ingresses")}
          className={cn(
            "relative px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
            mode === "ingresses"
              ? "text-[var(--foreground)] font-semibold"
              : "text-[var(--muted)] hover:text-[var(--foreground)]",
          )}
        >
          {mode === "ingresses" && (
            <motion.span
              layoutId="ingresses-resource-tab"
              className="absolute inset-0 rounded-md bg-[var(--surface-elevated)] dark:bg-white/10 shadow-xs border border-[var(--border)] -z-10"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <Globe className="w-3.5 h-3.5" />
          <span>Ingresses</span>
          <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/5 text-[var(--muted)]">
            {totalIngressesCount}
          </span>
        </button>
        <button
          type="button"
          data-testid="gateways-view-tab"
          onClick={() => onModeChange("gateways")}
          className={cn(
            "relative px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
            mode === "gateways"
              ? "text-[var(--foreground)] font-semibold"
              : "text-[var(--muted)] hover:text-[var(--foreground)]",
          )}
        >
          {mode === "gateways" && (
            <motion.span
              layoutId="ingresses-resource-tab"
              className="absolute inset-0 rounded-md bg-[var(--surface-elevated)] dark:bg-white/10 shadow-xs border border-[var(--border)] -z-10"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <Waypoints className="w-3.5 h-3.5" />
          <span>Gateway API</span>
          <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/5 text-[var(--muted)]">
            {totalGatewayResourcesCount}
          </span>
        </button>
      </div>
      <span className="text-[11px] text-[var(--muted)] font-mono hidden sm:block">
        Ingress and Gateway API traffic routing
      </span>
    </div>
  );
}
