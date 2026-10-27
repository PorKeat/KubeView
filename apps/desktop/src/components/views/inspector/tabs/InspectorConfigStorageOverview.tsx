"use client";

import * as React from "react";
import {
  Database,
  FileCode,
  FolderLock,
  HardDrive,
  Pencil,
} from "lucide-react";
import { StatusBeacon, type StatusBeaconVariant } from "@/components/ui";
import type {
  ConfigMapSummary,
  PersistentVolumeSummary,
  SecretSummary,
  StorageClassSummary,
} from "@kubeview/contracts";
import type { SelectedResource } from "@/stores/clusterStore";

export type ConfigStorageData =
  | ConfigMapSummary
  | SecretSummary
  | PersistentVolumeSummary
  | StorageClassSummary;

function formatBytes(bytes: number): string {
  if (bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function statusVariant(status: string): StatusBeaconVariant {
  switch (status) {
    case "Active":
    case "Bound":
    case "Default":
      return "healthy";
    case "Immutable":
    case "Released":
    case "Available":
      return "warning";
    case "Failed":
      return "critical";
    default:
      return "muted";
  }
}

function resourceIcon(kind: string) {
  switch (kind) {
    case "ConfigMap":
      return FileCode;
    case "Secret":
      return FolderLock;
    case "PersistentVolume":
      return HardDrive;
    default:
      return Database;
  }
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 break-words text-[11px] font-mono text-[var(--foreground)]">
        {value || "—"}
      </div>
    </div>
  );
}

export function InspectorConfigStorageOverview({
  currentResource,
  data,
}: {
  currentResource: SelectedResource;
  data: ConfigStorageData;
}) {
  const Icon = resourceIcon(currentResource.kind);
  const createdLabel = data.creationTimestamp
    ? new Date(data.creationTimestamp).toLocaleString()
    : "—";
  const labels = data.labels ?? {};
  const annotations = data.annotations ?? {};
  const configMap =
    currentResource.kind === "ConfigMap"
      ? (data as ConfigMapSummary)
      : undefined;
  const secret =
    currentResource.kind === "Secret" ? (data as SecretSummary) : undefined;
  const volume =
    currentResource.kind === "PersistentVolume"
      ? (data as PersistentVolumeSummary)
      : undefined;
  const storageClass =
    currentResource.kind === "StorageClass"
      ? (data as StorageClassSummary)
      : undefined;

  return (
    <div className="space-y-4 text-xs" data-testid="config-storage-overview">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Icon className="h-3.5 w-3.5 text-[#F08A42]" />
              {currentResource.kind} detail
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBeacon
                variant={statusVariant(currentResource.status)}
                label={currentResource.status}
                size="sm"
              />
              <span className="font-mono text-[11px] text-[var(--muted)]">
                {currentResource.namespace || "Cluster Scope"} · created{" "}
                {createdLabel}
              </span>
            </div>
          </div>
        </div>

        {configMap && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Detail
                label="Data keys"
                value={`${configMap.dataKeyCount} data, ${configMap.binaryKeyCount} binary`}
              />
              <Detail label="Size" value={formatBytes(configMap.sizeBytes)} />
              <Detail
                label="Immutable"
                value={configMap.immutable ? "Yes" : "No"}
              />
            </div>
            <KeyList keys={configMap.keys} />
          </div>
        )}

        {secret && (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
              Secret values are redacted. This view never loads the secret
              payload.
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Detail label="Type" value={secret.type || "Opaque"} />
              <Detail label="Keys" value={secret.dataKeyCount} />
              <Detail label="Size" value={formatBytes(secret.sizeBytes)} />
              <Detail
                label="Immutable"
                value={
                  secret.metadataOnly
                    ? "Unknown"
                    : secret.immutable
                      ? "Yes"
                      : "No"
                }
              />
            </div>
            {secret.keys.length === 0 && secret.dataKeyCount > 0 ? (
              <span className="font-mono text-[10px] text-[var(--muted)]">
                Key names are hidden until Reveal values.
              </span>
            ) : (
              <KeyList keys={secret.keys} />
            )}
          </div>
        )}

        {volume && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Capacity" value={volume.capacity} />
            <Detail
              label="Access modes"
              value={volume.accessModes.join(", ")}
            />
            <Detail label="Reclaim policy" value={volume.reclaimPolicy} />
            <Detail label="Claim" value={volume.claim} />
            <Detail label="Storage class" value={volume.storageClass} />
            <Detail label="Volume mode" value={volume.volumeMode} />
          </div>
        )}

        {storageClass && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Provisioner" value={storageClass.provisioner} />
            <Detail label="Reclaim policy" value={storageClass.reclaimPolicy} />
            <Detail
              label="Volume binding mode"
              value={storageClass.volumeBindingMode}
            />
            <Detail
              label="Allow expansion"
              value={storageClass.allowVolumeExpansion ? "Yes" : "No"}
            />
            <Detail
              label="Default class"
              value={storageClass.default ? "Yes" : "No"}
            />
          </div>
        )}
      </div>

      {(Object.keys(labels).length > 0 ||
        Object.keys(annotations).length > 0) && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs space-y-3">
          {Object.keys(labels).length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                Labels
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(labels).map(([key, value]) => (
                  <span
                    key={key}
                    className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)] dark:bg-white/5"
                  >
                    {key}={value}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Object.keys(annotations).length > 0 && (
            <div className="text-[10px] font-mono text-[var(--muted)]">
              {Object.keys(annotations).length} annotations
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KeyList({ keys }: { keys: string[] }) {
  if (keys.length === 0) {
    return (
      <span className="text-[11px] font-mono text-[var(--muted)]">
        No keys.
      </span>
    );
  }
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
        Key names
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {keys.map((key) => (
          <span
            key={key}
            className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground)] dark:bg-white/5"
          >
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}
