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
          "p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] backdrop-blur-md flex items-center justify-between gap-4",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--foreground)]">{title}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
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
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
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
      {/* Ambient Red Glow */}
      <div className="absolute w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -top-24" />

      <div className="relative z-10 max-w-lg w-full p-6 rounded-2xl glass-panel border border-rose-500/20 shadow-2xl space-y-5 text-center">
        {/* Cyber Error Badge & Glow */}
        <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-b from-rose-500/20 to-rose-500/5 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.25)]">
          <ShieldAlert className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-1">
            <span>{code}</span>
          </div>
          <h2 className="text-base font-bold text-[var(--foreground)] tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed max-w-md mx-auto">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2.5 pt-1">
          {onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <RotateCw className={cn("w-3.5 h-3.5", isRetrying && "animate-spin")} />
              <span>Retry Request</span>
            </button>
          )}

          {secondaryAction ? (
            <button
              onClick={secondaryAction.onClick}
              className="px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[var(--foreground)] border border-white/10 transition-all cursor-pointer"
            >
              {secondaryAction.label}
            </button>
          ) : (
            <button
              onClick={() => openTab({ id: "overview", title: "Cluster Overview", closable: false })}
              className="px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[var(--foreground)] border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>Back to Overview</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="px-2.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-[var(--muted)] hover:text-[var(--foreground)] border border-white/10 transition-all cursor-pointer"
            title="Copy Diagnostic JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Technical Diagnostics Accordion */}
        {formattedDetails && (
          <div className="pt-2 border-t border-white/[0.06] text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors py-1 cursor-pointer font-mono"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-[var(--muted)]" />
                Technical Traceback & Diagnostics
              </span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDetails && (
              <pre className="mt-2 p-3 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono text-rose-300/90 overflow-x-auto max-h-36 whitespace-pre-wrap leading-relaxed select-text">
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
        "px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-3 select-none",
        className
      )}
    >
      <div className="flex items-center gap-2 truncate">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span className="truncate">{message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-[11px] font-medium underline underline-offset-2 hover:text-white cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400 hover:text-white cursor-pointer"
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
