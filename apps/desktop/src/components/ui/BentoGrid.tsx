"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className, ...props }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  spotlight?: boolean;
  spotlightColor?: string;
  isSelected?: boolean;
  interactive?: boolean;
}

export const BentoCard = React.forwardRef<HTMLDivElement, BentoCardProps>(
  (
    {
      children,
      className,
      containerClassName,
      spotlight = true,
      spotlightColor = "rgba(240, 138, 66, 0.12)",
      isSelected = false,
      interactive = false,
      onMouseMove,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const cardRef = React.useRef<HTMLDivElement | null>(null);
    const [isHovered, setIsHovered] = React.useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (card && spotlight) {
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
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "group/bento relative rounded-xl border bg-[var(--surface)] text-[var(--foreground)] overflow-hidden",
          "transition-all duration-200 ease-out",
          "motion-reduce:transition-none motion-reduce:transform-none",
          isSelected
            ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/50 bg-[var(--surface-hover)] shadow-[0_0_24px_-4px_rgba(240,138,66,0.25)]"
            : "border-[var(--border)] hover:border-[var(--accent)]/60 hover:shadow-[0_4px_24px_-4px_rgba(240,138,66,0.14)]",
          interactive &&
            "cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0 motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
          containerClassName
        )}
        {...props}
      >
        {/* Dynamic Surface Full-Fill Spotlight */}
        {spotlight && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 motion-reduce:hidden"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(450px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${spotlightColor}, transparent 75%)`,
            }}
            aria-hidden="true"
          />
        )}

        {/* Card Content Container */}
        <div className={cn("relative z-10 w-full h-full p-4 sm:p-5 flex flex-col justify-between", className)}>
          {children}
        </div>
      </div>
    );
  }
);

BentoCard.displayName = "BentoCard";
