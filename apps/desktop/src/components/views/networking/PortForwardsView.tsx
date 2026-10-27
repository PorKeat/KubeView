"use client";

import * as React from "react";
import { ArrowLeftRight, Activity, RefreshCw, Square, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import { EmptyState, Tooltip } from "@/components/ui";
import type { PortForwardSession } from "@kubeview/contracts";

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let amount = value / 1024;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  return `${amount.toFixed(1)} ${units[index]}`;
}

export function PortForwardsView() {
  const {
    currentContext,
    currentNamespace,
    availableNamespaces,
    services,
    pods,
    portForwards,
    isPortForwardsLoading,
    portForwardsError,
    loadPortForwards,
    startPortForward,
    stopPortForward,
  } = useClusterStore();

  const [targetKind, setTargetKind] = React.useState<"service" | "pod">(
    "service",
  );
  const [namespace, setNamespace] = React.useState(
    currentNamespace === "all" ? "default" : currentNamespace,
  );
  const [targetName, setTargetName] = React.useState("");
  const [remotePort, setRemotePort] = React.useState("");
  const [localPort, setLocalPort] = React.useState("");
  const [isStarting, setIsStarting] = React.useState(false);

  React.useEffect(() => {
    setNamespace(currentNamespace === "all" ? "default" : currentNamespace);
  }, [currentNamespace]);

  React.useEffect(() => {
    if (currentContext) void loadPortForwards();
  }, [currentContext, loadPortForwards]);

  React.useEffect(() => {
    if (!currentContext) return;
    const timer = setInterval(() => {
      void loadPortForwards();
    }, 2000);
    return () => clearInterval(timer);
  }, [currentContext, loadPortForwards]);

  const activeSessions = portForwards.filter(
    (session) => session.status === "active",
  );
  const totalConnections = portForwards.reduce(
    (sum, session) => sum + session.totalConnections,
    0,
  );
  const activeConnections = portForwards.reduce(
    (sum, session) => sum + session.activeConnections,
    0,
  );

  const candidates = React.useMemo(() => {
    if (targetKind === "service") {
      return services
        .filter((service) => service.namespace === namespace)
        .map((service) => service.name);
    }
    return pods
      .filter((pod) => pod.namespace === namespace)
      .map((pod) => pod.name);
  }, [targetKind, namespace, services, pods]);

  const handleStart = async () => {
    const name = targetName.trim();
    if (!name) return;
    const remote = Number.parseInt(remotePort, 10) || 0;
    if (targetKind === "pod" && remote <= 0) return;
    setIsStarting(true);
    try {
      const session = await startPortForward({
        namespace,
        targetKind,
        targetName: name,
        remotePort: remote,
        localPort: Number.parseInt(localPort, 10) || 0,
      });
      if (session) {
        setTargetName("");
        setRemotePort("");
        setLocalPort("");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const canStart =
    targetName.trim().length > 0 &&
    (targetKind === "service" || Number.parseInt(remotePort, 10) > 0) &&
    !isStarting;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <div className="border-b border-[var(--border)] px-3 sm:px-4 py-3 shrink-0 glass-panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
                Port Forwarding Manager
              </h2>
              <p className="text-[10px] font-mono text-[var(--muted)]">
                Loopback TCP tunnels to pods and services
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-[var(--muted)]">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {activeSessions.length} active
            </span>
            <span>{activeConnections} live conn</span>
            <span>{totalConnections} total</span>
            <Tooltip content="Refresh port forwards">
              <button
                type="button"
                onClick={() => void loadPortForwards()}
                disabled={isPortForwardsLoading}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                aria-label="Refresh port forwards"
              >
                <RefreshCw
                  className={cn(
                    "w-3.5 h-3.5",
                    isPortForwardsLoading &&
                      "animate-spin text-[var(--accent)]",
                  )}
                />
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] text-[var(--muted)] font-mono">
              Target kind
            </span>
            <select
              value={targetKind}
              onChange={(event) =>
                setTargetKind(event.target.value as "service" | "pod")
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
              aria-label="Port forward target kind"
            >
              <option value="service">Service</option>
              <option value="pod">Pod</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[10px] text-[var(--muted)] font-mono">
              Namespace
            </span>
            <select
              value={namespace}
              onChange={(event) => setNamespace(event.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
              aria-label="Port forward namespace"
            >
              {availableNamespaces
                .filter((item) => item !== "all")
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-[10px] text-[var(--muted)] font-mono">
              {targetKind === "service" ? "Service" : "Pod"} name
            </span>
            <input
              value={targetName}
              onChange={(event) => setTargetName(event.target.value)}
              list="port-forward-targets"
              placeholder={`Select or type a ${targetKind}`}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)]"
              aria-label="Port forward target name"
              data-testid="port-forward-target"
            />
            <datalist id="port-forward-targets">
              {candidates.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <label className="space-y-1">
            <span className="text-[10px] text-[var(--muted)] font-mono">
              Remote port
            </span>
            <input
              value={remotePort}
              onChange={(event) => setRemotePort(event.target.value)}
              inputMode="numeric"
              placeholder={targetKind === "service" ? "auto" : "8080"}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)]"
              aria-label="Remote port"
              data-testid="port-forward-remote-port"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[10px] text-[var(--muted)] font-mono">
              Local port
            </span>
            <input
              value={localPort}
              onChange={(event) => setLocalPort(event.target.value)}
              inputMode="numeric"
              placeholder="auto"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)]"
              aria-label="Local port"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-[var(--muted)] font-mono">
            Listeners bind to 127.0.0.1 only. A service target resolves one
            ready endpoint pod.
          </span>
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={!canStart}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[var(--accent-hover)] cursor-pointer disabled:opacity-50"
            data-testid="port-forward-start"
          >
            <Zap className="w-3.5 h-3.5" />
            {isStarting ? "Starting..." : "Start Forward"}
          </button>
        </div>

        {portForwardsError && (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-600 dark:text-rose-400">
            {portForwardsError}
          </div>
        )}
      </div>

      <div
        className="flex-1 overflow-auto min-h-0"
        data-testid="portforwards-table-scroll"
      >
        {portForwards.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              variant="empty"
              title="No port forwards yet"
              description="Start a loopback tunnel to reach a pod port without exposing it outside your machine."
              scopeBadge={`namespace: ${namespace}`}
            />
          </div>
        ) : (
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--border)]">
              <tr className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider h-8 whitespace-nowrap">
                <th className="w-[20%] py-1 px-2">Target</th>
                <th className="w-[10%] py-1 px-2">Namespace</th>
                <th className="w-[13%] py-1 px-2">Local</th>
                <th className="w-[7%] py-1 px-2">Remote</th>
                <th className="w-[9%] py-1 px-2">Status</th>
                <th className="w-[11%] py-1 px-2">Connections</th>
                <th className="w-[13%] py-1 px-2">Traffic</th>
                <th className="w-[9%] py-1 px-2">Started</th>
                <th className="w-[8%] py-1 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {portForwards.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onStop={() => void stopPortForward(session.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  onStop,
}: {
  session: PortForwardSession;
  onStop: () => void;
}) {
  const active = session.status === "active";
  return (
    <tr
      className="h-10 hover:bg-[var(--surface-hover)] transition-colors"
      data-testid="portforwards-row"
    >
      <td className="py-1 px-3 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
            {session.targetKind}
          </span>
          <span className="text-[var(--foreground)] truncate max-w-[180px]">
            {session.targetName}
          </span>
          {session.targetPod !== session.targetName && (
            <span className="text-[9px] text-[var(--muted)]">
              pod {session.targetPod}
            </span>
          )}
        </div>
      </td>
      <td className="py-1 px-3 font-mono text-[var(--muted)]">
        {session.namespace}
      </td>
      <td className="py-1 px-3 font-mono text-emerald-600 dark:text-emerald-400">
        {session.address}:{session.localPort}
      </td>
      <td className="py-1 px-3 font-mono text-[var(--muted)]">
        {session.remotePort}
      </td>
      <td className="py-1 px-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border",
            active
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-black/5 dark:bg-white/5 text-[var(--muted)] border-[var(--border)]",
          )}
        >
          <Activity className="w-2.5 h-2.5" />
          {session.status}
        </span>
      </td>
      <td className="py-1 px-3 font-mono tabular-nums">
        <span className="text-[var(--foreground)]">
          {session.activeConnections}
        </span>
        <span className="text-[var(--muted)]">/{session.totalConnections}</span>
      </td>
      <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)]">
        ↑ {formatBytes(session.bytesSent)} · ↓{" "}
        {formatBytes(session.bytesReceived)}
      </td>
      <td className="py-1 px-3 font-mono text-[10px] text-[var(--muted)]">
        {new Date(session.startedAt).toLocaleTimeString()}
      </td>
      <td className="py-1 px-3 text-right">
        {active ? (
          <Tooltip content="Stop port forward">
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-500/15 cursor-pointer"
              aria-label={`Stop port forward ${session.id}`}
            >
              <Square className="w-2.5 h-2.5" />
              Stop
            </button>
          </Tooltip>
        ) : (
          <span className="text-[10px] font-mono text-[var(--muted)]">—</span>
        )}
      </td>
    </tr>
  );
}
