"use client";

import * as React from "react";
import { Boxes, X } from "lucide-react";
import type { CRDSummary } from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import { useResourceActions } from "../shared/useResourceActions";
import {
  NetworkingResourcePage,
  type NetworkingColumn,
  type NetworkingFilterOption,
  type NetworkingStatusDescriptor,
} from "../networking/NetworkingResourcePage";

function crdMatches(item: CRDSummary, query: string): boolean {
  if (!query) return true;
  return (
    item.name.toLowerCase().includes(query) ||
    item.group.toLowerCase().includes(query) ||
    item.kind.toLowerCase().includes(query) ||
    item.plural.toLowerCase().includes(query) ||
    item.scope.toLowerCase().includes(query) ||
    item.versions.some((version) => version.name.toLowerCase().includes(query))
  );
}

function scopeStatus(scope: string): NetworkingStatusDescriptor {
  return scope.toLowerCase() === "cluster"
    ? { label: "Cluster", variant: "muted" }
    : { label: "Namespaced", variant: "pending" };
}

export function CustomResourcesView() {
  const [filter, setFilter] = React.useState("all");
  const [showCreatePicker, setShowCreatePicker] = React.useState(false);
  const { editResource, deleteResource, createResource } = useResourceActions();
  const {
    crds,
    totalCRDsCount,
    isCRDsLoading,
    hasLoadedCRDsOnce,
    loadCRDs,
    currentContext,
    currentNamespace,
    openInspector,
    openResourceEditor,
  } = useClusterStore();

  const createInstance = (crd: CRDSummary) => {
    const version =
      crd.versions.find((entry) => entry.storage)?.name ??
      crd.versions.find((entry) => entry.served)?.name ??
      crd.versions[0]?.name;
    if (!version) return;
    setShowCreatePicker(false);
    void openResourceEditor({
      apiVersion: `${crd.group}/${version}`,
      kind: crd.kind,
      resource: crd.plural,
      name: "",
      namespace:
        crd.scope === "Namespaced"
          ? currentNamespace === "all"
            ? "default"
            : currentNamespace
          : "",
      mode: "create",
    });
  };

  React.useEffect(() => {
    if (currentContext) void loadCRDs();
  }, [currentContext, loadCRDs]);

  const refresh = React.useCallback(() => {
    void loadCRDs();
  }, [loadCRDs]);

  const filterOptions = React.useMemo<NetworkingFilterOption[]>(
    () => [
      { id: "all", label: "All", count: crds.length },
      {
        id: "Namespaced",
        label: "Namespaced",
        count: crds.filter((item) => item.scope === "Namespaced").length,
      },
      {
        id: "Cluster",
        label: "Cluster",
        count: crds.filter((item) => item.scope === "Cluster").length,
      },
    ],
    [crds],
  );

  const columns = React.useMemo<NetworkingColumn<CRDSummary>[]>(
    () => [
      {
        key: "group",
        label: "Group",
        widthClass: "w-[18%]",
        sortValue: (item) => item.group,
        render: (item) => (
          <span
            className="block truncate font-mono text-[10px] text-[var(--muted)]"
            title={item.group}
          >
            {item.group}
          </span>
        ),
      },
      {
        key: "kind",
        label: "Kind",
        widthClass: "w-[12%]",
        sortValue: (item) => item.kind,
        render: (item) => (
          <span className="font-mono text-[10px] text-[var(--foreground)]">
            {item.kind}
          </span>
        ),
      },
      {
        key: "versions",
        label: "Versions",
        widthClass: "w-[20%]",
        render: (item) => (
          <span
            className="block truncate font-mono text-[10px] text-[var(--muted)]"
            title={item.versions.map((version) => version.name).join(", ")}
          >
            {item.versions
              .filter((version) => version.served)
              .map((version) => version.name)
              .join(", ") || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <NetworkingResourcePage
        icon={Boxes}
        nounSingular="CRD"
        nounPlural="CRDs"
        items={crds}
        totalCount={totalCRDsCount}
        isLoading={isCRDsLoading}
        hasLoadedOnce={hasLoadedCRDsOnce}
        onRefresh={refresh}
        searchPlaceholder="Filter CRDs by group, kind, plural, scope..."
        matchesSearch={crdMatches}
        filterOptions={filterOptions}
        activeFilter={filter}
        setActiveFilter={setFilter}
        matchesFilter={(item, value) => value === "all" || item.scope === value}
        columns={columns}
        getKey={(item) => item.name}
        getName={(item) => item.name}
        getNamespace={() => ""}
        getStatus={(item) => scopeStatus(item.scope)}
        getAge={(item) => item.age}
        getCreationTimestamp={(item) => item.creationTimestamp}
        onRowClick={(item) =>
          openInspector({
            kind: "CustomResourceDefinition",
            name: item.name,
            namespace: "",
            status: item.scope,
            data: item as unknown as Record<string, unknown>,
          })
        }
        describeCommand={(item) => `kubectl describe crd ${item.name}`}
        onEdit={(item) =>
          editResource(
            "CustomResourceDefinition",
            item.name,
            "",
            item.scope,
            item as unknown as Record<string, unknown>,
          )
        }
        onDelete={(item) =>
          deleteResource("CustomResourceDefinition", item.name)
        }
        onCreate={() => setShowCreatePicker(true)}
        testIdPrefix="crds"
        clusterScoped
        autoRefresh={false}
        codeCommand={() => "kubectl get crds"}
        emptyDescription="CustomResourceDefinitions extend Kubernetes with additional API resources."
      />

      {showCreatePicker && (
        <div
          data-testid="custom-resource-create-picker"
          role="dialog"
          aria-modal="true"
          aria-label="Create custom resource"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-md animate-in fade-in duration-150 sm:items-center sm:p-4"
        >
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setShowCreatePicker(false)}
            aria-hidden="true"
          />
          <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Create custom resource
              </h2>
              <button
                type="button"
                onClick={() => setShowCreatePicker(false)}
                aria-label="Close create picker"
                className="cursor-pointer rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              <button
                type="button"
                data-testid="create-crd"
                onClick={() => {
                  setShowCreatePicker(false);
                  createResource("CustomResourceDefinition");
                }}
                className="w-full rounded-lg border border-dashed border-[var(--border)] p-2.5 text-left transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <span className="block text-xs font-semibold text-[var(--foreground)]">
                  New CustomResourceDefinition
                </span>
                <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                  Define a new API kind for the cluster.
                </span>
              </button>
              <p className="pt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Create an instance
              </p>
              {crds.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--muted)]">
                  No CRDs are installed in this cluster.
                </p>
              ) : (
                crds.map((crd) => (
                  <button
                    key={crd.name}
                    type="button"
                    data-testid={`create-instance-${crd.name}`}
                    onClick={() => createInstance(crd)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 text-left transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {crd.kind}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--muted)]">
                        {crd.scope}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--muted)]">
                      {crd.group}/{crd.plural}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
