"use client";

import * as React from "react";
import { Box, Cpu, RotateCw, Tag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBeacon } from "@/components/ui";
import type { DaemonSetSummary } from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";

export interface InspectorDaemonSetOverviewProps {
  currentResource: SelectedResource;
  daemonSet: DaemonSetSummary;
  onViewPods: () => void;
  onRestart: () => void;
  onDelete: () => void;
}

export function InspectorDaemonSetOverview({
  currentResource,
  daemonSet,
  onViewPods,
  onRestart,
  onDelete,
}: InspectorDaemonSetOverviewProps) {
  const ds = daemonSet;
  const desired = ds.desiredNumberScheduled ?? 0;
  const ready = ds.numberReady ?? 0;
  const available = ds.numberAvailable ?? 0;
  const nodeSelector = Object.entries(ds.nodeSelector ?? {});
  const nodeSelectorLabel =
    nodeSelector.length > 0
      ? nodeSelector.map(([k, v]) => `${k}=${v}`).join(", ")
      : "all nodes";
  const selector = ds.selector ?? {};
  const images = ds.images ?? [];
  const labels = ds.labels ?? {};
  const annotations = ds.annotations ?? {};
  const createdLabel = ds.creationTimestamp
    ? new Date(ds.creationTimestamp).toLocaleString()
    : "";
  const statusVariant =
    ds.status === "Healthy"
      ? "healthy"
      : ds.status === "Degraded"
        ? "critical"
        : ds.status === "Progressing"
          ? "pending"
          : "muted";

  return (
    <div className="space-y-4 text-xs">
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xs space-y-4">
        <div className="space-y-1.5 min-w-0">
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#F08A42]" />
            DaemonSet Health
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBeacon variant={statusVariant} label={ds.status} size="sm" />
            <span className="text-[11px] text-[var(--muted)] font-mono">
              {ready}/{desired} nodes ready, {ds.updatedNumberScheduled}{" "}
              up-to-date, {available} available
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ActionButton icon={Box} label="View Pods" onClick={onViewPods} />
          <ActionButton
            icon={RotateCw}
            label="Restart Rollout"
            onClick={onRestart}
          />
          <ActionButton
            icon={Trash2}
            label="Delete"
            onClick={onDelete}
            danger
          />
        </div>
        {ds.updateStrategy === "OnDelete" && (
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
            OnDelete strategy: a rollout patches the pod template, but pods
            update only when you delete them.
          </div>
        )}
        {ds.numberMisscheduled > 0 && (
          <div className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-[11px] leading-relaxed text-rose-600 dark:text-rose-400">
            {ds.numberMisscheduled} daemon pod(s) are running on nodes that
            should not run this DaemonSet.
          </div>
        )}
        <div
          data-testid="daemonset-coverage-grid"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          <ReplicaTile label="Desired" value={desired} />
          <ReplicaTile
            label="Current"
            value={ds.currentNumberScheduled}
            tone={ds.currentNumberScheduled !== desired ? "warning" : "healthy"}
          />
          <ReplicaTile
            label="Ready"
            value={ready}
            tone={ready < desired ? "warning" : "healthy"}
          />
          <ReplicaTile
            label="Up-to-date"
            value={ds.updatedNumberScheduled}
            tone={ds.updatedNumberScheduled < desired ? "warning" : "healthy"}
          />
          <ReplicaTile
            label="Available"
            value={available}
            tone={available < desired ? "warning" : "healthy"}
          />
          <ReplicaTile
            label="Unavailable"
            value={ds.numberUnavailable}
            tone={ds.numberUnavailable > 0 ? "critical" : "muted"}
          />
          <ReplicaTile
            label="Misscheduled"
            value={ds.numberMisscheduled}
            tone={ds.numberMisscheduled > 0 ? "critical" : "muted"}
          />
        </div>
        <div className="rounded-xl border border-[var(--border)]/70 overflow-hidden">
          <div className="grid grid-cols-5 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">
            {["NAME", "READY", "UP-TO-DATE", "AVAILABLE", "AGE"].map(
              (column) => (
                <span key={column}>{column}</span>
              ),
            )}
          </div>
          <div className="grid grid-cols-5 px-2.5 py-1.5 font-mono text-[10px] text-[var(--foreground)]">
            {[
              ds.name,
              `${ready}/${desired}`,
              ds.updatedNumberScheduled,
              available,
              ds.age,
            ].map((value, index) => (
              <span
                key={`${value}-${index}`}
                className={
                  index === 0 ? "truncate pr-2" : "tabular-nums truncate"
                }
                title={String(value)}
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#F08A42]" />
            Resource Metadata
          </span>
          <span className="text-[10px] font-mono text-[var(--muted)]">
            {createdLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetaItem label="Namespace" value={ds.namespace} />
          <MetaItem label="Kind" value={currentResource.kind} />
          <MetaItem label="Update Strategy" value={ds.updateStrategy} />
          <MetaItem label="Node Selector" value={nodeSelectorLabel} />
          <MetaItem label="Max Unavailable" value={ds.maxUnavailable} />
          <MetaItem label="Max Surge" value={ds.maxSurge} />
          <MetaItem
            label="Min Ready Seconds"
            value={String(ds.minReadySeconds)}
          />
          <MetaItem
            label="Revision History"
            value={String(ds.revisionHistoryLimit)}
          />
          <MetaItem
            label="Observed Generation"
            value={`${ds.observedGeneration}/${ds.generation}`}
          />
          <MetaItem label="Collision Count" value={String(ds.collisionCount)} />
          <MetaItem label="Images" value={String(images.length)} />
        </div>
        <SectionTitle icon={<Tag className="w-3 h-3 opacity-60" />}>
          Selector
        </SectionTitle>
        {Object.keys(selector).length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] italic">
            No label selector.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(selector).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
              >
                <span>{key}</span>
                <span className="opacity-40">=</span>
                <span className="text-[var(--foreground)] font-medium truncate max-w-[150px]">
                  {value}
                </span>
              </span>
            ))}
          </div>
        )}
        <SectionTitle icon={<Box className="w-3 h-3 opacity-60" />}>
          Images
        </SectionTitle>
        {images.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] italic">
            No container images.
          </div>
        ) : (
          <div className="space-y-1">
            {images.map((image) => (
              <div
                key={image}
                className="text-[11px] font-mono text-[var(--foreground)] bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]/70 rounded-md px-2 py-1 truncate"
                title={image}
              >
                {image}
              </div>
            ))}
          </div>
        )}
        {Object.keys(labels).length > 0 && (
          <>
            <SectionTitle icon={<Tag className="w-3 h-3 opacity-60" />}>
              Labels
            </SectionTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(labels)
                .slice(0, 12)
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                  >
                    <span>{key}</span>
                    <span className="opacity-40">=</span>
                    <span className="text-[var(--foreground)] font-medium truncate max-w-[150px]">
                      {value}
                    </span>
                  </span>
                ))}
            </div>
          </>
        )}
        {Object.keys(annotations).length > 0 && (
          <details className="rounded-xl border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] p-2.5">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold select-none">
              Annotations ({Object.keys(annotations).length})
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {Object.entries(annotations).map(([key, value]) => (
                <div key={key} className="text-[10px] font-mono break-all">
                  <span className="text-[var(--muted)]">{key}: </span>
                  <span className="text-[var(--foreground)]">{value}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer shadow-2xs active:scale-[0.98]",
        danger
          ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
          : "bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
function ReplicaTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "healthy" | "warning" | "critical" | "muted";
}) {
  return (
    <div className="rounded-lg border border-[var(--border)]/70 bg-black/[0.02] dark:bg-white/[0.02] px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold whitespace-nowrap">
        {label}
      </div>
      <div
        className={cn(
          "text-sm font-mono font-semibold tabular-nums mt-0.5",
          tone === "healthy" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-500",
          tone === "critical" && "text-rose-500",
          tone === "muted" && "text-[var(--muted)]",
          tone === "default" && "text-[var(--foreground)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] text-[var(--muted)] block">{label}</span>
      <span
        className="font-mono text-[var(--foreground)] font-medium truncate block"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold flex items-center gap-1">
      {icon}
      {children}
    </div>
  );
}
