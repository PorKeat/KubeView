"use client";

import * as React from "react";
import { Box, Database, Layers, Tag } from "lucide-react";
import type {
  DeploymentSummary,
  ReplicaSetSummary,
  StatefulSetSummary,
} from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";

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

export function WorkloadMetadataCard({
  currentResource,
  deployment,
  replicaSet,
  statefulSet,
}: {
  currentResource: SelectedResource;
  deployment?: DeploymentSummary;
  replicaSet?: ReplicaSetSummary;
  statefulSet?: StatefulSetSummary;
}) {
  const data = deployment ?? replicaSet ?? statefulSet;
  if (!data) return null;

  const isDeployment = Boolean(deployment);
  const isReplicaSet = Boolean(replicaSet);
  const isStatefulSet = Boolean(statefulSet);
  const images = data.images ?? [];
  const selector = data.selector ?? {};
  const labels = data.labels ?? {};
  const annotations = data.annotations ?? {};

  const createdLabel = data.creationTimestamp
    ? new Date(data.creationTimestamp).toLocaleString()
    : "";

  return (
    <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xs space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#F08A42]" />
          Resource Metadata
        </span>
        <span className="text-[10px] font-mono text-[var(--muted)]">
          {createdLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetaItem label="Namespace" value={data.namespace} />
        <MetaItem label="Kind" value={currentResource.kind} />
        {isDeployment ? (
          <MetaItem label="Strategy" value={deployment!.strategy} />
        ) : isReplicaSet ? (
          <MetaItem
            label="Owner Deployment"
            value={replicaSet!.ownerDeployment || "standalone"}
          />
        ) : (
          <MetaItem
            label="Service"
            value={statefulSet!.serviceName || "none"}
          />
        )}
        <MetaItem
          label="Revision"
          value={
            isDeployment
              ? deployment!.revision || "-"
              : isReplicaSet
                ? replicaSet!.revision || "-"
                : statefulSet!.currentRevision || "-"
          }
        />
        {isDeployment ? (
          <MetaItem
            label="Observed Generation"
            value={`${deployment!.observedGeneration}/${deployment!.generation}`}
          />
        ) : isReplicaSet ? (
          <MetaItem
            label="Current Replicas"
            value={String(replicaSet!.currentReplicas)}
          />
        ) : (
          <MetaItem
            label="Observed Generation"
            value={`${statefulSet!.observedGeneration}/${statefulSet!.generation}`}
          />
        )}
        <MetaItem label="Images" value={`${images.length}`} />
      </div>

      {isStatefulSet && (
        <>
          <SectionTitle icon={<Database className="w-3 h-3 opacity-60" />}>
            StatefulSet Runtime
          </SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetaItem
              label="Pod Management"
              value={statefulSet!.podManagementPolicy}
            />
            <MetaItem
              label="Update Strategy"
              value={statefulSet!.updateStrategy}
            />
            <MetaItem
              label="Partition"
              value={String(statefulSet!.partition)}
            />
            <MetaItem
              label="Max Unavailable"
              value={statefulSet!.maxUnavailable || "-"}
            />
            <MetaItem
              label="Current Revision"
              value={statefulSet!.currentRevision || "-"}
            />
            <MetaItem
              label="Update Revision"
              value={statefulSet!.updateRevision || "-"}
            />
            <MetaItem
              label="Revision History"
              value={String(statefulSet!.revisionHistoryLimit)}
            />
            <MetaItem
              label="Min Ready Seconds"
              value={String(statefulSet!.minReadySeconds)}
            />
            <MetaItem
              label="Ordinals Start"
              value={String(statefulSet!.ordinalsStart)}
            />
            <MetaItem
              label="Collision Count"
              value={String(statefulSet!.collisionCount)}
            />
            <MetaItem
              label="PVC Templates"
              value={
                statefulSet!.volumeClaimTemplates.length > 0
                  ? statefulSet!.volumeClaimTemplates.join(", ")
                  : "none"
              }
            />
            <MetaItem
              label="PVC Retain on Delete"
              value={statefulSet!.persistentVolumeClaimRetentionWhenDeleted}
            />
            <MetaItem
              label="PVC Retain on Scale"
              value={statefulSet!.persistentVolumeClaimRetentionWhenScaled}
            />
          </div>
          {(statefulSet!.persistentVolumeClaimRetentionWhenDeleted ===
            "Delete" ||
            statefulSet!.persistentVolumeClaimRetentionWhenScaled ===
              "Delete") && (
            <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
              PVC retention policy deletes persistent volume claims when this
              StatefulSet is deleted or scaled down.
            </div>
          )}
        </>
      )}

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
            {Object.keys(labels).length > 12 && (
              <span className="text-[10px] font-mono text-[var(--muted)]">
                +{Object.keys(labels).length - 12} more
              </span>
            )}
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
  );
}
