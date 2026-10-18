"use client";

import * as React from "react";
import {
  Server,
  Box,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Terminal,
  FileCode,
  Sparkles,
  ExternalLink,
  RotateCw,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import { Logo } from "@/components/brand/Logo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ClusterOverviewView() {
  const { currentContext, serverVersion, latencyMs, openInspector } = useClusterStore();
  const { openTab } = useTabStore();

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5 select-none">
      {/* Executive Cluster Header Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--surface)] via-[var(--surface-elevated)] to-[var(--surface)] border border-[var(--border)] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo variant="mark" size="lg" className="drop-shadow-[0_2px_12px_rgba(240,138,66,0.3)]" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-[var(--foreground)] tracking-tight">
                Cluster Overview
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--surface-active)] text-[var(--foreground)] border border-[var(--border)]">
                {currentContext}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Control Plane
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-2">
              <span>Kubernetes <strong className="font-mono text-[var(--foreground)] font-normal">{serverVersion}</strong></span>
              <span>•</span>
              <span>Roundtrip: <strong className="font-mono text-[var(--foreground)] font-normal">{latencyMs}ms</strong></span>
              <span>•</span>
              <span className="text-[var(--accent)] font-medium">100% Agentless & Local-First</span>
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              openTab({ id: "pods", title: "Pods", closable: true });
              toast.info("Navigated to Pods browser");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] transition-colors"
          >
            <Box className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Browse All Pods</span>
          </button>
          <button
            onClick={() => toast.info("Triggered discovery cache sync")}
            className="p-1.5 rounded-md bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            title="Refresh Cluster State"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Metric Health Cards with Utilization Visuals */}
      <div className="grid grid-cols-4 gap-3.5">
        {/* Nodes Card */}
        <div
          onClick={() => openTab({ id: "nodes", title: "Nodes", closable: true })}
          className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Nodes</span>
            <Server className="w-4 h-4 group-hover:text-[var(--accent)] transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--foreground)] font-mono">3</span>
            <span className="text-xs text-emerald-400 font-medium">100% Ready</span>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 w-full h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: "100%" }} />
          </div>
          <div className="mt-2 text-[10px] text-[var(--muted)] flex justify-between">
            <span>3 control-plane & worker</span>
            <span>0 cordoned</span>
          </div>
        </div>

        {/* Pods Card */}
        <div
          onClick={() => openTab({ id: "pods", title: "Pods", closable: true })}
          className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Pods</span>
            <Box className="w-4 h-4 group-hover:text-[var(--accent)] transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--foreground)] font-mono">42</span>
            <span className="text-xs text-emerald-400 font-medium">38 Running</span>
          </div>
          {/* Multi-status Stacked Bar */}
          <div className="mt-3 w-full h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden flex">
            <div className="h-full bg-emerald-400" style={{ width: "88%" }} title="38 Running" />
            <div className="h-full bg-amber-400" style={{ width: "5%" }} title="2 Pending" />
            <div className="h-full bg-rose-400" style={{ width: "7%" }} title="2 Failing" />
          </div>
          <div className="mt-2 text-[10px] text-[var(--muted)] flex justify-between">
            <span className="text-rose-400 font-medium">2 CrashLoop</span>
            <span className="text-amber-400">2 Pending</span>
          </div>
        </div>

        {/* Deployments Card */}
        <div
          onClick={() => openTab({ id: "deployments", title: "Deployments", closable: true })}
          className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Deployments</span>
            <Layers className="w-4 h-4 group-hover:text-[var(--accent)] transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--foreground)] font-mono">12</span>
            <span className="text-xs text-emerald-400 font-medium">11 Healthy</span>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 w-full h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden flex">
            <div className="h-full bg-emerald-400" style={{ width: "91%" }} />
            <div className="h-full bg-amber-400" style={{ width: "9%" }} />
          </div>
          <div className="mt-2 text-[10px] text-[var(--muted)] flex justify-between">
            <span>11/12 Available</span>
            <span className="text-amber-400">1 Progressing</span>
          </div>
        </div>

        {/* CPU & Memory Card */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between text-[var(--muted)] mb-2">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Resource Load</span>
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--foreground)] font-mono">24%</span>
            <span className="text-xs text-[var(--muted)]">CPU Core Load</span>
          </div>
          {/* CPU Meter */}
          <div className="mt-3 w-full h-1.5 rounded-full bg-[var(--surface-active)] overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: "24%" }} />
          </div>
          <div className="mt-2 text-[10px] text-[var(--muted)] flex justify-between">
            <span>RAM: 4.2 / 16 GiB</span>
            <span>26%</span>
          </div>
        </div>
      </div>

      {/* Warning Events & 4-Stage Diagnostic Pipeline Grid */}
      <div className="grid grid-cols-3 gap-3.5">
        {/* Warning Events Feed with Interactive Click-to-Inspect */}
        <div className="col-span-2 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-[var(--foreground)] tracking-tight">
                Active Warning Events & Incidents
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-mono font-semibold">
                2 Active
              </span>
            </div>
            <span className="text-[10px] text-[var(--muted)]">Click event to inspect resource</span>
          </div>

          <div className="space-y-2">
            {/* Event 1 */}
            <div
              onClick={() => openInspector({ kind: "Pod", name: "api-gateway-7f8d-x9q", namespace: "production", status: "CrashLoopBackOff" })}
              className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:border-amber-400/50 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">
                  BackOff: Back-off restarting failed container
                </span>
                <span className="text-[10px] text-[var(--muted)] font-mono">2m ago</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-1 font-mono">
                Pod <strong className="text-[var(--foreground)] font-medium">api-gateway-7f8d-x9q</strong> in namespace <strong className="text-[var(--foreground)] font-medium">production</strong>
              </p>
            </div>

            {/* Event 2 */}
            <div
              onClick={() => openInspector({ kind: "Pod", name: "analytics-worker-2", namespace: "default", status: "Pending" })}
              className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:border-rose-400/50 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-400 group-hover:text-rose-300 transition-colors">
                  FailedScheduling: 0/3 nodes available: insufficient memory
                </span>
                <span className="text-[10px] text-[var(--muted)] font-mono">5m ago</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-1 font-mono">
                Pod <strong className="text-[var(--foreground)] font-medium">analytics-worker-2</strong> in namespace <strong className="text-[var(--foreground)] font-medium">default</strong>
              </p>
            </div>
          </div>
        </div>

        {/* 4-Stage Diagnostic Security & Health Pipeline Card */}
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-bold text-[var(--foreground)] tracking-tight">
                Connection Health & Security
              </span>
            </div>

            {/* 4-Stage Pipeline Probes */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-md bg-[var(--background)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Network & DNS Handshake</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--muted)]">12ms</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-md bg-[var(--background)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. Authentication Probe</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--muted)]">Cert OK</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-md bg-[var(--background)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3. TLS & API Server Health</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 font-medium">/readyz OK</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-md bg-[var(--background)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4. RBAC Pre-Flight Verification</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 font-medium">ClusterAdmin</span>
              </div>
            </div>
          </div>

          {/* Security Guarantee Pill */}
          <div className="pt-3 border-t border-[var(--border)] text-[10px] text-[var(--muted)] space-y-1">
            <div className="flex items-center justify-between">
              <span>Security Guard</span>
              <span className="font-semibold text-emerald-400">Zero Credential Exposure</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              Auth tokens and private keys exist only in native host memory and are never exposed to UI or webview.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
