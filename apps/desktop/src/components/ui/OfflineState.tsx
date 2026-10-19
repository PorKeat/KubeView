"use client";

import * as React from "react";
import {
  ServerOff,
  RotateCw,
  Terminal,
  Layers,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";

export function OfflineState({ className }: { className?: string }) {
  const {
    currentContext,
    availableContexts,
    switchContext,
    diagnoseContext,
    diagnosticResult,
    openKubeconfigModal,
  } = useClusterStore();

  const [isRetrying, setIsRetrying] = React.useState(false);
  const [copiedCmd, setCopiedCmd] = React.useState(false);

  const activeContextInfo = availableContexts.find((c) => c.name === currentContext);
  const serverUrl = activeContextInfo?.server || "https://127.0.0.1:6443";
  const isKind = currentContext.includes("kind");
  const isMinikube = currentContext.includes("minikube");
  const isDocker = currentContext.includes("docker") || currentContext.includes("desktop");

  const suggestedFixCmd = isKind
    ? `docker start ${currentContext}-control-plane`
    : isMinikube
    ? "minikube start"
    : isDocker
    ? "open -a Docker"
    : `kubectl cluster-info --context=${currentContext}`;

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

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(suggestedFixCmd);
    setCopiedCmd(true);
    toast.success("Command copied to clipboard");
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center p-8 select-none relative overflow-hidden",
        className
      )}
    >
      {/* Ambient Red Glow */}
      <div className="absolute w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -top-24" />

      <div className="relative z-10 max-w-xl w-full p-6 rounded-2xl glass-panel border border-rose-500/20 shadow-2xl space-y-5 text-center">
        {/* Offline Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.2)]">
          <ServerOff className="w-8 h-8" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-1">
            <span>OFFLINE_CLUSTER_UNREACHABLE</span>
          </div>
          <h2 className="text-base font-bold text-[var(--foreground)] tracking-tight">
            Cannot Connect to Cluster: {currentContext || "default"}
          </h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed max-w-md mx-auto">
            The Kubernetes API server at{" "}
            <span className="font-mono text-[var(--foreground)] bg-black/[0.05] dark:bg-white/[0.06] border border-[var(--border)] px-1.5 py-0.5 rounded text-[11px]">
              {serverUrl}
            </span>{" "}
            is not responding. The container daemon or local node may be stopped.
          </p>
        </div>

        {/* Suggested Quick Recovery Command */}
        <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-black/40 border border-[var(--border)] text-left space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5 font-medium text-[var(--foreground)]">
              <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
              Suggested Terminal Command
            </span>
            <span className="text-[10px] font-mono text-[var(--muted)]">Run in shell</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 dark:bg-black/60 border border-[var(--border)] font-mono text-xs text-emerald-400">
            <span className="truncate select-all">{suggestedFixCmd}</span>
            <button
              onClick={handleCopyCmd}
              className="p-1 rounded hover:bg-white/10 text-[var(--muted)] hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
              title="Copy Command"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Alternative Contexts (if available) */}
        {availableContexts.length > 1 && (
          <div className="text-left space-y-2 pt-1 border-t border-[var(--border)]">
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
              Or Switch to Another Active Context:
            </span>
            <div className="flex flex-wrap gap-2">
              {availableContexts
                .filter((c) => c.name !== currentContext)
                .slice(0, 3)
                .map((ctx) => (
                  <button
                    key={ctx.name}
                    onClick={() => switchContext(ctx.name)}
                    className="px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-[var(--border)] text-xs font-mono text-[var(--foreground)] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>{ctx.name}</span>
                    <ArrowRight className="w-3 h-3 text-[var(--muted)]" />
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-2.5 pt-2">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-4 py-2 rounded-lg bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <RotateCw className={cn("w-3.5 h-3.5", isRetrying && "animate-spin")} />
            <span>Re-Test Probes</span>
          </button>

          <button
            onClick={() => openKubeconfigModal("browse")}
            className="px-4 py-2 rounded-lg bg-[#F08A42] hover:bg-[#E07931] text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import / Switch Kubeconfig</span>
          </button>
        </div>
      </div>
    </div>
  );
}
