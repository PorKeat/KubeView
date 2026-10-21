"use client";

import * as React from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Radio,
  Key,
  Lock,
  UserCheck,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Server,
  Zap,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConnectionDiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionDiagnosticsDrawer({
  isOpen,
  onClose,
}: ConnectionDiagnosticsDrawerProps) {
  const {
    currentContext,
    serverVersion,
    latencyMs,
    diagnosticResult,
    connectionStatus,
    diagnoseContext,
  } = useClusterStore();

  const [isReRunning, setIsReRunning] = React.useState(false);
  const [showRawJson, setShowRawJson] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Smooth slide sheet transition state matching ResourceInspectorDrawer
  const [isRendered, setIsRendered] = React.useState(isOpen);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => {
        setIsMounted(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setIsMounted(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard accessibility: ESC to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleReRun = async () => {
    setIsReRunning(true);
    toast.info("Executing 4-stage cluster diagnostic probe...");
    try {
      await diagnoseContext();
      toast.success("Diagnostic probe completed!");
    } catch {
      toast.error("Diagnostic probe failed");
    } finally {
      setIsReRunning(false);
    }
  };

  const handleCopyJson = () => {
    if (!diagnosticResult) return;
    navigator.clipboard.writeText(JSON.stringify(diagnosticResult, null, 2));
    setCopied(true);
    toast.success("Diagnostics JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isRendered) return null;

  const netStage = diagnosticResult?.stages?.network;
  const authStage = diagnosticResult?.stages?.authentication;
  const tlsStage = diagnosticResult?.stages?.tls;
  const rbacStage = diagnosticResult?.stages?.rbac;

  const allPassed =
    Boolean(netStage?.passed) &&
    Boolean(authStage?.passed) &&
    Boolean(tlsStage?.passed) &&
    Boolean(rbacStage?.passed);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-drawer-title"
      className={cn(
        "fixed inset-0 z-50 overflow-hidden select-none transition-all duration-200 motion-reduce:transition-none",
        isMounted ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Backdrop / Dim Overlay with smooth fade */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity motion-reduce:transition-none cursor-pointer",
          isMounted ? "opacity-100 duration-250 ease-out" : "opacity-0 duration-200 ease-in"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel: Slide sheet with spring curve ease-[cubic-bezier(0.16,1,0.3,1)] */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-lg sm:max-w-xl glass-panel border-l border-[var(--border)] shadow-2xl flex flex-col select-none backdrop-blur-xl",
          "transform transition-transform motion-reduce:transition-none motion-reduce:transform-none",
          isMounted
            ? "translate-x-0 duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
            : "translate-x-full duration-200 ease-in"
        )}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface-hover)]/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <h2
                id="diagnostics-drawer-title"
                className="text-base font-semibold text-[var(--foreground)] tracking-tight truncate"
              >
                Connection & Security Diagnostics
              </h2>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] font-mono mt-0.5 truncate">
                <span className="truncate">{currentContext || "default"}</span>
                <span>&bull;</span>
                <span className="tabular-nums">K8s {serverVersion || "Unknown"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close diagnostics drawer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-active)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status Headline Banner */}
          <div
            className={cn(
              "p-4 rounded-xl border flex items-start gap-3.5",
              allPassed
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-950 dark:text-emerald-200"
                : "bg-amber-500/10 border-amber-500/25 text-amber-950 dark:text-amber-200"
            )}
          >
            {allPassed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-semibold text-sm">
                {allPassed
                  ? "Cluster API Connected & Authenticated"
                  : "Diagnostic Verification Incomplete"}
              </div>
              <p className="text-[var(--muted)] leading-relaxed">
                {allPassed
                  ? `All 4 verification pipeline probes succeeded. Total API round-trip latency measured at ${diagnosticResult?.latencyMs ?? latencyMs}ms.`
                  : "One or more verification pipeline probes reported a failure or warning. Review the stages below."}
              </p>
            </div>
          </div>

          {/* 4 Diagnostic Stages */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider font-mono">
              Live Probe Stages
            </div>

            {/* Stage 1: Network & TCP */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-emerald-500 shrink-0">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      1. Network & TCP Handshake
                    </div>
                    <div className="text-[11px] text-[var(--muted)] font-mono">
                      Target Socket: {netStage?.details?.host ? String(netStage.details.host) : "Host IP:6443"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] tabular-nums text-[var(--foreground)]">
                    {netStage?.latencyMs ? `${netStage.latencyMs}ms` : "-"}
                  </span>
                  {netStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                </div>
              </div>

              <div className="text-xs text-[var(--muted)] font-mono pl-9.5">
                {netStage?.message || "TCP socket handshake verified."}
              </div>
            </div>

            {/* Stage 2: Authentication */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-emerald-500 shrink-0">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      2. Authentication & Credentials
                    </div>
                    <div className="text-[11px] text-[var(--muted)] font-mono">
                      Credential Source: Kubeconfig Active Context
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-xs font-mono font-medium px-2 py-0.5 rounded border",
                      authStage?.passed
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    )}
                  >
                    {authStage?.passed ? "Authorized" : "Failed"}
                  </span>
                  {authStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                </div>
              </div>

              <div className="text-xs text-[var(--muted)] font-mono pl-9.5">
                {authStage?.message || "Credentials parsed and validated."}
              </div>
            </div>

            {/* Stage 3: TLS */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-emerald-500 shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      3. TLS Certificate Authority & Version
                    </div>
                    <div className="text-[11px] text-[var(--muted)] font-mono">
                      Handshake: HTTPS GET /version via Custom CA
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {typeof tlsStage?.latencyMs === "number" && tlsStage.latencyMs > 0 && (
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] tabular-nums text-[var(--foreground)]">
                      {tlsStage.latencyMs}ms
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-xs font-mono font-medium px-2 py-0.5 rounded border",
                      tlsStage?.passed
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    )}
                  >
                    {tlsStage?.passed ? "Verified" : "Untrusted"}
                  </span>
                  {tlsStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                </div>
              </div>

              <div className="text-xs text-[var(--muted)] font-mono pl-9.5">
                {tlsStage?.message || "TLS trust validated."}
              </div>
            </div>

            {/* Stage 4: RBAC */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-emerald-500 shrink-0">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--foreground)]">
                      4. RBAC Pre-Flight Verification
                    </div>
                    <div className="text-[11px] text-[var(--muted)] font-mono">
                      Probe: SelfSubjectAccessReview (list namespaces)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {typeof rbacStage?.latencyMs === "number" && rbacStage.latencyMs > 0 && (
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] tabular-nums text-[var(--foreground)]">
                      {rbacStage.latencyMs}ms
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-xs font-mono font-medium px-2 py-0.5 rounded border",
                      rbacStage?.details?.clusterAdmin !== false
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    )}
                  >
                    {rbacStage?.details?.clusterAdmin !== false ? "ClusterAdmin" : "Scoped"}
                  </span>
                  {rbacStage?.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                </div>
              </div>

              <div className="text-xs text-[var(--muted)] font-mono pl-9.5">
                {rbacStage?.message || "Access rights confirmed."}
              </div>
            </div>
          </div>

          {/* Architecture Isolation Assurance */}
          <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)] space-y-1.5 font-mono">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold font-sans">
              <Check className="w-3.5 h-3.5" />
              <span>Zero-Telemetry & Host Isolation Guaranteed</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              KubeView executes directly via a local Go binary engine (`k8s.io/client-go`).
              Authentication credentials never leave your local machine or pass through external proxies.
            </p>
          </div>

          {/* Collapsible Raw JSON Telemetry */}
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full px-3.5 py-2.5 bg-[var(--surface-hover)]/40 hover:bg-[var(--surface-hover)] flex items-center justify-between text-xs font-mono text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {showRawJson ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Inspect Raw Diagnostic JSON</span>
              </span>
              <span className="text-[11px] text-[var(--muted)]">JSON-RPC 2.0</span>
            </button>
            {showRawJson && (
              <div className="p-3 bg-black/40 text-[11px] font-mono text-[var(--foreground)] overflow-x-auto max-h-56">
                <pre>{JSON.stringify(diagnosticResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-mono text-[var(--foreground)] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />}
            <span>{copied ? "Copied" : "Copy JSON"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReRun}
              disabled={isReRunning}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-opacity"
            >
              <RotateCw className={cn("w-3.5 h-3.5", isReRunning && "animate-spin")} />
              <span>{isReRunning ? "Probing..." : "Re-run Diagnostics"}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
