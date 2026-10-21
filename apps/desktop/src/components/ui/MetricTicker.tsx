"use client";

import * as React from "react";
import { motion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

export interface MetricTickerProps {
  value: number;
  direction?: "up" | "down";
  className?: string;
  prefix?: string;
  suffix?: string;
  decimalPlaces?: number;
}

export function MetricTicker({
  value,
  className,
  prefix = "",
  suffix = "",
  decimalPlaces = 0,
}: MetricTickerProps) {
  const spring = useSpring(value, {
    mass: 0.8,
    stiffness: 120,
    damping: 24,
  });

  const display = useTransform(spring, (current) => {
    return `${prefix}${current.toFixed(decimalPlaces)}${suffix}`;
  });

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span
      className={cn("font-mono tabular-nums tracking-tight select-none", className)}
    >
      {display}
    </motion.span>
  );
}
