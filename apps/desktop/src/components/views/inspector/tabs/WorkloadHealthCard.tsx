"use client";

import * as React from "react";
import {
  Box,
  Database,
  Layers,
  Repeat,
  RotateCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBeacon } from "@/components/ui";
import type {
  DeploymentSummary,
  ReplicaSetSummary,
  StatefulSetSummary,
} from "@kubeview/contracts";

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

export function WorkloadHealthCard({
  deployment,
  replicaSet,
  statefulSet,
  onViewPods,
  onScale,
  onRestart,
  onDelete,
}: {
  deployment?: DeploymentSummary;
  replicaSet?: ReplicaSetSummary;
  statefulSet?: StatefulSetSummary;
  onViewPods: () => void;
  onScale: () => void;
  onRestart?: () => void;
  onDelete: () => void;
}) {
  const data = deployment ?? replicaSet ?? statefulSet;
  if (!data) return null;

  const isDeployment = Boolean(deployment);
  const isReplicaSet = Boolean(replicaSet);
  const isStatefulSet = Boolean(statefulSet);
  const desired = data.desiredReplicas ?? 0;
  const ready = data.readyReplicas ?? 0;
  const canRestart = isDeployment || isStatefulSet;

  const statusVariant =
    data.status === "Healthy"
      ? "healthy"
      : data.status === "Degraded"
        ? "critical"
        : data.status === "Progressing"
          ? "pending"
          : data.status === "Paused"
            ? "warning"
            : "muted";

  const KindIcon = isDeployment ? Layers : isReplicaSet ? Repeat : Database;

  const healthSummary = isDeployment
    ? `${ready}/${desired} replicas ready, ${deployment!.updatedReplicas} up-to-date, ${deployment!.availableReplicas} available`
    : isReplicaSet
      ? `${ready}/${desired} replicas ready, ${replicaSet!.currentReplicas} current`
      : `${ready}/${desired} replicas ready, ${statefulSet!.updatedReplicas} updated, ${statefulSet!.currentReplicas} current`;

  const summaryColumns = isDeployment
    ? ["NAME", "READY", "UP-TO-DATE", "AVAILABLE", "AGE"]
    : isReplicaSet
      ? ["NAME", "DESIRED", "CURRENT", "READY", "AGE"]
      : ["NAME", "READY", "UPDATED", "CURRENT", "AGE"];

  const summaryValues = isDeployment
    ? [
        data.name,
        `${ready}/${desired}`,
        deployment!.updatedReplicas,
        deployment!.availableReplicas,
        data.age,
      ]
    : isReplicaSet
      ? [data.name, desired, replicaSet!.currentReplicas, ready, data.age]
      : [
          data.name,
          `${ready}/${desired}`,
          statefulSet!.updatedReplicas,
          statefulSet!.currentReplicas,
          data.age,
        ];

  return (
    <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
            <KindIcon className="w-3.5 h-3.5 text-[#F08A42]" />
            Workload Health
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBeacon
              variant={statusVariant}
              label={data.status}
              size="sm"
            />
            <span className="text-[11px] text-[var(--muted)] font-mono">
              {healthSummary}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <ActionButton icon={Box} label="View Pods" onClick={onViewPods} />
        <ActionButton
          icon={SlidersHorizontal}
          label="Scale"
          onClick={onScale}
        />
        {canRestart && onRestart && (
          <ActionButton
            icon={RotateCw}
            label="Restart Rollout"
            onClick={onRestart}
          />
        )}
        <ActionButton icon={Trash2} label="Delete" onClick={onDelete} danger />
      </div>

      {isReplicaSet && replicaSet!.ownerDeployment && (
        <div className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-[11px] leading-relaxed text-[var(--muted)]">
          Replicas are managed by Deployment{" "}
          <strong className="text-[var(--foreground)] font-mono">
            {replicaSet!.ownerDeployment}
          </strong>
          . Scaling this ReplicaSet directly may be reconciled back by the
          Deployment controller.
        </div>
      )}

      {isStatefulSet && statefulSet!.updateStrategy === "OnDelete" && (
        <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
          OnDelete strategy: a rollout patches the pod template, but pods update
          only when you delete them.
        </div>
      )}

      <div
        className={cn(
          "grid gap-2",
          isReplicaSet
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-5",
        )}
      >
        <ReplicaTile label="Desired" value={desired} />
        {isDeployment ? (
          <>
            <ReplicaTile
              label="Ready"
              value={ready}
              tone={ready < desired ? "warning" : "healthy"}
            />
            <ReplicaTile
              label="Up-to-date"
              value={deployment!.updatedReplicas}
              tone={
                deployment!.updatedReplicas < desired ? "warning" : "healthy"
              }
            />
            <ReplicaTile
              label="Available"
              value={deployment!.availableReplicas}
              tone={
                deployment!.availableReplicas < desired ? "warning" : "healthy"
              }
            />
            <ReplicaTile
              label="Unavailable"
              value={deployment!.unavailableReplicas}
              tone={deployment!.unavailableReplicas > 0 ? "critical" : "muted"}
            />
          </>
        ) : isReplicaSet ? (
          <>
            <ReplicaTile
              label="Current"
              value={replicaSet!.currentReplicas}
              tone={
                replicaSet!.currentReplicas !== desired ? "warning" : "healthy"
              }
            />
            <ReplicaTile
              label="Ready"
              value={ready}
              tone={ready < desired ? "warning" : "healthy"}
            />
            <ReplicaTile
              label="Available"
              value={replicaSet!.availableReplicas}
              tone={
                replicaSet!.availableReplicas < desired ? "warning" : "healthy"
              }
            />
          </>
        ) : (
          <>
            <ReplicaTile
              label="Current"
              value={statefulSet!.currentReplicas}
              tone={
                statefulSet!.currentReplicas !== desired ? "warning" : "healthy"
              }
            />
            <ReplicaTile
              label="Ready"
              value={ready}
              tone={ready < desired ? "warning" : "healthy"}
            />
            <ReplicaTile
              label="Updated"
              value={statefulSet!.updatedReplicas}
              tone={
                statefulSet!.updatedReplicas < desired ? "warning" : "healthy"
              }
            />
            <ReplicaTile
              label="Available"
              value={statefulSet!.availableReplicas}
              tone={
                statefulSet!.availableReplicas < desired ? "warning" : "healthy"
              }
            />
          </>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)]/70 overflow-hidden">
        <div className="grid grid-cols-5 gap-1 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">
          {summaryColumns.map((column) => (
            <span key={column} className="truncate">
              {column}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1 px-2.5 py-1.5 font-mono text-[10px] text-[var(--foreground)]">
          {summaryValues.map((value, index) => (
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
  );
}
