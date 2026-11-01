"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Loader2,
  Plus,
  Tags,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import type { DrainNodeResult, NodeInfo, NodeTaint } from "@kubeview/contracts";
import { toast } from "sonner";
import { invokeRpc } from "@/lib/ipc";
import { useClusterStore } from "@/stores/clusterStore";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

type Tab = "scheduling" | "taints" | "labels";
type EditableTaint = {
  key: string;
  value: string;
  effect: NodeTaint["effect"];
};
type EditableLabel = { key: string; value: string };

const EFFECTS: Array<NodeTaint["effect"]> = [
  "NoSchedule",
  "PreferNoSchedule",
  "NoExecute",
];

export function NodeOperationsButton({ nodeName }: { nodeName: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Tooltip content="Node operations">
        <button
          type="button"
          aria-label={`Node operations for ${nodeName}`}
          data-testid={`node-operations-${nodeName}`}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          className="cursor-pointer rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
        >
          <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </Tooltip>
      <NodeOperationsModal
        open={open}
        nodeName={nodeName}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function NodeOperationsModal({
  open,
  nodeName,
  onClose,
}: {
  open: boolean;
  nodeName: string;
  onClose: () => void;
}) {
  const currentContext = useClusterStore((state) => state.currentContext);
  const loadClusterOverview = useClusterStore(
    (state) => state.loadClusterOverview,
  );
  const [tab, setTab] = React.useState<Tab>("scheduling");
  const [node, setNode] = React.useState<NodeInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [taints, setTaints] = React.useState<EditableTaint[]>([]);
  const [labels, setLabels] = React.useState<EditableLabel[]>([]);
  const [force, setForce] = React.useState(false);
  const [deleteEmptyDir, setDeleteEmptyDir] = React.useState(false);
  const [ignoreDaemonSets, setIgnoreDaemonSets] = React.useState(true);
  const [timeoutSeconds, setTimeoutSeconds] = React.useState(120);
  const [drainResult, setDrainResult] = React.useState<DrainNodeResult | null>(
    null,
  );

  const load = React.useCallback(async () => {
    if (!currentContext) return;
    setIsLoading(true);
    setError(null);
    try {
      const info = await invokeRpc<NodeInfo>("nodes.get", {
        contextName: currentContext,
        nodeName,
      });
      setNode(info);
      setTaints(
        (info.taints ?? []).map((taint) => ({
          key: taint.key,
          value: taint.value ?? "",
          effect: taint.effect,
        })),
      );
      setLabels(
        Object.entries(info.labels ?? {}).map(([key, value]) => ({
          key,
          value,
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load node details.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentContext, nodeName]);

  React.useEffect(() => {
    if (!open) return;
    setTab("scheduling");
    setDrainResult(null);
    setError(null);
    void load();
  }, [load, open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const refreshOverview = () => {
    void loadClusterOverview(currentContext);
  };

  const cordon = async (unschedulable: boolean) => {
    setIsSaving(true);
    setError(null);
    try {
      const info = await invokeRpc<NodeInfo>(
        unschedulable ? "nodes.cordon" : "nodes.uncordon",
        { contextName: currentContext, nodeName },
      );
      setNode(info);
      toast.success(`${nodeName} ${unschedulable ? "cordoned" : "uncordoned"}`);
      refreshOverview();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update scheduling.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const drain = async () => {
    setIsSaving(true);
    setError(null);
    setDrainResult(null);
    try {
      const result = await invokeRpc<DrainNodeResult>("nodes.drain", {
        contextName: currentContext,
        nodeName,
        force,
        deleteEmptyDirData: deleteEmptyDir,
        ignoreDaemonSets,
        timeoutSeconds,
      });
      setDrainResult(result);
      setNode((previous) =>
        previous ? { ...previous, unschedulable: true } : previous,
      );
      toast.success(
        `${nodeName} drained · ${result.evicted.length} evicted, ${result.failed.length} failed`,
      );
      refreshOverview();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to drain the node.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveTaints = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const info = await invokeRpc<NodeInfo>("nodes.taint", {
        contextName: currentContext,
        nodeName,
        taints: taints
          .map((taint) => ({
            key: taint.key.trim(),
            value: taint.value.trim(),
            effect: taint.effect,
          }))
          .filter((taint) => taint.key),
      });
      setNode(info);
      toast.success(`Taints updated on ${nodeName}`);
      refreshOverview();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update taints.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveLabels = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const nextLabels: Record<string, string> = {};
      for (const label of labels) {
        const key = label.key.trim();
        if (key) nextLabels[key] = label.value.trim();
      }
      const originalKeys = Object.keys(node?.labels ?? {});
      const removeLabels = originalKeys.filter((key) => !(key in nextLabels));
      const info = await invokeRpc<NodeInfo>("nodes.label", {
        contextName: currentContext,
        nodeName,
        labels: nextLabels,
        removeLabels,
      });
      setNode(info);
      toast.success(`Labels updated on ${nodeName}`);
      refreshOverview();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update labels.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      data-testid="node-operations-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="node-operations-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => !isSaving && onClose()}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <Wrench className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="node-operations-title"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Node operations
              </h2>
              <p className="truncate font-mono text-[10px] text-[var(--muted)]">
                {nodeName}
                {node ? ` · ${node.status}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close node operations"
            className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex shrink-0 items-center gap-1 border-b border-[var(--border)] px-2 sm:px-4">
          {(
            [
              ["scheduling", "Scheduling", Ban],
              ["taints", "Taints", AlertTriangle],
              ["labels", "Labels", Tags],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer",
                tab === id
                  ? "border-[var(--accent)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-2.5 text-[11px] text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
          )}
          {isLoading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-xs text-[var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
              Loading node...
            </div>
          ) : tab === "scheduling" ? (
            <div className="space-y-4">
              <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--foreground)]">
                      Scheduling
                    </h3>
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      {node?.unschedulable
                        ? "Cordoned: new pods will not be scheduled here."
                        : "Schedulable: the scheduler may place new pods here."}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="node-cordon-toggle"
                    onClick={() => void cordon(!node?.unschedulable)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : node?.unschedulable ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Ban className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    {node?.unschedulable ? "Uncordon" : "Cordon"}
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                <h3 className="text-xs font-semibold text-[var(--foreground)]">
                  Drain node
                </h3>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
                  Cordons the node and evicts pods through the Eviction API.
                  DaemonSet pods are ignored by default and bare pods require
                  force.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-[11px] text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      checked={ignoreDaemonSets}
                      onChange={(event) =>
                        setIgnoreDaemonSets(event.target.checked)
                      }
                      className="h-3.5 w-3.5 accent-[var(--accent)]"
                    />
                    Ignore DaemonSet pods
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      checked={force}
                      onChange={(event) => setForce(event.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--accent)]"
                    />
                    Force bare pods
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      checked={deleteEmptyDir}
                      onChange={(event) =>
                        setDeleteEmptyDir(event.target.checked)
                      }
                      className="h-3.5 w-3.5 accent-[var(--accent)]"
                    />
                    Delete emptyDir data
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-[var(--foreground)]">
                    Timeout
                    <input
                      type="number"
                      min={30}
                      max={900}
                      value={timeoutSeconds}
                      onChange={(event) =>
                        setTimeoutSeconds(Number(event.target.value) || 120)
                      }
                      className="h-7 w-20 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[11px] outline-hidden focus:border-[var(--accent)]"
                    />
                    s
                  </label>
                </div>
                <button
                  type="button"
                  data-testid="node-drain"
                  onClick={() => void drain()}
                  disabled={isSaving}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                  Drain node
                </button>
                {drainResult && (
                  <div
                    data-testid="node-drain-result"
                    className="mt-3 space-y-1 rounded-lg border border-[var(--border)] p-2.5 font-mono text-[10px] text-[var(--muted)]"
                  >
                    <p className="text-emerald-600 dark:text-emerald-400">
                      Evicted: {drainResult.evicted.length}
                    </p>
                    <p>Skipped: {drainResult.skipped.length}</p>
                    <p
                      className={
                        drainResult.failed.length > 0 ? "text-rose-500" : ""
                      }
                    >
                      Failed: {drainResult.failed.length}
                    </p>
                    {drainResult.failed.map((entry) => (
                      <p key={entry} className="text-rose-500">
                        {entry}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : tab === "taints" ? (
            <div className="space-y-2">
              <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                The saved list replaces the node taint set. Existing taints keep
                their original time-added value.
              </p>
              {taints.map((taint, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 sm:grid-cols-[1fr_1fr_auto_auto]"
                >
                  <input
                    value={taint.key}
                    onChange={(event) =>
                      setTaints((previous) =>
                        previous.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, key: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    placeholder="key"
                    aria-label={`Taint ${index + 1} key`}
                    className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[11px] outline-hidden focus:border-[var(--accent)]"
                  />
                  <input
                    value={taint.value}
                    onChange={(event) =>
                      setTaints((previous) =>
                        previous.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, value: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    placeholder="value (optional)"
                    aria-label={`Taint ${index + 1} value`}
                    className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[11px] outline-hidden focus:border-[var(--accent)]"
                  />
                  <select
                    value={taint.effect}
                    onChange={(event) =>
                      setTaints((previous) =>
                        previous.map((entry, entryIndex) =>
                          entryIndex === index
                            ? {
                                ...entry,
                                effect: event.target
                                  .value as NodeTaint["effect"],
                              }
                            : entry,
                        ),
                      )
                    }
                    aria-label={`Taint ${index + 1} effect`}
                    className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[11px] outline-hidden focus:border-[var(--accent)]"
                  >
                    {EFFECTS.map((effect) => (
                      <option key={effect} value={effect}>
                        {effect}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setTaints((previous) =>
                        previous.filter(
                          (_, entryIndex) => entryIndex !== index,
                        ),
                      )
                    }
                    aria-label={`Remove taint ${index + 1}`}
                    className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setTaints((previous) => [
                      ...previous,
                      { key: "", value: "", effect: "NoSchedule" },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add taint
                </button>
                <button
                  type="button"
                  data-testid="node-taints-save"
                  onClick={() => void saveTaints()}
                  disabled={isSaving}
                  className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Save taints"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                Labels merge into the node. Removing a row deletes that label.
                System labels are editable with care.
              </p>
              <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                {labels.map((label, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2"
                  >
                    <input
                      value={label.key}
                      onChange={(event) =>
                        setLabels((previous) =>
                          previous.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, key: event.target.value }
                              : entry,
                          ),
                        )
                      }
                      placeholder="key"
                      aria-label={`Label ${index + 1} key`}
                      className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[11px] outline-hidden focus:border-[var(--accent)]"
                    />
                    <input
                      value={label.value}
                      onChange={(event) =>
                        setLabels((previous) =>
                          previous.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, value: event.target.value }
                              : entry,
                          ),
                        )
                      }
                      placeholder="value"
                      aria-label={`Label ${index + 1} value`}
                      className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[11px] outline-hidden focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setLabels((previous) =>
                          previous.filter(
                            (_, entryIndex) => entryIndex !== index,
                          ),
                        )
                      }
                      aria-label={`Remove label ${index + 1}`}
                      className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setLabels((previous) => [
                      ...previous,
                      { key: "", value: "" },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add label
                </button>
                <button
                  type="button"
                  data-testid="node-labels-save"
                  onClick={() => void saveLabels()}
                  disabled={isSaving}
                  className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Save labels"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
