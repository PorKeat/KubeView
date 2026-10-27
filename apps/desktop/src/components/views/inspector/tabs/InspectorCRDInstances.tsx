"use client";

import * as React from "react";
import { Boxes, RefreshCw } from "lucide-react";
import { invokeRpc } from "@/lib/ipc";
import { useClusterStore } from "@/stores/clusterStore";
import { EmptyState, StatusBeacon } from "@/components/ui";
import type {
  CRDSummary,
  ListCustomResourcesResult,
} from "@kubeview/contracts";

export function InspectorCRDInstances({ crd }: { crd: CRDSummary }) {
  const currentContext = useClusterStore((state) => state.currentContext);
  const currentNamespace = useClusterStore((state) => state.currentNamespace);
  const [items, setItems] = React.useState<ListCustomResourcesResult["items"]>(
    [],
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const version =
    crd.versions.find((entry) => entry.storage)?.name ??
    crd.versions.find((entry) => entry.served)?.name ??
    crd.versions[0]?.name;

  const load = React.useCallback(async () => {
    if (!currentContext || !version) {
      setIsLoading(false);
      setError("No served CRD version is available.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await invokeRpc<ListCustomResourcesResult>(
        "crds.instances",
        {
          contextName: currentContext,
          group: crd.group,
          version,
          resource: crd.plural,
          namespace:
            crd.scope === "Namespaced" && currentNamespace !== "all"
              ? currentNamespace
              : "",
        },
      );
      setItems(result?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    crd.group,
    crd.plural,
    crd.scope,
    currentContext,
    currentNamespace,
    version,
  ]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] p-8 text-xs text-[var(--muted)]">
        <RefreshCw className="h-4 w-4 animate-spin text-[var(--accent)]" />
        Loading custom resources...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-[11px] text-rose-600 dark:text-rose-400">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        variant="empty"
        title="No custom resources"
        description={`No ${crd.kind} objects exist in this scope.`}
      />
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--border)]"
      data-testid="crd-instances"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-[var(--accent)]" />
          {crd.kind}
        </span>
        <span>{items.length} items</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {items.map((item) => (
          <div
            key={`${item.namespace ?? ""}/${item.name}`}
            className="flex items-center justify-between gap-3 px-3 py-2 text-[11px]"
          >
            <div className="min-w-0">
              <div className="truncate font-mono text-[var(--foreground)]">
                {item.name}
              </div>
              {item.namespace && (
                <div className="truncate font-mono text-[10px] text-[var(--muted)]">
                  {item.namespace}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.status && (
                <StatusBeacon variant="muted" label={item.status} size="xs" />
              )}
              <span className="font-mono text-[10px] text-[var(--muted)]">
                {item.age}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
