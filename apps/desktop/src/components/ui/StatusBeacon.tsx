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
  pulse = false,
  className,
  ...props
}: StatusBeaconProps) {
  const colorMap: Record<
    StatusBeaconVariant,
    { text: string; bg: string; border: string }
  > = {
    healthy: {
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    active: {
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    warning: {
      text: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
    },
    critical: {
      text: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/25",
    },
    pending: {
      text: "text-sky-700 dark:text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
    },
    offline: {
      text: "text-zinc-600 dark:text-zinc-400",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/20",
    },
    muted: {
      text: "text-[var(--muted)]",
      bg: "bg-black/[0.04] dark:bg-white/[0.04]",
      border: "border-[var(--border)]",
    },
  };

  const current = colorMap[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-mono font-medium select-none px-2 py-0.5 rounded-md border",
        current.bg,
        current.border,
        current.text,
        className,
      )}
      {...props}
    >
      {label && <span>{label}</span>}
    </span>
  );
}
