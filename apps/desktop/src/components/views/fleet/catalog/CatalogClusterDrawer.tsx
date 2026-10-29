"use client";

import * as React from "react";
import {
  ArrowRight,
  Camera,
  KeyRound,
  Pin,
  PinOff,
  Server,
  SlidersHorizontal,
  Stethoscope,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { FleetClusterOverview } from "@kubeview/contracts";
import type { ClusterContextInfo } from "@/stores/clusterStore";
import { ENV_TAG_OPTIONS, type EnvTag } from "@/stores/catalogStore";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { readClusterImage } from "@/lib/clusterImage";
import { ENV_META, catalogStatusMeta } from "./catalogMeta";
import type { CatalogStatus } from "./catalogMeta";

export interface CatalogClusterDrawerProps {
  context: ClusterContextInfo;
  snapshot?: FleetClusterOverview;
  status: CatalogStatus;
  env: EnvTag;
  version: string;
  configPath: string;
  pinned: boolean;
  isActive: boolean;
  image?: string;
  onClose: () => void;
  onOpen: () => void;
  onDiagnose: () => void;
  onConfigureEndpoint: () => void;
  onRemove: () => void;
  onTogglePin: () => void;
  onSetEnv: (tag: EnvTag | null) => void;
  onSetImage: (image: string | null) => void;
}

const ENV_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: "auto", label: "Auto (from name)" },
  ...ENV_TAG_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
];

export function CatalogClusterDrawer({
  context,
  snapshot,
  status,
  env,
  version,
  configPath,
  pinned,
  isActive,
  image,
  onClose,
  onOpen,
  onDiagnose,
  onConfigureEndpoint,
  onRemove,
  onTogglePin,
  onSetEnv,
  onSetImage,
}: CatalogClusterDrawerProps) {
  const [confirmingRemove, setConfirmingRemove] = React.useState(false);
  const [imageBusy, setImageBusy] = React.useState(false);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const meta = catalogStatusMeta(status);
  const envMeta = ENV_META[env];

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const details: { label: string; value: string }[] = [
    { label: "Cluster", value: context.cluster },
    { label: "Endpoint", value: context.server },
    { label: "Provider", value: context.provider },
    { label: "Auth", value: context.authType ?? "—" },
    { label: "Namespace", value: context.namespace || "default" },
    { label: "Version", value: version },
    {
      label: "Latency",
      value: context.latencyMs > 0 ? `${context.latencyMs}ms` : "—",
    },
    { label: "Kubeconfig", value: configPath || "—" },
  ];

  const health: { label: string; value: string }[] = snapshot
    ? [
        {
          label: "Nodes",
          value: `${snapshot.readyNodes}/${snapshot.totalNodes} ready`,
        },
        {
          label: "Pods",
          value: `${snapshot.runningPods}/${snapshot.totalPods} running`,
        },
        { label: "Failed pods", value: String(snapshot.failedPods) },
        {
          label: "Degraded",
          value: `${snapshot.degradedWorkloads} workload${
            snapshot.degradedWorkloads === 1 ? "" : "s"
          }`,
        },
        { label: "Warnings", value: String(snapshot.warningCount) },
      ]
    : [];

  return (
    <div
      data-testid="catalog-drawer"
      className="fixed inset-0 z-[120] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${context.name} details`}
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-active)] text-[var(--accent)]">
              <Server className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2
                  className="truncate text-sm font-semibold text-[var(--foreground)]"
                  title={context.name}
                >
                  {context.name}
                </h2>
                {isActive && (
                  <span className="rounded border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                    Active
                  </span>
                )}
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide",
                    envMeta.badge,
                  )}
                >
                  {envMeta.label}
                </span>
              </div>
              <div
                className={cn(
                  "mt-1 flex items-center gap-1.5 font-mono text-[10px]",
                  meta.text,
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
                  aria-hidden="true"
                />
                {meta.label}
              </div>
            </div>
          </div>
          <button
            type="button"
            data-testid="catalog-drawer-close"
            onClick={onClose}
            aria-label="Close cluster details"
            className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <h3 className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Connection
            </h3>
            <dl className="mt-2 space-y-1.5">
              {details.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-3 text-[11px]"
                >
                  <dt className="shrink-0 text-[var(--muted)]">{item.label}</dt>
                  <dd
                    className="min-w-0 truncate text-right font-mono text-[10px] text-[var(--foreground)]"
                    title={item.value}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {health.length > 0 && (
            <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
              <h3 className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Live health
              </h3>
              <dl className="mt-2 space-y-1.5">
                {health.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 text-[11px]"
                  >
                    <dt className="text-[var(--muted)]">{item.label}</dt>
                    <dd className="font-mono text-[10px] tabular-nums text-[var(--foreground)]">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <h3 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <Camera className="h-3 w-3" aria-hidden="true" />
              Cluster image
            </h3>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-active)] text-[var(--accent)]">
                {image ? (
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Server className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="catalog-image-upload"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageBusy}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60 cursor-pointer"
                >
                  {imageBusy
                    ? "Processing..."
                    : image
                      ? "Replace image"
                      : "Upload image"}
                </button>
                {image && (
                  <button
                    type="button"
                    onClick={() => onSetImage(null)}
                    className="rounded-md px-2 py-1.5 text-[10px] font-medium text-rose-500 transition-colors hover:bg-rose-500/10 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setImageBusy(true);
                setImageError(null);
                void readClusterImage(file)
                  .then(onSetImage)
                  .catch((error: unknown) =>
                    setImageError(
                      error instanceof Error
                        ? error.message
                        : "Could not process that image.",
                    ),
                  )
                  .finally(() => setImageBusy(false));
              }}
            />
            {imageError && (
              <p role="alert" className="mt-2 text-[10px] text-rose-500">
                {imageError}
              </p>
            )}
            <p className="mt-2 text-[10px] text-[var(--muted)]">
              Shown on the rail and catalog. Images are resized locally.
            </p>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <h3 className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <Tag className="h-3 w-3" aria-hidden="true" />
              Environment label
            </h3>
            <div
              data-testid="catalog-drawer-env"
              className="mt-2 [&_button]:w-full [&_button]:justify-between"
            >
              <CustomSelect
                value={env}
                onChange={(value) =>
                  onSetEnv(value === "auto" ? null : (value as EnvTag))
                }
                options={ENV_SELECT_OPTIONS}
                ariaLabel="Environment label"
                triggerTestId="catalog-env-select"
                dropdownWidth="w-full"
                className="w-full"
                containerClassName="w-full"
              />
            </div>
          </section>

          <section className="space-y-2">
            <button
              type="button"
              data-testid="catalog-drawer-open"
              onClick={onOpen}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              <span className="inline-flex items-center gap-2">
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                {isActive ? "Open overview" : "Switch & open overview"}
              </span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="catalog-drawer-diagnose"
                onClick={onDiagnose}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                <Stethoscope className="h-3.5 w-3.5 text-[var(--muted)]" />
                Diagnose
              </button>
              <button
                type="button"
                data-testid="catalog-drawer-endpoint"
                onClick={onConfigureEndpoint}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--muted)]" />
                Endpoint
              </button>
              <button
                type="button"
                data-testid="catalog-drawer-pin"
                onClick={onTogglePin}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                {pinned ? (
                  <PinOff className="h-3.5 w-3.5 text-[var(--accent)]" />
                ) : (
                  <Pin className="h-3.5 w-3.5 text-[var(--muted)]" />
                )}
                {pinned ? "Unpin" : "Pin"}
              </button>
              <button
                type="button"
                data-testid="catalog-drawer-remove"
                onClick={() => setConfirmingRemove(true)}
                disabled={confirmingRemove}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-2 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden dark:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>

            {confirmingRemove && (
              <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-2.5">
                <p className="text-[11px] text-[var(--foreground)]">
                  Remove <span className="font-mono">{context.name}</span> from
                  this kubeconfig?
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="catalog-drawer-remove-confirm"
                    onClick={onRemove}
                    className="rounded-md bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-rose-500 cursor-pointer"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingRemove(false)}
                    className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <p className="flex items-center gap-1.5 pt-1 text-[10px] text-[var(--muted)]">
              <KeyRound className="h-3 w-3" aria-hidden="true" />
              Source: kubeconfig file
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
