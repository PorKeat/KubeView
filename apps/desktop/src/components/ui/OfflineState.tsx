"use client";

import * as React from "react";
import {
  ServerOff,
  Server,
  RotateCw,
  Terminal,
  Layers,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  UploadCloud,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import { isInternalEndpoint, replaceEndpointHost } from "@/lib/endpointUtils";

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
  const [copiedCmd, setCopiedCmd] = React.useState(false);

  const activeContextInfo = availableContexts.find((c) => c.name === currentContext);
  const serverUrl = activeContextInfo?.server || "https://127.0.0.1:6443";
  const [customEndpoint, setCustomEndpoint] = React.useState(serverUrl);
  const [isUpdatingEndpoint, setIsUpdatingEndpoint] = React.useState(false);

  // Candidate IP suggestions from other active clusters
  const suggestedIps = React.useMemo(() => {
    const ips: { ip: string; source: string }[] = [];
    for (const ctx of availableContexts) {
      if (ctx.name !== currentContext && ctx.server) {
        try {
          const u = ctx.server.includes("://") ? new URL(ctx.server) : new URL(`https://${ctx.server}`);
          if (/^(\d{1,3}\.){3}\d{1,3}$/.test(u.hostname) && !u.hostname.startsWith("127.")) {
            if (!ips.some((item) => item.ip === u.hostname)) {
              ips.push({ ip: u.hostname, source: ctx.name });
            }
          }
        } catch {}
      }
    }
    return ips;
  }, [availableContexts, currentContext]);

  React.useEffect(() => {
    setCustomEndpoint(serverUrl);
  }, [serverUrl]);

  const handleSaveEndpoint = async (targetEndpoint?: string) => {
    const raw = (targetEndpoint || customEndpoint).trim();
    if (!raw) return;
    const finalEndpoint = replaceEndpointHost(serverUrl, raw);
    setIsUpdatingEndpoint(true);
    try {
      await updateEndpoint(currentContext, finalEndpoint);
      setCustomEndpoint(finalEndpoint);
      toast.success("Updated cluster API server endpoint");
    } catch (err: any) {
      toast.error(`Update failed: ${err.message || err}`);
    } finally {
      setIsUpdatingEndpoint(false);
    }
  };
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

  // 1. Clean State: When user has 0 clusters configured
  if (availableContexts.length === 0) {
    return (
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-8 select-none relative overflow-hidden",
          className
        )}
      >
        <div className="absolute w-96 h-96 bg-[#F08A42]/10 rounded-full blur-3xl pointer-events-none -top-24" />

        <div className="relative z-10 max-w-md w-full p-8 rounded-3xl glass-panel border border-[var(--border)] shadow-2xl space-y-5 text-center">
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-[#F08A42]/10 border border-[#F08A42]/30 flex items-center justify-center text-[#F08A42] shadow-[0_0_24px_rgba(240,138,66,0.2)]">
            <Layers className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#F08A42]/10 text-[#F08A42] border border-[#F08A42]/20 mb-1">
              <span>CLEAN_SLATE • READY FOR CONFIG</span>
            </div>
            <h2 className="text-base font-bold text-[var(--foreground)] tracking-tight">
              No Kubernetes Cluster Connected
            </h2>
            <p className="text-xs text-[var(--muted)] leading-relaxed max-w-sm mx-auto">
              Your workspace is completely clean. Choose an auto-detected cluster from your system, import a file, or paste YAML to connect.
            </p>
          </div>

          {detectedSystemConfigs.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#F08A42]/10 border border-[#F08A42]/25 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#F08A42] shrink-0" />
                <div>
                  <span className="font-semibold text-xs text-[var(--foreground)] block">
                    Found {detectedSystemConfigs.length} Cluster{detectedSystemConfigs.length > 1 ? "s" : ""} in ~/.kube
                  </span>
                  <span className="text-[10px] text-[var(--muted)] font-mono">
                    {detectedSystemConfigs[0]?.contextName} ({detectedSystemConfigs[0]?.fileName})
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

        {/* API Server Endpoint Configuration Box */}
        <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-black/40 border border-[var(--border)] text-left space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-medium text-[var(--foreground)]">
              <Server className="w-3.5 h-3.5 text-[#F08A42]" />
              API Server Endpoint
            </span>
            {serverUrl.includes(".local") || serverUrl.includes(".internal") ? (
              <span className="text-[10px] text-amber-500 font-medium">Internal domain detected</span>
            ) : (
              <span className="text-[10px] font-mono text-[var(--muted)]">Edit IP / Hostname</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="e.g. 10.1.16.11 or https://10.1.16.11:6443"
              className="flex-1 px-3 py-1.5 rounded-lg bg-black/[0.05] dark:bg-black/50 border border-[var(--border)] text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-[#F08A42]"
            />
            <button
              onClick={() => handleSaveEndpoint()}
              disabled={isUpdatingEndpoint || customEndpoint === serverUrl}
              className="px-3.5 py-1.5 rounded-lg bg-[#F08A42] hover:bg-[#E07931] disabled:opacity-50 text-white text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
            >
              {isUpdatingEndpoint ? "Updating..." : "Save & Reconnect"}
            </button>
          </div>

          {suggestedIps.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[var(--muted)]">Reachable IP from other cluster:</span>
              {suggestedIps.map((sug) => (
                <button
                  key={sug.ip}
                  type="button"
                  onClick={() => handleSaveEndpoint(sug.ip)}
                  className="px-2 py-0.5 rounded-md bg-[#F08A42]/10 hover:bg-[#F08A42]/20 border border-[#F08A42]/30 text-[10px] font-mono text-[#F08A42] flex items-center gap-1 cursor-pointer transition-colors"
                  title={`Apply ${sug.ip} from ${sug.source}`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Use {sug.ip}</span>
                </button>
              ))}
            </div>
          )}

          {(serverUrl.includes(".local") || serverUrl.includes(".internal") || serverUrl.includes("127.0.0.1")) && (
            <p className="text-[11px] text-[var(--muted)] leading-normal">
              💡 Tip: Clusters created by tools like KubeKey default to internal hostnames (e.g.{" "}
              <code className="text-[#F08A42] font-mono">lb.kubesphere.local</code>). You can replace this with your master node&apos;s reachable IP address (e.g.{" "}
              <code className="text-[var(--foreground)] font-mono">https://10.1.16.11:6443</code>) to connect immediately.
            </p>
          )}
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
