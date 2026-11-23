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
      text: "text-[var(--status-healthy)]",
      bg: "bg-[var(--status-healthy-bg)]",
      border: "border-[var(--status-healthy-border)]",
    },
    active: {
      text: "text-[var(--status-healthy)]",
      bg: "bg-[var(--status-healthy-bg)]",
      border: "border-[var(--status-healthy-border)]",
    },
    warning: {
      text: "text-[var(--status-warning)]",
      bg: "bg-[var(--status-warning-bg)]",
      border: "border-[var(--status-warning-border)]",
    },
    critical: {
      text: "text-[var(--status-critical)]",
      bg: "bg-[var(--status-critical-bg)]",
      border: "border-[var(--status-critical-border)]",
    },
    pending: {
      text: "text-[var(--status-info)]",
      bg: "bg-[var(--status-info-bg)]",
      border: "border-[var(--status-info-border)]",
    },
    offline: {
      text: "text-[var(--status-muted)]",
      bg: "bg-[var(--status-muted-bg)]",
      border: "border-[var(--status-muted-border)]",
    },
    muted: {
      text: "text-[var(--status-muted)]",
      bg: "bg-[var(--status-muted-bg)]",
      border: "border-[var(--status-muted-border)]",
    },
  };

  const sizeClasses: Record<NonNullable<StatusBeaconProps["size"]>, string> = {
    xs: "h-4 px-1.5 text-[10px] rounded",
    sm: "h-[18px] px-1.5 text-[10px] rounded-md",
    md: "h-[22px] px-2 text-[11px] rounded-md",
  };

  const current = colorMap[variant];

  return (
    <span
      data-status-beacon={size}
      className={cn(
        "inline-flex items-center whitespace-nowrap leading-none font-medium select-none border",
        sizeClasses[size],
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
