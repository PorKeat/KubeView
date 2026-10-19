"use client";

import * as React from "react";
import {
  Inbox,
  SearchX,
  CheckCircle2,
  FolderOpen,
  Plus,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateVariant = "search" | "empty" | "healthy" | "folder";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  variant = "empty",
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const getIcon = () => {
    switch (variant) {
      case "search":
        return <SearchX className="w-8 h-8 text-[var(--muted)]" />;
      case "healthy":
        return <CheckCircle2 className="w-8 h-8 text-emerald-400" />;
      case "folder":
        return <FolderOpen className="w-8 h-8 text-blue-400" />;
      case "empty":
      default:
        return <Inbox className="w-8 h-8 text-[var(--muted)]" />;
    }
  };

  const getGlow = () => {
    switch (variant) {
      case "healthy":
        return "shadow-[0_0_24px_rgba(16,185,129,0.25)] border-emerald-500/30 bg-emerald-500/10";
      case "search":
        return "shadow-[0_0_24px_rgba(240,138,66,0.15)] border-[var(--border)] bg-black/[0.03] dark:bg-white/[0.04]";
      default:
        return "shadow-[0_0_20px_rgba(0,0,0,0.04)] dark:shadow-[0_0_20px_rgba(255,255,255,0.05)] border-[var(--border)] bg-black/[0.03] dark:bg-white/[0.03]";
    }
  };

  return (
    <div
      className={cn(
        "py-16 px-6 flex flex-col items-center justify-center text-center select-none space-y-4 animate-in fade-in duration-200",
        className
      )}
    >
      {/* Icon Frame */}
      <div
        className={cn(
          "w-16 h-16 rounded-2xl border flex items-center justify-center transition-all",
          getGlow()
        )}
      >
        {getIcon()}
      </div>

      {/* Text Info */}
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {description && (
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 pt-1">
          {action && (
            <button
              onClick={action.onClick}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-medium text-[var(--foreground)] border border-[var(--border)] transition-all cursor-pointer"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
