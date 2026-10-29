"use client";

import * as React from "react";
import { Camera, LayoutGrid, Loader2, Plus, ShipWheel } from "lucide-react";
import { toast } from "sonner";
import { readClusterImage } from "@/lib/clusterImage";
import { useClusterStore } from "@/stores/clusterStore";
import { useFleetOverviewStore } from "@/stores/fleetStore";
import { useTabStore } from "@/stores/tabStore";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import { clusterTag, clusterTone } from "@/lib/clusterVisuals";
import { useLayoutStore } from "@/stores/layoutStore";
import { useCatalogStore } from "@/stores/catalogStore";

type RailStatus = "connected" | "degraded" | "offline" | "checking";

const STATUS_LABEL: Record<RailStatus, string> = {
  connected: "Connected",
  degraded: "Needs attention",
  offline: "Offline",
  checking: "Checking",
};

function fleetStatusToRailStatus(
  status: "healthy" | "degraded" | "offline",
): RailStatus {
  if (status === "healthy") return "connected";
  return status;
}

export function ClusterRail() {
  const availableContexts = useClusterStore((state) => state.availableContexts);
  const currentContext = useClusterStore((state) => state.currentContext);
  const connectionStatus = useClusterStore((state) => state.connectionStatus);
  const switchContext = useClusterStore((state) => state.switchContext);
  const openKubeconfigModal = useClusterStore(
    (state) => state.openKubeconfigModal,
  );
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const fleetOverview = useFleetOverviewStore((state) => state.overview);
  const isFleetLoading = useFleetOverviewStore((state) => state.isLoading);
  const loadFleetOverview = useFleetOverviewStore(
    (state) => state.loadFleetOverview,
  );
  const setFleetCatalogSection = useLayoutStore(
    (state) => state.setFleetCatalogSection,
  );
  const setCatalogMode = useLayoutStore((state) => state.setCatalogMode);
  const pinnedClusters = useCatalogStore((state) => state.pinned);
  const clusterImages = useCatalogStore((state) => state.images);
  const clusterAliases = useCatalogStore((state) => state.aliases);
  const setContextImage = useCatalogStore((state) => state.setContextImage);
  const [pendingContext, setPendingContext] = React.useState<string | null>(
    null,
  );
  const [imageTarget, setImageTarget] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const previousContextKey = React.useRef<string | null>(null);

  const contextKey = React.useMemo(
    () =>
      availableContexts
        .map((context) => context.name)
        .sort()
        .join("|"),
    [availableContexts],
  );

  React.useEffect(() => {
    if (!contextKey) {
      previousContextKey.current = contextKey;
      return;
    }

    const force =
      previousContextKey.current !== null &&
      previousContextKey.current !== contextKey;
    previousContextKey.current = contextKey;
    void loadFleetOverview(force);
  }, [contextKey, loadFleetOverview]);

  const fleetByContext = React.useMemo(
    () =>
      new Map(
        (fleetOverview?.clusters ?? []).map((cluster) => [
          cluster.contextName,
          cluster,
        ]),
      ),
    [fleetOverview],
  );

  const orderedContexts = React.useMemo(() => {
    if (pinnedClusters.length === 0) return availableContexts;
    const pinnedSet = new Set(pinnedClusters);
    const pinnedOrder = new Map(
      pinnedClusters.map((name, index) => [name, index]),
    );
    return [...availableContexts].sort((a, b) => {
      const aPinned = pinnedSet.has(a.name);
      const bPinned = pinnedSet.has(b.name);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      if (aPinned && bPinned) {
        return (pinnedOrder.get(a.name) ?? 0) - (pinnedOrder.get(b.name) ?? 0);
      }
      return 0;
    });
  }, [availableContexts, pinnedClusters]);

  const taggedContexts = React.useMemo(() => {
    const usedTags = new Set<string>();

    return orderedContexts.map((context) => {
      const compact = context.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      let tag = clusterTag(context.name);

      if (usedTags.has(tag)) {
        tag = compact.slice(0, 2) || "K8";
        let index = 2;
        while (usedTags.has(tag) && index < compact.length) {
          tag = `${compact.slice(0, 2)}${compact[index]}`;
          index += 1;
        }
      }

      usedTags.add(tag);

      return {
        context,
        tag,
        tone: clusterTone(context.name),
      };
    });
  }, [orderedContexts]);

  const isFleetActive = activeTabId === "fleet";
  const totals = fleetOverview?.totals;
  const allTooltip = totals
    ? `All Clusters · ${totals.healthy}/${totals.total} healthy`
    : isFleetLoading
      ? "All Clusters · Loading fleet telemetry"
      : "All Clusters · Live fleet overview";

  const handleImageFile = async (file: File) => {
    if (!imageTarget) return;
    try {
      const image = await readClusterImage(file);
      setContextImage(imageTarget, image);
      toast.success(`Updated image for ${imageTarget}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update that image.",
      );
    } finally {
      setImageTarget(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleAllClusters = () => {
    setCatalogMode(true);
    setFleetCatalogSection("clusters");
    openTab({
      id: "fleet",
      title: "All Clusters",
      icon: "Server",
      closable: true,
    });
  };

  const handleSelectContext = async (contextName: string) => {
    setCatalogMode(false);

    if (contextName === currentContext) {
      openTab({
        id: "overview",
        title: "Cluster Overview",
        icon: "LayoutDashboard",
        closable: false,
      });
      return;
    }

    setPendingContext(contextName);
    try {
      await switchContext(contextName);
    } finally {
      setPendingContext(null);
    }
  };

  return (
    <aside
      data-testid="cluster-rail"
      aria-label="Cluster navigation"
      className="hidden h-full w-16 shrink-0 select-none flex-col items-center border-r border-[var(--border)] bg-[var(--background)] lg:flex"
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImageFile(file);
        }}
      />
      <div className="flex w-full flex-col items-center pb-1 pt-3">
        <Tooltip content={allTooltip} side="right" delayDuration={250}>
          <button
            type="button"
            data-testid="cluster-rail-all"
            aria-label="Open All Clusters live fleet overview"
            aria-pressed={isFleetActive}
            onClick={handleAllClusters}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-[10px] border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-hidden",
              isFleetActive
                ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--background)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]/40 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
            )}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            {isFleetActive && (
              <span
                className="absolute -left-[7px] top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]"
                aria-hidden="true"
              />
            )}
          </button>
        </Tooltip>
        <div className="my-2 h-px w-6 bg-[var(--border)]" />
      </div>

      <div
        data-testid="cluster-rail-contexts"
        className="flex min-h-0 w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden px-3 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {taggedContexts.map(({ context, tag, tone }) => {
          const fleetStatus = fleetByContext.get(context.name)?.status;
          const status: RailStatus =
            context.name === currentContext
              ? connectionStatus
              : fleetStatus
                ? fleetStatusToRailStatus(fleetStatus)
                : context.status;
          const isActive = !isFleetActive && context.name === currentContext;
          const latency = context.latencyMs;
          const isPending = pendingContext === context.name;
          const image = clusterImages[context.name];
          const alias = clusterAliases[context.name];
          const displayName = alias || context.name;
          const tooltip = `${displayName}${
            alias ? ` (${context.name})` : ""
          } · ${STATUS_LABEL[status]}${latency > 0 ? ` · ${latency}ms` : ""}`;

          return (
            <div
              key={context.name}
              className="group/tile relative flex w-full justify-center"
            >
              <Tooltip content={tooltip} side="right" delayDuration={250}>
                <button
                  type="button"
                  data-testid="cluster-rail-context"
                  data-context-name={context.name}
                  data-status={status}
                  aria-label={`Switch to ${displayName} (${STATUS_LABEL[status]})`}
                  aria-pressed={isActive}
                  aria-busy={isPending}
                  title={`${alias ? `${alias}\n${context.name}` : context.name}\n${context.server}`}
                  onClick={() => void handleSelectContext(context.name)}
                  className={cn(
                    "group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/15 text-[10px] font-semibold tracking-wide text-white shadow-sm transition-all duration-150 cursor-pointer hover:-translate-y-px hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-hidden",
                    isActive &&
                      "ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--background)]",
                  )}
                  style={{ backgroundImage: tone }}
                >
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="absolute inset-0 h-full w-full rounded-[10px] object-cover"
                    />
                  ) : (
                    <span className="relative z-10 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
                      {tag}
                    </span>
                  )}
                  {isPending ? (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/20 bg-[#11161e] text-white">
                      <Loader2
                        className="h-2.5 w-2.5 animate-spin"
                        aria-hidden="true"
                      />
                    </span>
                  ) : (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/20 bg-[#11161e] text-white/80"
                      aria-hidden="true"
                    >
                      <ShipWheel className="h-2 w-2" />
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="absolute -left-[7px] top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </Tooltip>
              <Tooltip
                content="Change cluster image"
                side="right"
                delayDuration={250}
              >
                <button
                  type="button"
                  data-testid="cluster-image-upload"
                  data-context-name={context.name}
                  aria-label={`Change image for ${context.name}`}
                  onClick={() => {
                    setImageTarget(context.name);
                    imageInputRef.current?.click();
                  }}
                  className="absolute bottom-0 left-[calc(50%-22px)] z-20 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/20 bg-[#11161e] text-white/80 opacity-0 transition-opacity group-hover/tile:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden cursor-pointer"
                >
                  <Camera className="h-2 w-2" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          );
        })}

        <Tooltip content="Import kubeconfig" side="right" delayDuration={250}>
          <button
            type="button"
            data-testid="cluster-rail-add"
            aria-label="Import or add kubeconfig"
            onClick={() => openKubeconfigModal("browse")}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-[var(--border)] text-[var(--muted)] transition-colors cursor-pointer hover:border-[var(--muted)]/50 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-hidden"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>

      <div className="flex w-full items-center justify-center border-t border-[var(--border)] py-2.5">
        <span
          className="font-mono text-[6.5px] uppercase tracking-[0.14em] text-[var(--muted)]"
          title={`${availableContexts.length} cluster context${
            availableContexts.length === 1 ? "" : "s"
          }`}
        >
          {availableContexts.length} context
          {availableContexts.length === 1 ? "" : "s"}
        </span>
      </div>
    </aside>
  );
}
