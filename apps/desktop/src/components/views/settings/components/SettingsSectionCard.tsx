"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

export function SettingsSectionCard({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs"
    >
      <div className="flex items-start gap-2.5 border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-black/[0.03] text-[var(--muted)] dark:bg-white/[0.04]">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xs font-semibold text-[var(--foreground)]">
            {title}
          </h2>
          <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        </div>
      </div>
      <div className="space-y-5 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function SettingsHeading({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[var(--foreground)]">
        {label}
      </p>
      <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
        {description}
      </p>
    </div>
  );
}

export function SettingsToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onToggle,
  testId,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-black/[0.02] p-3.5 sm:flex-row sm:items-center sm:justify-between dark:bg-white/[0.02]">
      <div className="flex min-w-0 items-start gap-3">
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]"
          aria-hidden="true"
        />
        <div>
          <p className="text-[11px] font-semibold text-[var(--foreground)]">
            {title}
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        data-testid={testId}
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
          checked
            ? "border-[var(--accent)] bg-[var(--accent)]"
            : "border-[var(--border)] bg-black/10 dark:bg-white/10",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-[3px]",
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
