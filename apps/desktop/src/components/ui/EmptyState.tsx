"use client";

import * as React from "react";
import {
  Inbox,
  SearchX,
  CheckCircle2,
  FolderOpen,
  Terminal,
  Copy,
  Check,
  Globe,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tooltip } from "@/components/ui/Tooltip";

export type EmptyStateVariant = "search" | "empty" | "healthy" | "folder";

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  scopeBadge?: string;
  codeSnippet?: string;
  suggestions?: Array<{
    label: string;
    count?: number;
    onClick: () => void;
  }>;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export function EmptyState({
  variant = "empty",
  title,
  description,
  scopeBadge,
  codeSnippet,
  suggestions,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const [copiedSnippet, setCopiedSnippet] = React.useState(false);

  const handleCopy = () => {
    if (!codeSnippet) return;
    navigator.clipboard.writeText(codeSnippet);
    setCopiedSnippet(true);
    toast.success("Command copied to clipboard");
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const getIcon = () => {
    switch (variant) {
      case "search":
        return (
          <SearchX className="w-6 h-6 text-[var(--muted)]" aria-hidden="true" />
        );
      case "healthy":
        return (
          <CheckCircle2
            className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        );
      case "folder":
        return (
          <FolderOpen
            className="w-6 h-6 text-[var(--accent)]"
            aria-hidden="true"
          />
        );
      case "empty":
      default:
        return (
          <Inbox className="w-6 h-6 text-[var(--muted)]" aria-hidden="true" />
        );
    }
  };

  return (
    <div
      className={cn(
        "flex-1 w-full max-w-xl mx-auto py-16 px-6 flex flex-col items-center justify-center text-center select-none animate-in fade-in duration-200 space-y-4",
        className,
      )}
    >
      {/* Centered Hero Icon */}
      <div className="w-14 h-14 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--border)] flex items-center justify-center shrink-0 shadow-xs">
        {getIcon()}
      </div>

      {/* Title & Scope Badge */}
      <div className="space-y-2">
        <h3 className="text-base sm:text-lg font-semibold text-[var(--foreground)] tracking-tight">
          {title}
        </h3>
        {scopeBadge && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
            <span>{scopeBadge}</span>
          </div>
        )}
      </div>

      {/* Informative Explanation */}
      {description && (
        <p className="text-xs sm:text-sm text-[var(--muted)] max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {/* Optional Interactive Scope Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="pt-1 space-y-2">
          <span className="text-[11px] font-mono text-[var(--muted)] block">
            Jump to active namespace:
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={s.onClick}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                <span>{s.label}</span>
                {s.count !== undefined && (
                  <span className="text-[10px] text-[var(--muted)]">
                    ({s.count})
                  </span>
                )}
                <ArrowRight
                  className="w-3 h-3 text-[var(--muted)]"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Optional Terminal Command Snippet */}
      {codeSnippet && (
        <div className="w-full max-w-md pt-1">
          <div className="group relative flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/[0.04] border border-[var(--border)] font-mono text-xs text-[var(--foreground)]">
            <span className="truncate pr-4 select-all text-[var(--muted)] font-mono">
              {codeSnippet}
            </span>
            <Tooltip
              content={
                copiedSnippet ? "Copied to clipboard" : "Copy command snippet"
              }
            >
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy command snippet"
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                {copiedSnippet ? (
                  <Check
                    className="w-3.5 h-3.5 text-emerald-500"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="px-3.5 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-3.5 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              {secondaryAction.icon}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
