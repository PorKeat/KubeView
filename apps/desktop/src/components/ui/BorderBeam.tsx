"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 12,
  borderWidth = 1.5,
  anchor = 90,
  colorFrom = "var(--accent)",
  colorTo = "transparent",
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          "--size": `${size}px`,
          "--duration": `${duration}s`,
          "--anchor": `${anchor}%`,
          "--border-width": `${borderWidth}px`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
        } as React.CSSProperties
      }
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent",
        "motion-reduce:hidden",
        // Mask to only show on the border
        "[mask-clip:padding-box,border-box]",
        "[mask-composite:intersect]",
        "[mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute aspect-square w-[var(--size)]",
          "animate-border-beam [animation-delay:var(--delay)]",
          "[background:radial-gradient(ellipse_at_center,var(--color-from)_0%,var(--color-to)_70%)]",
          "[offset-anchor:calc(var(--anchor)*1%)_50%]",
          "[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
        )}
      />
    </div>
  );
}
