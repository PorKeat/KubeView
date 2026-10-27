"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ReplicaTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "healthy" | "warning";
}) {
  return (
    <div className="rounded-lg border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">
        {label}
      </div>
      <div
        className={cn(
          "text-sm font-mono font-semibold tabular-nums mt-0.5",
          tone === "healthy" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-500",
          tone === "default" && "text-[var(--foreground)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold block">
        {label}
      </span>
      <span
        className="font-mono text-[10px] text-[var(--foreground)] truncate block mt-0.5"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

export function RowAction({
  icon: Icon,
  title,
  detail,
  onClick,
  danger = false,
}: {
  icon: React.ElementType;
  title: string;
  detail: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer group/act",
        danger
          ? "hover:bg-rose-500/10"
          : "hover:bg-black/5 dark:hover:bg-white/[0.06]",
      )}
    >
      <Icon
        className={cn(
          "w-3.5 h-3.5 mt-0.5 shrink-0",
          danger
            ? "text-rose-500"
            : "text-[var(--muted)] group-hover/act:text-[var(--foreground)]",
        )}
      />
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[11px] font-medium",
            danger
              ? "text-rose-600 dark:text-rose-400"
              : "text-[var(--foreground)]",
          )}
        >
          {title}
        </span>
        <span className="block text-[10px] leading-relaxed text-[var(--muted)]">
          {detail}
        </span>
      </span>
    </button>
  );
}
