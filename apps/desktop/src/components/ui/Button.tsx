"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium transition-colors cursor-pointer select-none outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground)]/90 shadow-xs",
        primary:
          "bg-[#f08a42] text-zinc-950 font-semibold hover:bg-[#ff9d5c] shadow-xs",
        secondary:
          "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-black/20 dark:hover:border-white/20",
        outline:
          "border border-[var(--border)] bg-transparent hover:bg-[var(--surface-hover)] text-[var(--foreground)]",
        ghost:
          "hover:bg-[var(--surface-hover)] text-[var(--foreground)]",
        destructive:
          "bg-rose-500 text-white hover:bg-rose-600 shadow-xs",
        accent:
          "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20 font-semibold",
      },
      size: {
        default: "h-8 px-3.5 py-1.5",
        sm: "h-7 px-2.5 text-[11px]",
        lg: "h-9 px-4 text-sm",
        icon: "h-8 w-8 p-0",
        "icon-sm": "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
