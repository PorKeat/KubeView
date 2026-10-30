"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  FolderInput,
  RotateCw,
  Server,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";

type Destination = "node" | "namespace";
type NodeMode = "auto" | "specific";

export function MovePodModal() {
  const movePodTarget = useClusterStore((state) => state.movePodTarget);
  const closeMovePod = useClusterStore((state) => state.closeMovePod);
  const movePod = useClusterStore((state) => state.movePod);
  const closeInspector = useClusterStore((state) => state.closeInspector);
  const clusterOverview = useClusterStore((state) => state.clusterOverview);
  const loadClusterOverview = useClusterStore(
    (state) => state.loadClusterOverview,
  );
  const availableNamespaces = useClusterStore(
    (state) => state.availableNamespaces,
  );

  const [destination, setDestination] = React.useState<Destination>("node");
  const [nodeMode, setNodeMode] = React.useState<NodeMode>("auto");
  const [targetNode, setTargetNode] = React.useState("");
  const [targetNamespace, setTargetNamespace] = React.useState("");
  const [isMoving, setIsMoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const target = movePodTarget;
  const isManaged = Boolean(target?.controlledBy);

  React.useEffect(() => {
    if (!target) return;
    setDestination("node");
    setNodeMode("auto");
    setTargetNode("");
    setTargetNamespace("");
    setIsMoving(false);
    setError(null);
  }, [target]);

  React.useEffect(() => {
    if (target && !clusterOverview) void loadClusterOverview();
  }, [target, clusterOverview, loadClusterOverview]);

  React.useEffect(() => {
    if (!target) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isMoving) closeMovePod();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [target, isMoving, closeMovePod]);

  if (!target) return null;

  const otherNodes = (clusterOverview?.nodes ?? []).filter(
    (node) => node.name !== target.nodeName,
  );
  const namespaceOptions = availableNamespaces.filter(
    (namespace) =>
      namespace !== "all" &&
      namespace !== "Cluster Scope" &&
      namespace !== target.namespace,
  );

  const namespaceSwitchingDisabled = isManaged;
  const specificNodeDisabled = isManaged || otherNodes.length === 0;

  const nodeSelectionValid =
    nodeMode === "auto" || (nodeMode === "specific" && targetNode.length > 0);
  const namespaceSelectionValid = targetNamespace.length > 0;
  const canSubmit =
    !isMoving &&
    (destination === "node" ? nodeSelectionValid : namespaceSelectionValid);

  const selectDestination = (next: Destination) => {
    if (next === "namespace" && namespaceSwitchingDisabled) return;
    setDestination(next);
    setError(null);
    if (next === "node" && nodeMode === "specific" && !targetNode) {
      setTargetNode(otherNodes[0]?.name ?? "");
    }
    if (next === "namespace" && !targetNamespace) {
      setTargetNamespace(namespaceOptions[0] ?? "");
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setIsMoving(true);
    setError(null);
    try {
      const result = await movePod({
        namespace: target.namespace,
        podName: target.name,
        targetNode:
          destination === "node" && nodeMode === "specific"
            ? targetNode
            : undefined,
        targetNamespace:
          destination === "namespace" ? targetNamespace : undefined,
      });

      if (result.mode === "namespace") {
        toast.success(
          `Pod ${target.name} moved to namespace ${result.namespace}`,
        );
      } else if (result.mode === "node") {
        toast.success(`Pod ${target.name} recreated on node ${targetNode}`);
      } else if (result.ownerKind) {
        toast.success(
          `${target.name} deleted; ${result.ownerKind} is recreating it`,
        );
      } else {
        toast.success(`Pod ${target.name} rescheduled`);
      }
      closeMovePod();
      closeInspector();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(`Failed to move pod: ${message}`);
    } finally {
      setIsMoving(false);
    }
  };

  const footerLabel = isManaged
    ? "Reschedule pod"
    : destination === "namespace"
      ? "Move pod"
      : nodeMode === "specific"
        ? "Recreate on node"
        : "Reschedule pod";

  return (
    <div
      data-testid="move-pod-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-pod-title"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => {
          if (!isMoving) closeMovePod();
        }}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/15 p-2 text-[var(--accent)]">
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3
                id="move-pod-title"
                className="text-sm font-bold tracking-tight text-[var(--foreground)]"
              >
                Move Pod
              </h3>
              <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted)]">
                {target.namespace}/{target.name}
                {target.nodeName ? ` · currently on ${target.nodeName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeMovePod}
            disabled={isMoving}
            aria-label="Close move pod dialog"
            className="cursor-pointer rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {isManaged && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span className="leading-relaxed">
                Managed by{" "}
                <span className="font-mono">{target.controlledBy}</span>.
                Kubernetes recreates managed pods through their controller, so
                it can only be rescheduled — the scheduler picks the node, and
                the namespace is fixed. To target a node or namespace, move the
                owning workload instead.
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-[11px] text-rose-600 dark:text-rose-400"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div
            role="tablist"
            aria-label="Move destination"
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-black/[0.03] p-0.5 dark:bg-black/30"
          >
            <button
              type="button"
              role="tab"
              aria-selected={destination === "node"}
              data-testid="move-pod-node-tab"
              onClick={() => selectDestination("node")}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                destination === "node"
                  ? "border border-[var(--border)] bg-[var(--surface)] font-semibold text-[var(--foreground)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <Server className="h-3.5 w-3.5" aria-hidden="true" />
              Another node
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={destination === "namespace"}
              aria-disabled={namespaceSwitchingDisabled}
              data-testid="move-pod-namespace-tab"
              onClick={() => selectDestination("namespace")}
              disabled={namespaceSwitchingDisabled}
              title={
                namespaceSwitchingDisabled
                  ? "Managed pods stay in their namespace"
                  : undefined
              }
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                destination === "namespace"
                  ? "border border-[var(--border)] bg-[var(--surface)] font-semibold text-[var(--foreground)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
                namespaceSwitchingDisabled &&
                  "cursor-not-allowed opacity-40 hover:text-[var(--muted)]",
              )}
            >
              <FolderInput className="h-3.5 w-3.5" aria-hidden="true" />
              Another namespace
            </button>
          </div>

          {destination === "node" ? (
            <div className="space-y-2">
              <button
                type="button"
                role="radio"
                aria-checked={nodeMode === "auto"}
                data-testid="move-pod-node-auto"
                onClick={() => {
                  setNodeMode("auto");
                  setError(null);
                }}
                disabled={isMoving}
                className={cn(
                  "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  nodeMode === "auto"
                    ? "border-[var(--accent)]/40 bg-[var(--accent)]/5"
                    : "border-[var(--border)] hover:bg-[var(--surface-hover)]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    nodeMode === "auto"
                      ? "border-[var(--accent)]"
                      : "border-[var(--muted)]",
                  )}
                  aria-hidden="true"
                >
                  {nodeMode === "auto" && (
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-[var(--foreground)]">
                    Automatic
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-[var(--muted)]">
                    {isManaged
                      ? "Delete the pod and let its controller recreate it. The scheduler chooses the node and may keep it on the same one."
                      : "Delete and recreate the pod. The scheduler chooses a node and may keep it on the same one."}
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={nodeMode === "specific"}
                aria-disabled={specificNodeDisabled}
                data-testid="move-pod-node-specific"
                onClick={() => {
                  if (specificNodeDisabled) return;
                  setNodeMode("specific");
                  setTargetNode(
                    (current) => current || otherNodes[0]?.name || "",
                  );
                  setError(null);
                }}
                disabled={isMoving || specificNodeDisabled}
                title={
                  specificNodeDisabled
                    ? isManaged
                      ? "Managed pods cannot be pinned to a node"
                      : "No other schedulable nodes available"
                    : undefined
                }
                className={cn(
                  "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  nodeMode === "specific"
                    ? "border-[var(--accent)]/40 bg-[var(--accent)]/5"
                    : "border-[var(--border)] hover:bg-[var(--surface-hover)]",
                  specificNodeDisabled &&
                    "cursor-not-allowed opacity-45 hover:bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    nodeMode === "specific"
                      ? "border-[var(--accent)]"
                      : "border-[var(--muted)]",
                  )}
                  aria-hidden="true"
                >
                  {nodeMode === "specific" && (
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[var(--foreground)]">
                    Pin to a specific node
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-[var(--muted)]">
                    Only standalone pods can be pinned. The pod is recreated
                    with a{" "}
                    <span className="font-mono">kubernetes.io/hostname</span>{" "}
                    selector and stays Pending if the node cannot accept it.
                  </span>
                </span>
              </button>

              {nodeMode === "specific" && !specificNodeDisabled && (
                <div className="ml-7 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2.5">
                  <CustomSelect
                    value={targetNode}
                    onChange={(value) => {
                      setTargetNode(value);
                      setError(null);
                    }}
                    options={otherNodes.map((node) => ({
                      value: node.name,
                      label: node.name,
                      badge: node.status,
                    }))}
                    ariaLabel="Target node"
                    triggerTestId="move-pod-node-select"
                    optionTestId={(value) => `move-pod-node-option-${value}`}
                    containerClassName="w-full"
                    className="w-full justify-between"
                    dropdownWidth="w-full"
                    placeholder="Select a node"
                    emptyLabel="No other nodes found"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Target namespace
                </label>
                <CustomSelect
                  value={targetNamespace}
                  onChange={(value) => {
                    setTargetNamespace(value);
                    setError(null);
                  }}
                  options={namespaceOptions.map((namespace) => ({
                    value: namespace,
                    label: namespace,
                  }))}
                  ariaLabel="Target namespace"
                  triggerTestId="move-pod-namespace-select"
                  optionTestId={(value) => `move-pod-namespace-option-${value}`}
                  containerClassName="w-full"
                  className="w-full justify-between"
                  dropdownWidth="w-full"
                  placeholder="Select a namespace"
                  emptyLabel="No other namespaces found"
                />
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  The pod is recreated with the same name and spec in the target
                  namespace, then the original is deleted. Referenced PVCs,
                  Secrets, ConfigMaps, and ServiceAccounts must already exist
                  there; node scheduling may also differ.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5">
          <button
            type="button"
            data-testid="move-pod-cancel"
            onClick={closeMovePod}
            disabled={isMoving}
            className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="move-pod-submit"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMoving ? (
              <RotateCw
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isMoving ? "Moving..." : footerLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
