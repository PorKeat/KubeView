"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-1 flex items-center gap-1">
      <Icon className="w-3 h-3 opacity-60" /> {label}
    </div>
  );
}

export function Tile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "healthy" | "warning" | "muted";
}) {
  return (
    <div className="rounded-lg border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 py-1.5 min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">
        {label}
      </div>
      <div
        className={cn(
          "text-sm font-mono font-semibold mt-0.5 truncate",
          tone === "healthy" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-500",
          tone === "muted" && "text-[var(--muted)]",
          tone === "default" && "text-[var(--foreground)]",
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

export function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
      title={`${label}=${value}`}
    >
      <span className="truncate max-w-[160px]">{label}</span>
      <span className="opacity-40">=</span>
      <span className="text-[var(--foreground)] font-medium truncate max-w-[160px]">
        {value}
      </span>
    </span>
  );
}

export function InspectorActionRow({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer",
        danger
          ? "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
      )}
    >
      <Icon
        className={cn(
          "w-3 h-3",
          danger ? "text-rose-500" : "text-[var(--accent)]",
        )}
      />
      {label}
    </button>
  );
}
