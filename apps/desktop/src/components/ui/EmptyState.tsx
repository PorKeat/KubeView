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
        return <SearchX className="w-5 h-5 text-[var(--muted)]" aria-hidden="true" />;
      case "healthy":
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
      case "folder":
        return <FolderOpen className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />;
      case "empty":
      default:
        return <Inbox className="w-5 h-5 text-[var(--muted)]" aria-hidden="true" />;
    }
  };

  return (
    <div
      className={cn(
        "py-12 px-6 flex flex-col items-center justify-center text-center select-none animate-in fade-in duration-200",
        className
      )}
    >
      <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left space-y-4">
        {/* Header Strip: Icon, Title, and Scope Badge */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border)]/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-center shrink-0">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
                {title}
              </h3>
              {scopeBadge && (
                <div className="mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/60" />
                    <span>{scopeBadge}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] shrink-0">
            {variant === "search" ? "Filter" : "Workloads"}
          </span>
        </div>

        {/* Informative Explanation */}
        {description && (
          <p className="text-xs text-[var(--muted)] font-sans leading-relaxed">
            {description}
          </p>
        )}

        {/* Optional Interactive Scope Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div className="pt-1 space-y-1.5">
            <span className="text-[11px] font-mono text-[var(--muted)]">
              Jump to active namespace:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={s.onClick}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
                >
                  <span>{s.label}</span>
                  {s.count !== undefined && (
                    <span className="text-[10px] text-[var(--muted)]">({s.count})</span>
                  )}
                  <ArrowRight className="w-3 h-3 text-[var(--muted)] ml-0.5" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Optional Terminal Command Snippet */}
        {codeSnippet && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] text-[var(--muted)] font-mono mb-1.5">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                <span>Deploy a test workload</span>
              </span>
              <span>bash</span>
            </div>
            <div className="group relative flex items-center justify-between p-2.5 rounded-xl bg-black/40 dark:bg-black/60 border border-[var(--border)] font-mono text-xs text-zinc-100 dark:text-zinc-200">
              <span className="truncate pr-8 select-all">{codeSnippet}</span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy command snippet"
                className="p-1 rounded bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
                title="Copy snippet"
              >
                {copiedSnippet ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Actions Strip */}
        {(action || secondaryAction) && (
          <div className="pt-2 flex flex-wrap items-center gap-2">
            {action && (
              <button
                type="button"
                onClick={action.onClick}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            )}

            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-xs font-medium text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                {secondaryAction.icon}
                <span>{secondaryAction.label}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
