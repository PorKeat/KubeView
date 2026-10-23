"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-mono font-medium transition-colors select-none focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)]",
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
          "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold",
        warning:
          "border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold",
        destructive:
          "border border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold",
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
