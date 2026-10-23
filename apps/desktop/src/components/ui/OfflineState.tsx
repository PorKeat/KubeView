"use client";

import * as React from "react";
import {
  ServerOff,
  RotateCw,
  Layers,
  ArrowRight,
  UploadCloud,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import { replaceEndpointHost } from "@/lib/endpointUtils";

export function OfflineState({ className }: { className?: string }) {
  const {
    currentContext,
    availableContexts,
    switchContext,
    diagnoseContext,
    diagnosticResult,
    openKubeconfigModal,
    detectedSystemConfigs,
    detectSystemConfigs,
    updateEndpoint,
  } = useClusterStore();

  React.useEffect(() => {
    detectSystemConfigs();
  }, [detectSystemConfigs]);

  const [isRetrying, setIsRetrying] = React.useState(false);

  const activeContextInfo = availableContexts.find(
    (c) => c.name === currentContext,
  );
  const serverUrl = activeContextInfo?.server || "https://127.0.0.1:6443";
  const [customEndpoint, setCustomEndpoint] = React.useState(serverUrl);
  const [isUpdatingEndpoint, setIsUpdatingEndpoint] = React.useState(false);

  // Candidate IP suggestions from other active clusters
  const suggestedIps = React.useMemo(() => {
    const ips: { ip: string; source: string }[] = [];
    for (const ctx of availableContexts) {
      if (ctx.name !== currentContext && ctx.server) {
        try {
          const u = ctx.server.includes("://")
            ? new URL(ctx.server)
            : new URL(`https://${ctx.server}`);
          if (
            /^(\d{1,3}\.){3}\d{1,3}$/.test(u.hostname) &&
            !u.hostname.startsWith("127.")
          ) {
            if (!ips.some((item) => item.ip === u.hostname)) {
              ips.push({ ip: u.hostname, source: ctx.name });
            }
          }
        } catch {}
      }
    }
    return ips;
  }, [availableContexts, currentContext]);

  const [skipTLS, setSkipTLS] = React.useState(false);

  React.useEffect(() => {
    setCustomEndpoint(serverUrl);
    setSkipTLS(false);
  }, [serverUrl]);

  const handleSaveEndpoint = async (
    targetEndpoint?: string,
    forceInsecure?: boolean,
  ) => {
    const raw = (targetEndpoint || customEndpoint).trim();
    if (!raw) return;
    const finalEndpoint = replaceEndpointHost(serverUrl, raw);
    setIsUpdatingEndpoint(true);
    const shouldUseInsecure = forceInsecure ?? skipTLS;
    try {
      await updateEndpoint(currentContext, finalEndpoint, shouldUseInsecure);
      setCustomEndpoint(finalEndpoint);
      toast.info(`Connecting to ${finalEndpoint}...`);
      await switchContext(currentContext);
      const res = await diagnoseContext(currentContext);
      if (res?.status === "connected") {
        toast.success(`Connected to cluster! (${res.latencyMs}ms)`);
      } else if (res?.status === "degraded") {
        toast.warning("Connected with restricted permissions.");
      } else {
        toast.error(
          `Connection failed: ${res?.remediation || "Check node IP & network"}`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Update failed: ${message}`);
    } finally {
      setIsUpdatingEndpoint(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    toast.info(`Attempting reconnection to ${currentContext}...`);
    try {
      await diagnoseContext();
      toast.success("Health probes executed");
    } catch (e) {
      toast.error("Cluster still unreachable");
    } finally {
      setIsRetrying(false);
    }
  };

  // 1. Clean State: When user has 0 clusters configured
  if (availableContexts.length === 0) {
    return (
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-8 select-none relative overflow-hidden",
          className,
        )}
      >
        <div className="absolute w-96 h-96 bg-[#F08A42]/10 rounded-full blur-3xl pointer-events-none -top-24" />

        <div className="relative z-10 max-w-md w-full p-8 rounded-3xl glass-panel border border-[var(--border)] shadow-2xl space-y-5 text-center">
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-[#F08A42]/10 border border-[#F08A42]/30 flex items-center justify-center text-[#F08A42] shadow-[0_0_24px_rgba(240,138,66,0.2)]">
            <Layers className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 mb-1">
              <span>NO KUBECONFIG LOADED</span>
            </div>
            <h2 className="text-base font-bold text-[var(--foreground)] tracking-tight">
              No Kubernetes Cluster Configured
            </h2>
            <p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm mx-auto">
              Select an auto-detected context from your local kubeconfigs,
              browse for a file, or paste kubeconfig YAML to begin.
            </p>
          </div>

          {detectedSystemConfigs.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#F08A42]/10 border border-[#F08A42]/25 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#F08A42] shrink-0" />
                <div>
                  <span className="font-semibold text-xs text-[var(--foreground)] block">
                    Found {detectedSystemConfigs.length} Cluster
                    {detectedSystemConfigs.length > 1 ? "s" : ""} in ~/.kube
                  </span>
                  <span className="text-[10px] text-[var(--muted)] font-mono">
                    {detectedSystemConfigs[0]?.contextName} (
                    {detectedSystemConfigs[0]?.fileName})
                  </span>
                </div>
              </div>
              <button
                onClick={() => openKubeconfigModal("auto")}
                className="px-3 py-1.5 rounded-xl bg-[#F08A42] hover:bg-[#E07931] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
              >
                Add Cluster
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openKubeconfigModal("browse")}
              className="px-5 py-2.5 rounded-xl bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4 text-[#F08A42]" />
              <span>Browse File or Folder</span>
            </button>

            <button
              onClick={() => openKubeconfigModal("paste")}
              className="px-4 py-2.5 rounded-xl bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Paste YAML</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center p-6 sm:p-8 select-none relative overflow-hidden",
        className,
      )}
    >
      <div className="relative z-10 max-w-lg w-full p-6 sm:p-7 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl space-y-4 text-center">
        {/* Offline Icon */}
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto">
          <ServerOff className="w-6 h-6" />
        </div>

        {/* Title & Status */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[var(--foreground)] tracking-tight">
            Cannot Connect to {currentContext || "Cluster"}
          </h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm mx-auto">
            The API server at{" "}
            <span className="font-mono text-[var(--foreground)]">
              {serverUrl}
            </span>{" "}
            is unreachable.
          </p>
        </div>

        {/* API Server Endpoint & Quick Reconnect Box */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-active)]/40 border border-[var(--border)] text-left space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--foreground)]">
              API Endpoint
            </span>
            {suggestedIps.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                <span>Detected:</span>
                {suggestedIps.map((sug) => (
                  <button
                    key={sug.ip}
                    type="button"
                    onClick={() => handleSaveEndpoint(sug.ip)}
                    className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[10px] font-mono text-[var(--foreground)] cursor-pointer transition-colors"
                  >
                    Use {sug.ip}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="https://10.1.16.11:6443"
              className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => handleSaveEndpoint()}
              disabled={isUpdatingEndpoint}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer transition-opacity whitespace-nowrap shrink-0"
            >
              {isUpdatingEndpoint ? "Connecting..." : "Reconnect"}
            </button>
          </div>

          {/* Skip TLS Toggle */}
          <label className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skipTLS}
              onChange={(e) => setSkipTLS(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-0 cursor-pointer accent-[var(--accent)]"
            />
            <span className="text-[11px]">
              Skip TLS certificate verification
            </span>
          </label>

          {/* Quick Bypass button if TLS stage failed */}
          {diagnosticResult?.stages?.tls &&
            !diagnosticResult.stages.tls.passed && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
                <span className="text-[11px] text-amber-600 dark:text-amber-400">
                  TLS certificate mismatch
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveEndpoint(undefined, true)}
                  disabled={isUpdatingEndpoint}
                  className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap"
                >
                  Bypass TLS
                </button>
              </div>
            )}
        </div>

        {/* Alternative Contexts (if available) */}
        {availableContexts.length > 1 && (
          <div className="text-left space-y-1.5 pt-1 border-t border-[var(--border)]/60">
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
              Switch Cluster
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableContexts
                .filter((c) => c.name !== currentContext)
                .slice(0, 3)
                .map((ctx) => (
                  <button
                    key={ctx.name}
                    type="button"
                    onClick={() => switchContext(ctx.name)}
                    className="px-2.5 py-1 rounded-md bg-[var(--surface-active)]/50 hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="truncate max-w-[200px]">{ctx.name}</span>
                    <ArrowRight className="w-3 h-3 text-[var(--muted)]" />
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-1 py-2 px-3 rounded-lg bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCw
              className={cn("w-3.5 h-3.5", isRetrying && "animate-spin")}
            />
            <span>Retry Connection</span>
          </button>

          <button
            type="button"
            onClick={() => openKubeconfigModal("browse")}
            className="flex-1 py-2 px-3 rounded-lg bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Switch Kubeconfig</span>
          </button>
        </div>
      </div>
    </div>
  );
}
