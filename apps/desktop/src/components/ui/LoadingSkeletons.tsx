"use client";

import * as React from "react";
import { Skeleton, SkeletonCircle, SkeletonBadge } from "./Skeleton";
import { cn } from "@/lib/utils";

/**
 * TableSkeleton:
 * High-density table skeleton simulating active Kubernetes resource list
 */
export function TableSkeleton({
  rows = 8,
  columns = 8,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-hidden select-none", className)}>
      {/* Table Header Skeleton */}
      <div className="h-9 px-3 bg-[var(--surface)]/80 border-b border-[var(--border)] flex items-center gap-4 text-[10px] font-mono">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="w-24 h-3 rounded" />
        <Skeleton className="w-20 h-3 rounded" />
        <Skeleton className="w-16 h-3 rounded" />
        <Skeleton className="w-12 h-3 rounded" />
        <Skeleton className="w-14 h-3 rounded" />
        <Skeleton className="w-24 h-3 rounded" />
        <Skeleton className="w-24 h-3 rounded" />
        <div className="flex-1" />
        <Skeleton className="w-16 h-3 rounded" />
      </div>

      {/* Table Rows Skeleton */}
      <div className="divide-y divide-black/[0.05] dark:divide-white/[0.04]">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-10 px-3 flex items-center gap-4 bg-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
          >
            {/* Checkbox */}
            <Skeleton className="w-3.5 h-3.5 rounded shrink-0" />

            {/* Resource Name */}
            <div className="w-56 shrink-0 flex items-center gap-2">
              <Skeleton
                className="h-3.5 rounded"
                style={{ width: `${Math.floor(130 + ((i * 37) % 90))}px` }}
              />
            </div>

            {/* Namespace */}
            <div className="w-24 shrink-0">
              <Skeleton
                className="h-3 rounded"
                style={{ width: i % 2 === 0 ? "70px" : "55px" }}
              />
            </div>

            {/* Status Badge */}
            <div className="w-20 shrink-0">
              <SkeletonBadge className="h-5 w-18" />
            </div>

            {/* Ready */}
            <div className="w-12 shrink-0">
              <Skeleton className="h-3 w-7 rounded" />
            </div>

            {/* Restarts */}
            <div className="w-12 shrink-0">
              <Skeleton className="h-3 w-5 rounded" />
            </div>

            {/* CPU Bar */}
            <div className="w-28 shrink-0 flex items-center gap-2">
              <Skeleton className="h-3 w-8 rounded" />
              <Skeleton className="h-1.5 flex-1 rounded-full" />
            </div>

            {/* Memory Bar */}
            <div className="w-32 shrink-0 flex items-center gap-2">
              <Skeleton className="h-3 w-10 rounded" />
              <Skeleton className="h-1.5 flex-1 rounded-full" />
            </div>

            {/* Age */}
            <div className="w-14 shrink-0">
              <Skeleton className="h-3 w-8 rounded" />
            </div>

            {/* Quick Actions */}
            <div className="flex-1 flex justify-end gap-1.5">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * OverviewSkeleton:
 * Mirrors the ClusterOverviewView structure while connecting or diagnosing
 */
export function OverviewSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-5 space-y-5 select-none animate-in fade-in duration-300", className)}>
      {/* 1. Hero Banner Skeleton */}
      <div className="p-5 rounded-2xl glass-panel border border-[var(--border)] relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SkeletonCircle size={48} className="rounded-2xl" />
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-5 w-36 rounded" />
                <SkeletonBadge className="w-24 h-5" />
                <SkeletonBadge className="w-20 h-5" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      {/* 2. Four Capacity Radial Cards */}
      <div className="grid grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-7 w-24 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
              <SkeletonCircle size={48} />
            </div>
            <div className="pt-2 border-t border-[var(--border)] flex justify-between">
              <Skeleton className="h-2.5 w-16 rounded" />
              <Skeleton className="h-2.5 w-12 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Node Topology Skeleton Strip */}
      <div className="p-4 rounded-xl glass-panel border border-[var(--border)] space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-3.5 w-48 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="h-3 w-32 rounded" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3.5 rounded-xl border border-[var(--border)] bg-black/[0.03] dark:bg-black/30 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <SkeletonCircle size={8} />
                  <Skeleton className="h-3.5 w-32 rounded" />
                </div>
                <SkeletonBadge className="w-16 h-4" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-12 rounded" />
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Diagnostic & Events Grid Skeleton */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="col-span-2 p-4 rounded-xl glass-panel border border-[var(--border)] space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3.5 w-44 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg border border-[var(--border)] bg-black/[0.03] dark:bg-black/20 space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-36 rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-[var(--border)] space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3.5 w-32 rounded" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-2.5 rounded-lg border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.01] space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-2.5 w-10 rounded" />
                </div>
                <Skeleton className="h-2.5 w-full rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * InspectorSkeleton:
 * Loading state for the Resource Inspector slide-over drawer
 */
export function InspectorSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-5 space-y-5 select-none", className)}>
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <SkeletonCircle size={40} className="rounded-xl" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-36 rounded font-mono" />
              <SkeletonBadge className="w-14 h-4" />
            </div>
            <Skeleton className="h-3 w-24 rounded font-mono" />
          </div>
        </div>
        <Skeleton className="w-6 h-6 rounded" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-6 w-20 rounded" />
        <Skeleton className="h-6 w-20 rounded" />
        <Skeleton className="h-6 w-14 rounded" />
      </div>

      {/* Key-Value Details */}
      <div className="space-y-3 p-4 rounded-xl bg-black/[0.03] dark:bg-black/20 border border-[var(--border)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-1">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>
        ))}
      </div>

      {/* Code / Spec Block Skeleton */}
      <div className="p-4 rounded-xl bg-black/[0.04] dark:bg-black/40 border border-[var(--border)] space-y-2">
        <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        <div className="space-y-1.5 pt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-2.5 rounded font-mono"
              style={{ width: `${Math.floor(40 + ((i * 43) % 55))}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * CardSkeleton:
 * Generic modular card skeleton
 */
export function CardSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("p-4 rounded-xl glass-card border border-[var(--border)] space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32 rounded" />
        <SkeletonCircle size={16} />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3 rounded"
            style={{ width: i === lines - 1 ? "60%" : "100%" }}
          />
        ))}
      </div>
    </div>
  );
}
