"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors select-none focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)]",
  {
    variants: {
      variant: {
        default:
          "border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--foreground)]",
        secondary:
          "border border-transparent bg-black/[0.05] dark:bg-white/[0.08] text-[var(--muted)]",
        outline:
          "border border-[var(--border)] text-[var(--foreground)] bg-transparent",
        accent:
          "border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] font-semibold",
        success:
          "border border-[var(--status-healthy-border)] bg-[var(--status-healthy-bg)] text-[var(--status-healthy)] font-semibold",
        warning:
          "border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)] font-semibold",
        destructive:
          "border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical)] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
