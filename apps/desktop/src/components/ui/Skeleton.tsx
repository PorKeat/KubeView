"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "shimmer" | "pulse";
  rounded?: "sm" | "md" | "lg" | "xl" | "full" | "none";
}

export function Skeleton({
  className,
  variant = "shimmer",
  rounded = "md",
  ...props
}: SkeletonProps) {
  const roundedClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-white/[0.05] border border-white/[0.04]",
        variant === "shimmer" ? "shimmer-wave" : "animate-pulse",
        roundedClass,
        className
      )}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
  lastLineWidth = "60%",
}: {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{
            width: i === lines - 1 ? lastLineWidth : "100%",
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonBadge({ className }: { className?: string }) {
  return <Skeleton rounded="full" className={cn("h-5 w-16", className)} />;
}

export function SkeletonCircle({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Skeleton
      rounded="full"
      style={{ width: size, height: size }}
      className={cn("shrink-0", className)}
    />
  );
}
