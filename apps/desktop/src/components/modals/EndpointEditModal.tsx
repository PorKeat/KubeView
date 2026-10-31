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
import {
  isInternalEndpoint,
  joinEndpoint,
  splitEndpoint,
} from "@/lib/endpointUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

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

  const [hostVal, setHostVal] = React.useState("");
  const [portVal, setPortVal] = React.useState("6443");
  const [protocol, setProtocol] = React.useState<"http:" | "https:">("https:");
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
          const u = ctx.server.includes("://")
            ? new URL(ctx.server)
            : new URL(`https://${ctx.server}`);
          // Check if hostname looks like an IPv4
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
  }, [availableContexts, endpointModalContextName]);

  React.useEffect(() => {
    if (isEndpointModalOpen) {
      const parts = splitEndpoint(endpointModalCurrentServer || "");
      setHostVal(parts.host);
      setPortVal(parts.port);
      setProtocol(parts.protocol);
      setSkipTLS(false);
    }
  }, [isEndpointModalOpen, endpointModalCurrentServer]);

  const isInternal = isInternalEndpoint(endpointModalCurrentServer);

  const currentParts = React.useMemo(
    () => splitEndpoint(endpointModalCurrentServer || ""),
    [endpointModalCurrentServer],
  );
  const currentNormalized = joinEndpoint(
    currentParts.protocol,
    currentParts.host,
    currentParts.port,
  );

  // The target preview updates on every keystroke. Host, port, and scheme stay
  // independently editable so pasting a full URL or typing just an IP works.
  const resolvedServer = React.useMemo(
    () => (hostVal.trim() ? joinEndpoint(protocol, hostVal, portVal) : ""),
    [hostVal, portVal, protocol],
  );

  const portNumber = Number(portVal);
  const isPortValid =
    /^\d+$/.test(portVal) && portNumber >= 1 && portNumber <= 65535;
  const hasChanges =
    Boolean(resolvedServer) && resolvedServer !== currentNormalized;

  const handleHostChange = (value: string) => {
    if (value.includes("://") || /^[^:]+:\d+$/.test(value)) {
      const parts = splitEndpoint(value);
      setHostVal(parts.host);
      setPortVal(parts.port);
      setProtocol(parts.protocol);
      return;
    }
    setHostVal(value);
  };

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

  const hostsEntry = `sudo sh -c 'echo "${hostVal.trim() || "<node-ip>"} ${currentHost}" >> /etc/hosts'`;

  const handleCopyHosts = () => {
    navigator.clipboard.writeText(hostsEntry);
    setCopiedHosts(true);
    toast.success("Copied /etc/hosts command to clipboard");
    setTimeout(() => setCopiedHosts(false), 2000);
  };

  return (
    <Dialog.Root
      open={isEndpointModalOpen}
      onOpenChange={(open) => !open && closeEndpointModal()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content
          aria-describedby="endpoint-modal-description"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 outline-none select-none"
        >
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between border-b border-[var(--border)] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-[var(--foreground)]">
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

            <Tooltip content="Close dialog" shortcut="Esc">
              <button
                onClick={closeEndpointModal}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Close endpoint dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          <div
            id="endpoint-modal-description"
            className="flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-6"
          >
            {/* Informational Guidance Note */}
            {isInternal ? (
              <div className="space-y-1.5 border-l-2 border-amber-500/60 pl-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Internal Domain Requires Node IP Address</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Installers (like KubeKey or KubeSphere) assign internal
                  hostnames like{" "}
                  <code className="text-[var(--foreground)] font-mono font-bold">
                    {currentHost}
                  </code>
                  . Your computer cannot resolve this without adding the
                  control-plane node&apos;s physical IP.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l-2 border-[var(--accent)]/40 pl-3 text-xs text-[var(--muted)]">
                <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span>
                  Update the API server address or proxy port for this cluster.
                </span>
              </div>
            )}

            {/* IP Suggestions (if detected from other clusters) */}
            {suggestedIps.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-[var(--muted)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Detected reachable IP from your other cluster:
                </span>
                <div className="flex flex-wrap gap-2">
                  {suggestedIps.map((sug) => (
                    <button
                      key={sug.ip}
                      type="button"
                      onClick={() => setHostVal(sug.ip)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-xs font-mono text-[var(--accent)] flex items-center gap-1.5 transition-all cursor-pointer"
                      title={`From: ${sug.source}`}
                    >
                      <span>Use {sug.ip}</span>
                      <span className="text-[10px] text-[var(--muted)] font-sans">
                        ({sug.source})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Fields */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)] block">
                Node IP / Hostname and Port
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  data-testid="endpoint-modal-input"
                  value={hostVal}
                  onChange={(e) => handleHostChange(e.target.value)}
                  placeholder="e.g. 10.1.16.11"
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 font-mono text-xs text-[var(--foreground)] outline-hidden transition-colors placeholder:text-[var(--muted)]/50 focus:border-[var(--accent)]"
                  autoFocus
                />
                <span className="font-mono text-xs text-[var(--muted)]">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="endpoint-modal-port"
                  value={portVal}
                  onChange={(e) =>
                    setPortVal(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="6443"
                  maxLength={5}
                  className="w-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[var(--foreground)] outline-hidden transition-colors placeholder:text-[var(--muted)]/50 focus:border-[var(--accent)]"
                  aria-label="API server port"
                />
              </div>

              {/* Resolved Target Display */}
              <div className="flex items-center justify-between gap-3 pt-1 text-[11px]">
                <span className="text-[var(--muted)]">Resulting Target:</span>
                <span className="truncate font-mono text-[var(--accent)] font-semibold">
                  {resolvedServer || "—"}
                </span>
              </div>
              {!isPortValid && portVal !== "" && (
                <p className="text-[10px] text-rose-500">
                  Port must be between 1 and 65535.
                </p>
              )}

              {/* Skip TLS Verify Toggle */}
              <label className="flex items-center gap-2 pt-1 text-xs text-[var(--foreground)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="endpoint-modal-skip-tls"
                  checked={skipTLS}
                  onChange={(e) => setSkipTLS(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[var(--accent)]"
                />
                <span className="text-[11px] text-[var(--muted)]">
                  Skip TLS certificate verification (
                  <code className="font-mono text-[10px] text-[var(--accent)]">
                    insecure-skip-tls-verify
                  </code>
                  )
                </span>
              </label>
            </div>

            {/* Optional /etc/hosts tip */}
            {isInternal && (
              <div className="space-y-1.5 border-t border-[var(--border)] pt-2.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                    <Terminal className="w-3.5 h-3.5 text-[var(--muted)]" />
                    Alternative: Map hostname in /etc/hosts
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHosts}
                    className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    {copiedHosts ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
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
          <div className="flex shrink-0 items-center justify-between gap-2.5 border-t border-[var(--border)] px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={async () => {
                const target = endpointModalContextName;
                closeEndpointModal();
                toast.info(`Removing ${target}...`);
                await deleteContext(target);
                toast.success(`Removed cluster: ${target}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Cluster</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="endpoint-modal-cancel"
                onClick={closeEndpointModal}
                disabled={isSaving}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="endpoint-modal-save"
                onClick={() => handleSave(true)}
                disabled={isSaving || !hasChanges || !isPortValid}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save & Connect</span>
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
