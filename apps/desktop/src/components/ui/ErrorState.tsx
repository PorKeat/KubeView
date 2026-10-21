"use client";

import * as React from "react";
import {
  AlertTriangle,
  RotateCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ServerOff,
  ShieldAlert,
  ArrowLeft,
  Terminal,
  ExternalLink,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/stores/tabStore";

interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  details?: string | Error | null;
  onRetry?: () => void | Promise<void>;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Failed to load cluster resources",
  message = "An unexpected error occurred while communicating with the Kubernetes API server or Go sidecar engine.",
  code = "ERR_K8S_API_UNAVAILABLE",
  details,
  onRetry,
  secondaryAction,
  compact = false,
  className,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const { openTab } = useTabStore();

  const formattedDetails = details
    ? typeof details === "string"
      ? details
      : details.stack || details.message
    : null;

  const handleCopy = () => {
    const errorDump = JSON.stringify(
      {
        code,
        title,
        message,
        details: formattedDetails,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "SSR",
      },
      null,
      2
    );
    navigator.clipboard.writeText(errorDump);
    setCopied(true);
    toast.success("Error diagnostic report copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
      toast.success("Retry command initiated");
    } catch (e) {
      toast.error("Retry attempt failed");
    } finally {
      setIsRetrying(false);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex items-center justify-between gap-4 select-none",
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-500 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--foreground)] truncate">{title}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                {code}
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] line-clamp-1">{message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--surface-hover)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[var(--foreground)] border border-[var(--border)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
            >
              <RotateCw className={cn("w-3 h-3", isRetrying && "animate-spin")} />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center p-8 select-none relative overflow-hidden",
        className
      )}
    >
      <div className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl shadow-black/5 dark:shadow-black/30 space-y-5 text-center animate-in fade-in duration-200">
        {/* Error Icon - Clean, refined, without dots or heavy glow */}
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto shadow-xs">
          <ShieldAlert className="w-6 h-6" />
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span>{code}</span>
          </div>
          <h2 className="text-base font-semibold text-[var(--foreground)] tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm mx-auto">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-3.5 py-2 rounded-lg bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 text-xs font-medium transition-all cursor-pointer flex items-center gap-2 shadow-xs active:scale-[0.98] disabled:opacity-50"
            >
              <RotateCw className={cn("w-3.5 h-3.5", isRetrying && "animate-spin")} />
              <span>Retry Request</span>
            </button>
          )}

          {secondaryAction ? (
            <button
              onClick={secondaryAction.onClick}
              className="px-3.5 py-2 rounded-lg bg-[var(--surface-hover)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-xs font-medium text-[var(--foreground)] border border-[var(--border)] transition-all cursor-pointer active:scale-[0.98]"
            >
              {secondaryAction.label}
            </button>
          ) : (
            <button
              onClick={() => openTab({ id: "overview", title: "Cluster Overview", closable: false })}
              className="px-3.5 py-2 rounded-lg bg-[var(--surface-hover)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-xs font-medium text-[var(--foreground)] border border-[var(--border)] transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>Back to Overview</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-[var(--surface-hover)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-all cursor-pointer active:scale-[0.98]"
            title={copied ? "Copied diagnostic report" : "Copy diagnostic report"}
            aria-label="Copy diagnostic report"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Technical Diagnostics Accordion */}
        {formattedDetails && (
          <div className="pt-2 border-t border-[var(--border)] text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-[11px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[var(--muted)]" />
                Technical Traceback & Diagnostics
              </span>
              {showDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-[var(--muted)]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
              )}
            </button>

            {showDetails && (
              <pre className="mt-2 p-3 rounded-xl bg-black/[0.03] dark:bg-black/50 border border-[var(--border)] text-[10px] font-mono text-rose-600 dark:text-rose-300/90 overflow-x-auto max-h-40 whitespace-pre-wrap leading-relaxed select-text">
                {formattedDetails}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ErrorBanner:
 * Inline notice for degraded state or non-fatal errors
 */
export function ErrorBanner({
  message,
  actionLabel,
  onAction,
  onDismiss,
  className,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-600 dark:text-rose-300 flex items-center justify-between gap-3 select-none",
        className
      )}
    >
      <div className="flex items-center gap-2 truncate">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
        <span className="truncate">{message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-[11px] font-medium underline underline-offset-2 hover:text-[var(--foreground)] cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-0.5 rounded hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 hover:text-[var(--foreground)] cursor-pointer"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * ErrorBoundary:
 * React Error Boundary catching crashes in any sub-view
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[KubeView ErrorBoundary caught error]:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorState
          title="Component Render Error"
          message="An unexpected crash occurred inside this view. You can safely retry or switch to another tab."
          code="REACT_RENDER_CRASH"
          details={this.state.error}
          onRetry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
