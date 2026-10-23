"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  spotlightColor?: string;
  spotlightSize?: number;
  isSelected?: boolean;
}

export const SpotlightCard = React.forwardRef<
  HTMLDivElement,
  SpotlightCardProps
>(
  (
    {
      children,
      className,
      containerClassName,
      spotlightColor = "rgba(255, 255, 255, 0.04)",
      spotlightSize = 480,
      isSelected = false,
      onMouseMove,
      onMouseLeave,
      ...props
    },
    ref,
  ) => {
    const cardRef = React.useRef<HTMLDivElement | null>(null);
    const [isHovered, setIsHovered] = React.useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      }
      setIsHovered(true);
      onMouseMove?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(false);
      onMouseLeave?.(e);
    };

    return (
      <div
        ref={(node) => {
          cardRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current =
              node;
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "group/spotlight relative rounded-xl border overflow-hidden bg-[var(--surface)] text-[var(--foreground)]",
          "transition-all duration-200 ease-out",
          "motion-reduce:transition-none motion-reduce:transform-none",
          isSelected
            ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/40 bg-[var(--surface-hover)]"
            : "border-[var(--border)] hover:border-black/20 dark:hover:border-white/20 hover:bg-[var(--surface-hover)] hover:shadow-xs",
          containerClassName,
        )}
        {...props}
      >
        {/* Full-fill surface radial spotlight glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 motion-reduce:hidden"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(${spotlightSize}px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${spotlightColor}, transparent 75%)`,
          }}
          aria-hidden="true"
        />

        {/* Content container */}
        <div className={cn("relative z-10 w-full h-full", className)}>
          {children}
        </div>
      </div>
    );
  },
);

SpotlightCard.displayName = "SpotlightCard";
