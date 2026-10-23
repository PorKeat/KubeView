"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "mark" | "stacked";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Logo({ variant = "full", size = "md", className }: LogoProps) {
  const sizeMap = {
    sm: { icon: 20, text: "text-xs" },
    md: { icon: 24, text: "text-sm" },
    lg: { icon: 32, text: "text-base" },
    xl: { icon: 48, text: "text-xl" },
  };

  const { icon, text } = sizeMap[size];

  if (variant === "mark") {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center shrink-0",
          className,
        )}
      >
        <Image
          src="/logo-mark.png"
          alt="KubeView Logo"
          width={icon}
          height={icon}
          className="select-none object-contain"
          priority
        />
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <Image
          src="/logo-mark.png"
          alt="KubeView Logo"
          width={icon * 2}
          height={icon * 2}
          className="select-none object-contain drop-shadow-[0_4px_16px_rgba(240,138,66,0.25)]"
          priority
        />
        <div className="font-bold tracking-tight select-none">
          <span className="text-[var(--foreground)]">Kube</span>
          <span className="bg-gradient-to-r from-[#F08A42] to-[#FF9E59] bg-clip-text text-transparent">
            View
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <Image
        src="/logo-mark.png"
        alt="KubeView Logo"
        width={icon}
        height={icon}
        className="shrink-0 object-contain drop-shadow-[0_2px_8px_rgba(240,138,66,0.2)]"
        priority
      />
      <div className={cn("font-bold tracking-tight", text)}>
        <span className="text-[var(--foreground)]">Kube</span>
        <span className="bg-gradient-to-r from-[#F08A42] to-[#FF9E59] bg-clip-text text-transparent">
          View
        </span>
      </div>
    </div>
  );
}
