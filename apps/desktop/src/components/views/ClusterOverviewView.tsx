"use client";

import * as React from "react";
import {
  Activity,
  Server,
  Box,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  ArrowUpRight,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import { Logo } from "@/components/brand/Logo";

export function ClusterOverviewView() {
  const { currentContext, serverVersion, latencyMs } = useClusterStore();
  const { openTab } = useTabStore();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Cluster Header Summary */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Logo variant="mark" size="lg" />
          <div>
            <h1 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
              <span>Cluster Overview</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-hover)] font-mono text-[var(--muted)]">
                {currentContext}
              </span>
            </h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Kubernetes {serverVersion} • API latency: {latencyMs}ms • 100% Agentless
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--surface-hover)] text-xs text-[var(--status-healthy)] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Control Plane Healthy</span>
          </div>
        </div>
      </div>

      {/* Top Metric Gauges */}
      <div className="grid grid-cols-4 gap-3">
        {/* Nodes Card */}
        <div
          onClick={() => openTab({ id: "nodes", title: "Nodes", closable: true })}
          className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-medium">Nodes</span>
            <Server className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[var(--foreground)]">3</span>
            <span className="text-xs text-[var(--status-healthy)]">3 Ready</span>
          </div>
          <div className="mt-2 text-[10px] text-[var(--muted)]">0 NotReady • 0 Cordoned</div>
        </div>

        {/* Pods Card */}
        <div
          onClick={() => openTab({ id: "pods", title: "Pods", closable: true })}
          className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-medium">Pods</span>
            <Box className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[var(--foreground)]">42</span>
            <span className="text-xs text-[var(--status-healthy)]">38 Running</span>
          </div>
          <div className="mt-2 text-[10px] text-[var(--status-critical)]">2 CrashLoop • 2 Pending</div>
        </div>

        {/* Workloads Card */}
        <div
          onClick={() => openTab({ id: "deployments", title: "Deployments", closable: true })}
          className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-medium">Deployments</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[var(--foreground)]">12</span>
            <span className="text-xs text-[var(--status-healthy)]">11 Healthy</span>
          </div>
          <div className="mt-2 text-[10px] text-[var(--status-warning)]">1 Progressing</div>
        </div>

        {/* CPU & Memory Card */}
        <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-medium">Resource Pressure</span>
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[var(--foreground)]">24%</span>
            <span className="text-xs text-[var(--muted)]">CPU Core Load</span>
          </div>
          <div className="mt-2 text-[10px] text-[var(--muted)]">Memory: 4.2 GiB / 16 GiB (26%)</div>
        </div>
      </div>

      {/* Warning Events & Problem Workloads Section */}
      <div className="grid grid-cols-3 gap-3">
        {/* Warning Events Feed */}
        <div className="col-span-2 p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--status-warning)]" />
              <span className="text-xs font-semibold text-[var(--foreground)]">Recent Warning Events</span>
            </div>
            <span className="text-[10px] text-[var(--muted)]">Last 30m</span>
          </div>

          <div className="space-y-2">
            <div
              onClick={() => openTab({ id: "pods", title: "Pods", closable: true })}
              className="p-2.5 rounded bg-[var(--background)] border border-[var(--border)] hover:border-[var(--status-warning)] cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-[var(--status-warning)]">BackOff: Back-off restarting failed container</span>
                <span className="text-[10px] text-[var(--muted)] font-mono">2m ago</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                Pod <span className="font-mono text-[var(--foreground)]">api-gateway-7f8d-x9q</span> in namespace <span className="font-mono">production</span>
              </div>
            </div>

            <div
              onClick={() => openTab({ id: "pods", title: "Pods", closable: true })}
              className="p-2.5 rounded bg-[var(--background)] border border-[var(--border)] hover:border-[var(--status-critical)] cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-[var(--status-critical)]">FailedScheduling: 0/3 nodes available: insufficient memory</span>
                <span className="text-[10px] text-[var(--muted)] font-mono">5m ago</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-1">
                Pod <span className="font-mono text-[var(--foreground)]">analytics-worker-2</span> in namespace <span className="font-mono">default</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launch & Diagnostic Status */}
        <div className="p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Logo variant="mark" size="sm" />
              <span className="text-xs font-semibold text-[var(--foreground)]">Agentless Engine</span>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              KubeView communicates directly with your Kubernetes API server over TLS using your local kubeconfig credentials.
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--border)] space-y-1.5 text-xs">
            <div className="flex justify-between text-[var(--muted)]">
              <span>Auth Method</span>
              <span className="font-mono text-[var(--foreground)]">Client Certificate</span>
            </div>
            <div className="flex justify-between text-[var(--muted)]">
              <span>Informer Sync</span>
              <span className="text-[var(--status-healthy)] font-medium">Synchronized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
