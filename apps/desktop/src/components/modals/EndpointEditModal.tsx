"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Server,
  AlertTriangle,
  X,
  Check,
  RotateCw,
  Terminal,
  Copy,
  Info,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { isInternalEndpoint, replaceEndpointHost } from "@/lib/endpointUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function EndpointEditModal() {
  const {
    isEndpointModalOpen,
    endpointModalContextName,
    endpointModalCurrentServer,
    closeEndpointModal,
    updateEndpoint,
    switchContext,
    deleteContext,
    availableContexts,
  } = useClusterStore();

  const [inputVal, setInputVal] = React.useState("");
  const [skipTLS, setSkipTLS] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [copiedHosts, setCopiedHosts] = React.useState(false);

  // Extract host/ip and port from current server
  const currentHost = React.useMemo(() => {
    try {
      const url = endpointModalCurrentServer.includes("://")
        ? new URL(endpointModalCurrentServer)
        : new URL(`https://${endpointModalCurrentServer}`);
      return url.hostname;
    } catch {
      return endpointModalCurrentServer;
    }
  }, [endpointModalCurrentServer]);

  // Find candidate IP suggestions from other configured clusters
  const suggestedIps = React.useMemo(() => {
    const ips: { ip: string; source: string }[] = [];
    for (const ctx of availableContexts) {
      if (ctx.name !== endpointModalContextName && ctx.server) {
        try {
          const u = ctx.server.includes("://") ? new URL(ctx.server) : new URL(`https://${ctx.server}`);
          // Check if hostname looks like an IPv4
          if (/^(\d{1,3}\.){3}\d{1,3}$/.test(u.hostname) && !u.hostname.startsWith("127.")) {
            if (!ips.some((item) => item.ip === u.hostname)) {
              ips.push({ ip: u.hostname, source: ctx.name });
            }
          }
        } catch {}
      }
    }
    return ips;
  }, [availableContexts, endpointModalContextName]);

  React.useEffect(() => {
    if (isEndpointModalOpen) {
      setInputVal(endpointModalCurrentServer || "");
      setSkipTLS(false);
    }
  }, [isEndpointModalOpen, endpointModalCurrentServer]);

  const isInternal = isInternalEndpoint(endpointModalCurrentServer);

  // Formatted destination preview
  const resolvedServer = React.useMemo(() => {
    if (!inputVal.trim()) return endpointModalCurrentServer;
    return replaceEndpointHost(endpointModalCurrentServer, inputVal.trim());
  }, [endpointModalCurrentServer, inputVal]);

  const handleSave = async (autoSwitch = true) => {
    if (!resolvedServer || !endpointModalContextName) return;
    setIsSaving(true);
    try {
      await updateEndpoint(endpointModalContextName, resolvedServer, skipTLS);
      if (autoSwitch) {
        await switchContext(endpointModalContextName);
      }
      closeEndpointModal();
    } catch (err) {
      // error toast handled in store
    } finally {
      setIsSaving(false);
    }
  };

  const hostsEntry = `sudo sh -c 'echo "${inputVal.trim() || "<node-ip>"} ${currentHost}" >> /etc/hosts'`;

  const handleCopyHosts = () => {
    navigator.clipboard.writeText(hostsEntry);
    setCopiedHosts(true);
    toast.success("Copied /etc/hosts command to clipboard");
    setTimeout(() => setCopiedHosts(false), 2000);
  };

  return (
    <Dialog.Root open={isEndpointModalOpen} onOpenChange={(open) => !open && closeEndpointModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content
          aria-describedby="endpoint-modal-description"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-6 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 outline-none select-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F08A42]/10 border border-[#F08A42]/20 flex items-center justify-center text-[#F08A42]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-[var(--foreground)] tracking-tight">
                  Configure API Server Endpoint
                </Dialog.Title>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-[var(--muted)] truncate max-w-xs">
                    {endpointModalContextName}
                  </span>
                  {isInternal && (
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-medium rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                      Internal Hostname
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={closeEndpointModal}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div id="endpoint-modal-description" className="space-y-4 py-4">
            {/* Informational Guidance Note */}
            {isInternal ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Internal Domain Requires Node IP Address</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Installers (like KubeKey or KubeSphere) assign internal hostnames like{" "}
                  <code className="text-[var(--foreground)] font-mono font-bold">{currentHost}</code>.
                  Your computer cannot resolve this without adding the control-plane node&apos;s physical IP.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] text-xs text-[var(--muted)] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#F08A42] shrink-0" />
                <span>Update the API server address or proxy port for this cluster.</span>
              </div>
            )}

            {/* IP Suggestions (if detected from other clusters) */}
            {suggestedIps.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-[var(--muted)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F08A42]" />
                  Detected reachable IP from your other cluster:
                </span>
                <div className="flex flex-wrap gap-2">
                  {suggestedIps.map((sug) => (
                    <button
                      key={sug.ip}
                      type="button"
                      onClick={() => setInputVal(sug.ip)}
                      className="px-2.5 py-1 rounded-lg bg-[#F08A42]/10 hover:bg-[#F08A42]/20 border border-[#F08A42]/30 text-xs font-mono text-[#F08A42] flex items-center gap-1.5 transition-all cursor-pointer"
                      title={`From: ${sug.source}`}
                    >
                      <span>Use {sug.ip}</span>
                      <span className="text-[10px] text-[var(--muted)] font-sans">({sug.source})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)] block">
                Enter Node IP or New Server URL:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="e.g. 10.1.16.11 or https://10.1.16.11:6443"
                  className="w-full px-3.5 py-2 text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)]/50 outline-hidden focus:border-[#F08A42] transition-colors"
                  autoFocus
                />
              </div>

              {/* Resolved Target Display */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-[var(--muted)]">Resulting Target:</span>
                <span className="font-mono text-[#F08A42] font-semibold">{resolvedServer}</span>
              </div>

              {/* Skip TLS Verify Toggle */}
              <label className="flex items-center gap-2 pt-1 text-xs text-[var(--foreground)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipTLS}
                  onChange={(e) => setSkipTLS(e.target.checked)}
                  className="rounded border-[var(--border)] text-[#F08A42] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#F08A42]"
                />
                <span className="text-[11px] text-[var(--muted)]">
                  Skip TLS certificate verification (<code className="font-mono text-[10px] text-[#F08A42]">insecure-skip-tls-verify</code>)
                </span>
              </label>
            </div>

            {/* Optional /etc/hosts tip */}
            {isInternal && (
              <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-black/40 border border-[var(--border)] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                    <Terminal className="w-3.5 h-3.5 text-[var(--muted)]" />
                    Alternative: Map hostname in /etc/hosts
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHosts}
                    className="flex items-center gap-1 text-[10px] text-[#F08A42] hover:underline cursor-pointer"
                  >
                    {copiedHosts ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHosts ? "Copied" : "Copy command"}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 font-mono text-[11px] text-emerald-400 select-all overflow-x-auto">
                  {hostsEntry}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={async () => {
                const target = endpointModalContextName;
                closeEndpointModal();
                toast.info(`Removing ${target}...`);
                await deleteContext(target);
                toast.success(`Removed cluster: ${target}`);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-rose-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Cluster</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeEndpointModal}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving || resolvedServer === endpointModalCurrentServer}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F08A42] hover:bg-[#E07931] disabled:opacity-50 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save & Connect</span>
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
