"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  RotateCw,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBeacon, type StatusBeaconVariant } from "@/components/ui";
import { useClusterStore } from "@/stores/clusterStore";
import type { ServiceDiagnosticCheck } from "@kubeview/contracts";

function summaryVariant(summary: string | undefined): StatusBeaconVariant {
  switch (summary) {
    case "Healthy":
      return "healthy";
    case "Degraded":
      return "warning";
    case "Failing":
      return "critical";
    default:
      return "muted";
  }
}

function checkVariant(status: string): StatusBeaconVariant {
  switch (status) {
    case "pass":
      return "healthy";
    case "warning":
      return "warning";
    case "fail":
      return "critical";
    default:
      return "muted";
  }
}

function CheckIcon({ status }: { status: string }) {
  if (status === "pass") {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  if (status === "warning") {
    return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  }
  if (status === "fail") {
    return <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
  }
  return <MinusCircle className="w-4 h-4 text-[var(--muted)] shrink-0" />;
}

export function ServiceDiagnosticsModal() {
  const {
    diagnosticsTarget,
    diagnosticsResult,
    isDiagnosticsLoading,
    diagnosticsError,
    closeServiceDiagnostics,
    runServiceDiagnostics,
  } = useClusterStore();
  const [probePort, setProbePort] = React.useState("");

  React.useEffect(() => {
    setProbePort(diagnosticsTarget?.probePort ?? "");
  }, [diagnosticsTarget]);

  React.useEffect(() => {
    if (!diagnosticsTarget) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeServiceDiagnostics();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [diagnosticsTarget, closeServiceDiagnostics]);

  if (!diagnosticsTarget) return null;

  const target = diagnosticsTarget;
  const checks: ServiceDiagnosticCheck[] = diagnosticsResult?.checks ?? [];
  const summary = diagnosticsResult?.summary;

  const rerun = () => {
    void runServiceDiagnostics({
      ...target,
      probePort: probePort.trim() || undefined,
    });
  };

  return (
    <div
      data-testid="service-diagnostics-modal"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                Service Connectivity Diagnostics
              </h3>
              <p className="text-[11px] text-[var(--muted)] font-mono truncate">
                {target.serviceName} · {target.namespace}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeServiceDiagnostics}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            aria-label="Close diagnostics"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <StatusBeacon
                variant={summaryVariant(summary)}
                label={
                  summary ?? (isDiagnosticsLoading ? "Checking" : "Not run")
                }
                size="sm"
                pulse={isDiagnosticsLoading}
              />
              {diagnosticsResult?.dnsName && (
                <span className="font-mono text-[10px] text-[var(--muted)]">
                  {diagnosticsResult.dnsName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={probePort}
                onChange={(event) => setProbePort(event.target.value)}
                placeholder="probe port"
                className="w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
                aria-label="HTTP probe port"
              />
              <button
                type="button"
                onClick={rerun}
                disabled={isDiagnosticsLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer disabled:opacity-50"
              >
                <RotateCw
                  className={cn(
                    "w-3.5 h-3.5",
                    isDiagnosticsLoading && "animate-spin",
                  )}
                />
                Re-run
              </button>
            </div>
          </div>

          {diagnosticsError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-[11px] text-rose-600 dark:text-rose-400">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{diagnosticsError}</span>
            </div>
          )}

          {isDiagnosticsLoading && checks.length === 0 ? (
            <div className="flex h-48 items-center justify-center gap-2 rounded-xl border border-[var(--border)] text-xs text-[var(--muted)] font-mono">
              <RotateCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
              Running checks...
            </div>
          ) : (
            <div className="space-y-2">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className="rounded-xl border border-[var(--border)]/80 bg-[var(--surface)] p-3 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <CheckIcon status={check.status} />
                    <span className="text-[11px] font-semibold text-[var(--foreground)]">
                      {check.label}
                    </span>
                    <StatusBeacon
                      variant={checkVariant(check.status)}
                      label={check.status}
                      size="xs"
                      className="ml-auto"
                    />
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                    {check.message}
                  </p>
                  {check.details && check.details.length > 0 && (
                    <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-[var(--border)]/60 px-2 py-1.5 space-y-0.5">
                      {check.details.slice(0, 8).map((detail, index) => (
                        <div
                          key={`${check.id}-${index}`}
                          className="font-mono text-[10px] text-[var(--muted)] break-words"
                        >
                          {detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5">
          <span className="text-[10px] font-mono text-[var(--muted)]">
            {diagnosticsResult
              ? `Generated ${new Date(diagnosticsResult.generatedAt).toLocaleTimeString()}`
              : "API-level checks"}
          </span>
          <button
            type="button"
            onClick={closeServiceDiagnostics}
            className="rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
