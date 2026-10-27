"use client";

import { Box, Cpu, HardDrive, Terminal } from "lucide-react";
import type { PodContainerDiagnosis } from "@kubeview/contracts";
import { StatusBeacon } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatBytes, formatMillicores, statusMeta } from "../lib/diagnosis";

function ResourceValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-[var(--border)]/70 bg-black/[0.02] px-2 py-1.5 dark:bg-white/[0.02]">
      <div className="font-mono text-[8px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className="truncate font-mono text-[10px] text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}

function ProbeRow({
  probe,
}: {
  probe: PodContainerDiagnosis["probes"][number];
}) {
  const status = statusMeta(probe.status);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-md border border-[var(--border)]/60 px-2 py-1.5">
      <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {probe.kind}
      </span>
      <StatusBeacon size="xs" variant={status.variant} label={status.label} />
      <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-[var(--foreground)]">
        {probe.handler || "not configured"}
      </span>
      {probe.message && (
        <span
          className="w-full break-words font-mono text-[9px] leading-relaxed text-[var(--muted)]"
          title={probe.message}
        >
          {probe.message}
        </span>
      )}
    </div>
  );
}

function ContainerCard({ container }: { container: PodContainerDiagnosis }) {
  const isHealthy = container.ready && container.state === "Running";
  const stateStatus = statusMeta(
    isHealthy ? "pass" : container.state === "Waiting" ? "fail" : "warning",
  );

  return (
    <div
      data-testid="pod-diagnosis-container"
      className="rounded-lg border border-[var(--border)]/80 bg-black/[0.015] p-2.5 dark:bg-white/[0.02]"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
            <Box className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-[var(--foreground)]">
              {container.name}
            </div>
            <div
              className="truncate font-mono text-[9px] text-[var(--muted)]"
              title={container.image}
            >
              {container.image}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBeacon
            size="xs"
            variant={stateStatus.variant}
            label={`${container.state} · ${container.ready ? "ready" : "not ready"}`}
          />
          <span className="font-mono text-[9px] text-[var(--muted)]">
            restarts {container.restartCount}
          </span>
          {container.exitCode !== undefined && (
            <span className="font-mono text-[9px] text-rose-600 dark:text-rose-400">
              exit {container.exitCode}
            </span>
          )}
        </div>
      </div>

      {container.stateMessage && (
        <p className="mt-2 break-words rounded-md border border-[var(--border)]/60 bg-black/[0.03] px-2 py-1.5 font-mono text-[9px] leading-relaxed text-[var(--muted)] dark:bg-black/20">
          {container.stateMessage}
        </p>
      )}

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <ResourceValue
          label="CPU request"
          value={container.requests?.cpu || "—"}
        />
        <ResourceValue
          label="Memory request"
          value={container.requests?.memory || "—"}
        />
        <ResourceValue label="CPU limit" value={container.limits?.cpu || "—"} />
        <ResourceValue
          label="Memory limit"
          value={container.limits?.memory || "—"}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[9px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          {container.metricsAvailable
            ? formatMillicores(container.cpuUsageMillicores)
            : "usage unavailable"}
        </span>
        <span className="inline-flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          {container.metricsAvailable
            ? formatBytes(container.memoryUsageBytes)
            : "usage unavailable"}
        </span>
      </div>

      <div className="mt-2">
        <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
          Probes
        </div>
        <div className="mt-1 space-y-1">
          {container.probes.length === 0 ? (
            <p className="font-mono text-[9px] text-[var(--muted)]">
              No probes configured.
            </p>
          ) : (
            container.probes.map((probe) => (
              <ProbeRow key={probe.kind} probe={probe} />
            ))
          )}
        </div>
      </div>

      {(container.logExcerpt || container.logError) && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
            <Terminal className="h-3 w-3" />
            {container.logSource ? `${container.logSource} logs` : "logs"}
          </div>
          {container.logError && (
            <p className="mt-1 break-words font-mono text-[9px] text-rose-600 dark:text-rose-400">
              {container.logError}
            </p>
          )}
          {container.logExcerpt && (
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--border)]/70 bg-[#1e1e1e] p-2 font-mono text-[9px] leading-relaxed text-slate-200">
              {container.logExcerpt}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function DiagnosisContainers({
  containers,
}: {
  containers: PodContainerDiagnosis[];
}) {
  if (containers.length === 0) return null;

  return (
    <section
      data-testid="pod-diagnosis-containers"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)]">
        <Box className="h-3.5 w-3.5 text-[var(--accent)]" />
        Container evidence
      </div>
      <div className={cn("mt-2 space-y-2")}>
        {containers.map((container) => (
          <ContainerCard key={container.name} container={container} />
        ))}
      </div>
    </section>
  );
}
