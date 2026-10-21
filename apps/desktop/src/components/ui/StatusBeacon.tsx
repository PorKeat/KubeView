"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusBeaconVariant =
  | "healthy"
  | "warning"
  | "critical"
  | "pending"
  | "offline"
  | "active"
  | "muted";

export interface StatusBeaconProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBeaconVariant;
  label?: string;
  size?: "xs" | "sm" | "md";
  pulse?: boolean;
}

export function StatusBeacon({
  variant = "healthy",
  label,
  size = "sm",
  pulse = true,
  className,
  ...props
}: StatusBeaconProps) {
  const colorMap: Record<
    StatusBeaconVariant,
    { dot: string; ping: string; text: string; bg: string; border: string }
  > = {
    healthy: {
      dot: "bg-emerald-500",
      ping: "bg-emerald-400/40",
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    active: {
      dot: "bg-emerald-500",
      ping: "bg-emerald-400/50",
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    warning: {
      dot: "bg-amber-500",
      ping: "bg-amber-400/40",
      text: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
    },
    critical: {
      dot: "bg-rose-500",
      ping: "bg-rose-400/40",
      text: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/25",
    },
    pending: {
      dot: "bg-sky-500",
      ping: "bg-sky-400/40",
      text: "text-sky-700 dark:text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
    },
    offline: {
      dot: "bg-zinc-400 dark:bg-zinc-500",
      ping: "bg-zinc-400/30",
      text: "text-zinc-600 dark:text-zinc-400",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/20",
    },
    muted: {
      dot: "bg-[var(--muted)]",
      ping: "bg-[var(--muted)]/20",
      text: "text-[var(--muted)]",
      bg: "bg-black/[0.04] dark:bg-white/[0.04]",
      border: "border-[var(--border)]",
    },
  };

  const current = colorMap[variant];

  const dotSizes = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-mono font-medium select-none",
        label && "px-2 py-0.5 rounded-full border",
        label && current.bg,
        label && current.border,
        label && current.text,
        className
      )}
      {...props}
    >
      <span className="relative flex shrink-0 items-center justify-center">
        {pulse && (
          <span
            className={cn(
              "absolute -inset-0.5 rounded-full animate-ping opacity-75 motion-reduce:hidden",
              current.ping
            )}
            aria-hidden="true"
          />
        )}
        <span
          className={cn("relative rounded-full shrink-0", dotSizes[size], current.dot)}
          aria-hidden="true"
        />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}
