"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  HardDrive,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  SimpleResourceItem,
  SimpleResourceKind,
  SimpleResourceListResult,
  SimpleResourceStatusTone,
} from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";
import { useClusterStore } from "@/stores/clusterStore";
import { createResourceTarget } from "@/lib/resourceKinds";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorBanner, Tooltip } from "@/components/ui";
import { useSlideSheetMount } from "@/components/ui/useSlideSheetMount";
import {
  HelmChartActionModal,
  HelmReleaseActions,
} from "@/components/modals/HelmLifecycleModals";
import { toast } from "sonner";
import {
  SIMPLE_RESOURCE_REFS,
  type SimpleResourceRef,
} from "./simpleResourceRefs";
import {
  SIMPLE_RESOURCE_CONFIGS,
  simpleResourceDetailRows,
} from "./simpleResourceConfigs";

type SortKey = "name" | "status" | "age";

const TONE_TEXT: Record<SimpleResourceStatusTone, string> = {
  healthy: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-amber-400",
  critical: "text-rose-700 dark:text-rose-400",
  muted: "text-[var(--muted)]",
};

/** Kinds that are read-only: Events are ephemeral and Helm releases use Helm actions. */
const READ_ONLY_KINDS = new Set<SimpleResourceKind>(["events", "helmreleases"]);

/** Kinds with a working create flow through the generic manifest editor. */
const CREATABLE_KINDS = new Set<SimpleResourceKind>([
  "replicationcontrollers",
  "endpointslices",
  "ingressclasses",
  "persistentvolumeclaims",
  "horizontalpodautoscalers",
  "verticalpodautoscalers",
  "poddisruptionbudgets",
  "resourcequotas",
  "limitranges",
  "priorityclasses",
  "runtimeclasses",
  "leases",
  "mutatingwebhookconfigurations",
  "validatingwebhookconfigurations",
  "validatingadmissionpolicies",
  "validatingadmissionpolicybindings",
]);

/** Destructive kinds require typing the resource name before deletion. */
const TYPED_CONFIRMATION_KINDS = new Set<SimpleResourceKind>([
  "namespaces",
  "persistentvolumeclaims",
  "mutatingwebhookconfigurations",
  "validatingwebhookconfigurations",
  "validatingadmissionpolicies",
  "validatingadmissionpolicybindings",
]);

/** Critical kinds stay out of bulk delete; they require individual confirmation. */
const BULK_DELETE_BLOCKED = new Set<SimpleResourceKind>([
  "namespaces",
  "events",
  "helmreleases",
  "persistentvolumeclaims",
  "mutatingwebhookconfigurations",
  "validatingwebhookconfigurations",
  "validatingadmissionpolicies",
  "validatingadmissionpolicybindings",
]);

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unable to load resources from the cluster.";
}

function ResourceDetailDrawer({
  item,
  kind,
  configTitle,
  currentContext,
  resourceRef,
  canEdit,
  canDelete,
  onClose,
  onEdit,
  onChanged,
}: {
  item: SimpleResourceItem;
  kind: SimpleResourceKind;
  configTitle: string;
  currentContext: string;
  resourceRef?: SimpleResourceRef;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [yamlLoading, setYamlLoading] = React.useState(false);
  const [yamlCopied, setYamlCopied] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [showExpand, setShowExpand] = React.useState(false);
  const [expandSize, setExpandSize] = React.useState("");
  const [expanding, setExpanding] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const { isMounted, requestClose } = useSlideSheetMount(onClose);
  const needsTypedConfirmation = TYPED_CONFIRMATION_KINDS.has(kind);

  // CRD-backed kinds can be served at a different version than the reference
  // (VPA falls back to v1beta2 on older clusters), so prefer the API version
  // reported by the list row.
  const resolvedRef = React.useMemo(() => {
    if (!resourceRef) return undefined;
    const apiVersion = item.details.apiVersion;
    return apiVersion ? { ...resourceRef, apiVersion } : resourceRef;
  }, [item.details.apiVersion, resourceRef]);

  React.useEffect(() => {
    setYamlCopied(false);
    setConfirmDelete(false);
    setDeleteConfirmation("");
    setShowExpand(false);
    setExpandSize("");
    setActionError(null);
  }, [item]);

  const copyYaml = async () => {
    if (!resolvedRef || !currentContext) return;
    setYamlLoading(true);
    setActionError(null);
    try {
      const result = await invokeRpc<{ yaml: string }>("resources.get", {
        contextName: currentContext,
        apiVersion: resolvedRef.apiVersion,
        kind: resolvedRef.kind,
        resource: resolvedRef.resource,
        name: item.name,
        namespace: item.namespace ?? "",
      });
      await navigator.clipboard.writeText(result.yaml);
      setYamlCopied(true);
      toast.success("YAML copied to clipboard");
      window.setTimeout(() => setYamlCopied(false), 2000);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to copy YAML.",
      );
    } finally {
      setYamlLoading(false);
    }
  };

  const deleteResource = async () => {
    if (!resolvedRef || !currentContext) return;
    if (needsTypedConfirmation && deleteConfirmation.trim() !== item.name) {
      setActionError(`Type "${item.name}" to confirm deletion.`);
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      await invokeRpc("resources.delete", {
        contextName: currentContext,
        apiVersion: resolvedRef.apiVersion,
        kind: resolvedRef.kind,
        resource: resolvedRef.resource,
        name: item.name,
        namespace: item.namespace ?? "",
      });
      toast.success(`${item.name} deleted`);
      onChanged();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to delete resource.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const expandClaim = async () => {
    if (!currentContext) return;
    const storage = expandSize.trim();
    if (!/^[0-9]+(\.[0-9]+)?(Ki|Mi|Gi|Ti|Pi|Ei|k|M|G|T|P|E)?$/.test(storage)) {
      setActionError("Enter a storage size such as 5Gi or 20Gi.");
      return;
    }
    setExpanding(true);
    setActionError(null);
    try {
      await invokeRpc<{ storage: string }>("persistentvolumeclaims.expand", {
        contextName: currentContext,
        namespace: item.namespace ?? "",
        name: item.name,
        storage,
      });
      toast.success(`${item.name} expanded to ${storage}`);
      onChanged();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to expand the claim.",
      );
    } finally {
      setExpanding(false);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  return (
    <div
      data-testid="simple-resource-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} details`}
      className="fixed inset-0 z-[120] flex justify-end"
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/45 backdrop-blur-[1px] transition-opacity duration-200 motion-reduce:transition-none",
          isMounted ? "opacity-100" : "opacity-0",
        )}
        onClick={requestClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "slide-sheet relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl origin-right",
          isMounted
            ? "translate-x-0 scale-100 opacity-100"
            : "translate-x-full scale-[0.985] opacity-0",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {configTitle}
            </p>
            <h2 className="mt-1 truncate text-sm font-semibold text-[var(--foreground)]">
              {item.name}
            </h2>
            <div
              className={cn(
                "mt-1 flex items-center gap-1.5 font-mono text-[10px] font-medium",
                TONE_TEXT[item.statusTone],
              )}
            >
              {item.status}
            </div>
          </div>
          <button
            type="button"
            data-testid="simple-resource-drawer-close"
            onClick={requestClose}
            aria-label="Close resource details"
            className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <dl className="space-y-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            {item.namespace && (
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <dt className="text-[var(--muted)]">Namespace</dt>
                <dd className="font-mono text-[10px] text-[var(--foreground)]">
                  {item.namespace}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <dt className="text-[var(--muted)]">Age</dt>
              <dd className="font-mono text-[10px] text-[var(--foreground)]">
                {item.age}
              </dd>
            </div>
            {simpleResourceDetailRows(item).map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-3 text-[11px]"
              >
                <dt className="shrink-0 text-[var(--muted)]">{row.label}</dt>
                <dd
                  className="min-w-0 truncate text-right font-mono text-[10px] text-[var(--foreground)]"
                  title={row.value}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {item.labels && Object.keys(item.labels).length > 0 && (
            <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
              <h3 className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Labels
              </h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(item.labels).map(([key, value]) => (
                  <span
                    key={key}
                    className="max-w-full truncate rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)]"
                    title={`${key}=${value}`}
                  >
                    {key}={value}
                  </span>
                ))}
              </div>
            </section>
          )}

          {item.annotations && Object.keys(item.annotations).length > 0 && (
            <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
              <h3 className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Annotations
              </h3>
              <div className="mt-2 space-y-1">
                {Object.entries(item.annotations).map(([key, value]) => (
                  <div
                    key={key}
                    className="truncate font-mono text-[9px] text-[var(--muted)]"
                    title={`${key}=${value}`}
                  >
                    {key}={value}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(resolvedRef || canDelete || kind === "helmreleases") && (
            <section className="space-y-2 border-t border-[var(--border)] pt-3">
              {kind === "helmreleases" && (
                <HelmReleaseActions
                  target={{
                    name: item.name,
                    namespace: item.namespace || "default",
                    chart: item.details.chart,
                    chartVersion: item.details.chartVersion,
                  }}
                  onChanged={onChanged}
                />
              )}
              <div className="flex flex-wrap items-center gap-2">
                {resolvedRef && (
                  <button
                    type="button"
                    data-testid="simple-resource-copy-yaml"
                    onClick={() => void copyYaml()}
                    disabled={yamlLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60 cursor-pointer"
                  >
                    {yamlCopied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-[var(--muted)]" />
                    )}
                    {yamlCopied ? "Copied" : "Copy YAML"}
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    data-testid="simple-resource-edit"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5 text-[var(--muted)]" />
                    Edit YAML
                  </button>
                )}
                {kind === "persistentvolumeclaims" && (
                  <button
                    type="button"
                    data-testid="simple-resource-expand"
                    onClick={() => setShowExpand((value) => !value)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    <HardDrive className="h-3.5 w-3.5 text-[var(--muted)]" />
                    Expand
                  </button>
                )}
                {canDelete && !confirmDelete && (
                  <button
                    type="button"
                    data-testid="simple-resource-delete"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-2 text-[10px] font-medium text-rose-600 transition-colors hover:bg-rose-500/10 cursor-pointer dark:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
              {showExpand && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5">
                  <p className="text-[11px] text-[var(--foreground)]">
                    Expand <span className="font-mono">{item.name}</span> to a
                    larger size.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={expandSize}
                      onChange={(event) => setExpandSize(event.target.value)}
                      placeholder="5Gi"
                      aria-label="New storage size"
                      data-testid="simple-resource-expand-size"
                      className="h-8 w-28 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[11px] text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      data-testid="simple-resource-expand-confirm"
                      onClick={() => void expandClaim()}
                      disabled={expanding}
                      className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-zinc-950 transition-colors hover:opacity-90 disabled:opacity-60 cursor-pointer"
                    >
                      {expanding ? "Expanding..." : "Expand"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExpand(false)}
                      className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="mt-1.5 text-[9px] leading-relaxed text-[var(--muted)]">
                    The StorageClass must allow volume expansion. Shrinking a
                    claim is not supported.
                  </p>
                </div>
              )}
              {confirmDelete && (
                <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-2.5">
                  <p className="text-[11px] text-[var(--foreground)]">
                    Delete <span className="font-mono">{item.name}</span>?
                  </p>
                  {needsTypedConfirmation && (
                    <input
                      value={deleteConfirmation}
                      onChange={(event) =>
                        setDeleteConfirmation(event.target.value)
                      }
                      placeholder={`Type ${item.name} to confirm`}
                      aria-label="Type the resource name to confirm deletion"
                      className="mt-2 h-8 w-full rounded-md border border-rose-500/30 bg-[var(--surface)] px-2 font-mono text-[11px] text-[var(--foreground)] outline-hidden focus:border-rose-500"
                    />
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="simple-resource-delete-confirm"
                      onClick={() => void deleteResource()}
                      disabled={
                        deleting ||
                        (needsTypedConfirmation &&
                          deleteConfirmation.trim() !== item.name)
                      }
                      className="rounded-md bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60 cursor-pointer"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDelete(false);
                        setDeleteConfirmation("");
                      }}
                      className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {actionError && (
                <p role="alert" className="text-[10px] text-rose-500">
                  {actionError}
                </p>
              )}
            </section>
          )}

          <p className="pt-1 text-[10px] text-[var(--muted)]">
            {kind === "helmreleases"
              ? "Manage this release with Helm upgrade, rollback, and uninstall."
              : canEdit
                ? "Edit the live manifest, copy YAML, or run the available actions."
                : "Read-only view."}
          </p>
        </div>
      </aside>
    </div>
  );
}

export function SimpleResourcesView({ kind }: { kind: SimpleResourceKind }) {
  const config = SIMPLE_RESOURCE_CONFIGS[kind];
  const currentContext = useClusterStore((state) => state.currentContext);
  const currentNamespace = useClusterStore((state) => state.currentNamespace);
  const openCreateNamespace = useClusterStore(
    (state) => state.openCreateNamespace,
  );
  const openResourceEditor = useClusterStore(
    (state) => state.openResourceEditor,
  );
  const refreshResourceKind = useClusterStore(
    (state) => state.refreshResourceKind,
  );
  const namespaceRevision = useClusterStore((state) => state.namespaceRevision);
  const resourceRevision = useClusterStore((state) => state.resourceRevision);
  const [items, setItems] = React.useState<SimpleResourceItem[]>([]);
  const [truncated, setTruncated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [available, setAvailable] = React.useState(true);
  const [servedApiVersion, setServedApiVersion] = React.useState<
    string | undefined
  >();
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>(
    config.defaultSort ?? { key: "name", dir: 1 },
  );
  const [selected, setSelected] = React.useState<SimpleResourceItem | null>(
    null,
  );
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [bulkConfirm, setBulkConfirm] = React.useState(false);
  const [showInstall, setShowInstall] = React.useState(false);
  const requestId = React.useRef(0);

  const namespace = config.namespaceScoped ? currentNamespace : "all";
  const reloadRevision = kind === "namespaces" ? namespaceRevision : 0;

  const load = React.useCallback(async () => {
    if (!currentContext) {
      setError("No Kubernetes context is selected.");
      setIsLoading(false);
      return;
    }
    const id = requestId.current + 1;
    requestId.current = id;
    setIsLoading(true);
    setError(null);
    try {
      const result = await invokeRpc<SimpleResourceListResult>(
        "simpleResources.list",
        { contextName: currentContext, kind, namespace },
      );
      if (requestId.current !== id) return;
      setItems(result.items ?? []);
      setTruncated(Boolean(result.truncated));
      setAvailable(result.available !== false);
      setServedApiVersion(result.apiVersion);
    } catch (loadError) {
      if (requestId.current !== id) return;
      setItems([]);
      setError(errorMessage(loadError));
    } finally {
      if (requestId.current === id) setIsLoading(false);
    }
  }, [currentContext, kind, namespace]);

  React.useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load, reloadRevision, resourceRevision]);

  React.useEffect(() => {
    setSelectedKeys(new Set());
    setBulkConfirm(false);
  }, [filter, kind, namespace, search]);

  const filterCounts = React.useMemo(() => {
    const filterConfig = config.filter;
    if (!filterConfig) return {} as Record<string, number>;
    return Object.fromEntries(
      filterConfig.options.map((option) => [
        option,
        items.filter((item) => filterConfig.predicate(item, option)).length,
      ]),
    ) as Record<string, number>;
  }, [config.filter, items]);

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (config.filter && !config.filter.predicate(item, filter)) return false;
      if (!query) return true;
      const haystack = [
        item.name,
        item.namespace ?? "",
        item.status,
        ...Object.values(item.details),
        ...Object.entries(item.labels ?? {}).flat(),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    return [...filtered].sort((a, b) => {
      const value = (item: SimpleResourceItem) =>
        sort.key === "name"
          ? config.primary(item)
          : sort.key === "status"
            ? item.status
            : // Ages are formatted strings ("3m", "2h"); use the timestamp
              // so newest/oldest ordering stays chronological.
              item.createdAt || item.age;
      return (
        sort.dir *
        value(a).localeCompare(value(b), undefined, { numeric: true })
      );
    });
  }, [config, filter, items, search, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((previous) =>
      previous.key === key
        ? { key, dir: previous.dir === 1 ? -1 : 1 }
        : { key, dir: 1 },
    );
  };

  const resourceRef = SIMPLE_RESOURCE_REFS[kind];
  const readOnly = READ_ONLY_KINDS.has(kind) || !resourceRef;
  const canCreate =
    CREATABLE_KINDS.has(kind) && Boolean(resourceRef) && available;
  const canEdit = !readOnly;
  const canDelete = !readOnly;
  const canBulkDelete = !BULK_DELETE_BLOCKED.has(kind) && Boolean(resourceRef);
  const itemKey = (item: SimpleResourceItem) =>
    `${item.namespace ?? ""}/${item.name}`;
  const selectedItems = items.filter((item) => selectedKeys.has(itemKey(item)));

  const handleCreate = () => {
    if (!resourceRef) return;
    const targetNamespace = config.namespaceScoped
      ? currentNamespace === "all"
        ? "default"
        : currentNamespace
      : "";
    const target = createResourceTarget(resourceRef.kind, targetNamespace);
    if (target) {
      if (servedApiVersion) target.apiVersion = servedApiVersion;
      void openResourceEditor(target);
    }
  };

  const handleEditSelected = () => {
    if (!selected || !resourceRef) return;
    const target = {
      apiVersion: selected.details.apiVersion || resourceRef.apiVersion,
      kind: resourceRef.kind,
      resource: resourceRef.resource,
      name: selected.name,
      namespace: selected.namespace ?? "",
      mode: "edit" as const,
    };
    setSelected(null);
    void openResourceEditor(target);
  };

  const toggleSelected = (item: SimpleResourceItem) => {
    const key = itemKey(item);
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      const allSelected = filteredItems.every((item) =>
        next.has(itemKey(item)),
      );
      for (const item of filteredItems) {
        if (allSelected) next.delete(itemKey(item));
        else next.add(itemKey(item));
      }
      return next;
    });
  };

  const deleteSelected = async () => {
    if (!resourceRef || !canBulkDelete || selectedItems.length === 0) return;
    setIsBulkDeleting(true);
    let deleted = 0;
    const failures: string[] = [];
    for (let index = 0; index < selectedItems.length; index += 4) {
      const chunk = selectedItems.slice(index, index + 4);
      const outcomes = await Promise.all(
        chunk.map(async (item) => {
          try {
            await invokeRpc("resources.delete", {
              contextName: currentContext,
              apiVersion: item.details.apiVersion || resourceRef.apiVersion,
              kind: resourceRef.kind,
              resource: resourceRef.resource,
              name: item.name,
              namespace: item.namespace ?? "",
            });
            return null;
          } catch (error) {
            console.error(
              `Bulk delete failed for ${resourceRef.kind} ${itemKey(item)}:`,
              error,
            );
            return `${item.name}: ${
              error instanceof Error ? error.message : String(error)
            }`;
          }
        }),
      );
      for (const failure of outcomes) {
        if (failure) failures.push(failure);
        else deleted += 1;
      }
    }
    setIsBulkDeleting(false);
    setBulkConfirm(false);
    setSelectedKeys(new Set());
    const summary = `${deleted} ${resourceRef.kind}${
      deleted === 1 ? "" : "s"
    } deleted${failures.length > 0 ? ` · ${failures.length} failed` : ""}`;
    if (failures.length > 0) {
      toast.warning(summary, {
        description: failures.slice(0, 3).join("\n"),
      });
    } else {
      toast.success(summary);
    }
    void refreshResourceKind(resourceRef.kind);
    void load();
  };

  const scopeLabel = config.namespaceScoped
    ? currentNamespace === "all"
      ? "All namespaces"
      : currentNamespace
    : "Cluster scoped";

  return (
    <div
      data-testid={`simple-resource-view-${kind}`}
      className="flex h-full w-full flex-1 select-none flex-col overflow-hidden"
    >
      <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-2 py-1.5 glass-panel sm:px-3 lg:flex-nowrap lg:gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
          <h1
            className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--foreground)]"
            title={config.description}
          >
            <config.icon
              className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
              aria-hidden="true"
            />
            {config.title}
          </h1>
          <span className="hidden h-3 w-px bg-[var(--border)] sm:block" />

          <div className="relative min-w-0 w-full max-w-sm flex-1 sm:w-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={config.searchPlaceholder}
              aria-label={`Search ${config.title}`}
              className="w-full rounded-lg border border-[var(--border)] bg-slate-50 py-1 pl-8 pr-7 font-mono text-xs text-[var(--foreground)] outline-hidden transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
            />
            {search && (
              <Tooltip content="Clear search">
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </Tooltip>
            )}
          </div>

          {config.filter && (
            <div
              role="group"
              aria-label={`Filter ${config.title}`}
              className="relative flex max-w-full min-w-0 shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap rounded-lg border border-[var(--border)] bg-slate-100/80 p-0.5 text-xs select-none dark:bg-black/30"
            >
              {config.filter.options.map((option) => {
                const count = filterCounts[option] ?? 0;
                const isActive = filter === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-label={option}
                    aria-pressed={isActive}
                    onClick={() => setFilter(option)}
                    className={cn(
                      "relative z-10 flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] outline-hidden",
                      isActive
                        ? "border border-[var(--border)]/70 bg-white font-semibold text-[var(--foreground)] shadow-xs dark:bg-white/[0.12] dark:text-white"
                        : "border border-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    <span>{option}</span>
                    <span
                      className={cn(
                        "font-mono text-[10px] tabular-nums",
                        option === "Warning" && count > 0
                          ? "font-semibold text-rose-500"
                          : "text-[var(--muted)]",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span className="font-mono text-[11px]">
            {scopeLabel} · {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "item" : "items"}
            {truncated ? " · capped" : ""}
          </span>
          <div className="h-3 w-px bg-[var(--border)]" />
          {kind === "namespaces" && (
            <Tooltip content="Create namespace">
              <button
                type="button"
                data-testid="namespaces-create"
                onClick={openCreateNamespace}
                aria-label="Create namespace"
                className="cursor-pointer rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] outline-hidden"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </Tooltip>
          )}
          {kind === "helmreleases" && (
            <Tooltip content="Install Helm release">
              <button
                type="button"
                data-testid="helm-release-install"
                onClick={() => setShowInstall(true)}
                aria-label="Install Helm release"
                className="cursor-pointer rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] outline-hidden"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </Tooltip>
          )}
          {canCreate && (
            <Tooltip content={`Create ${config.title.replace(/s$/, "")}`}>
              <button
                type="button"
                data-testid={`simple-resource-create-${kind}`}
                onClick={handleCreate}
                aria-label={`Create ${config.title.replace(/s$/, "")}`}
                className="cursor-pointer rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] outline-hidden"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </Tooltip>
          )}
          <Tooltip content={`Refresh ${config.title.toLowerCase()}`}>
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              aria-label={`Refresh ${config.title}`}
              className="cursor-pointer rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] outline-hidden disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  isLoading && "animate-spin text-[var(--accent)]",
                )}
                aria-hidden="true"
              />
            </button>
          </Tooltip>
        </div>
      </div>

      {selectedKeys.size > 0 && (
        <div
          data-testid="simple-resource-bulk-bar"
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1.5"
        >
          <span className="font-mono text-[11px] text-[var(--foreground)]">
            {selectedItems.length} selected
          </span>
          <div className="flex items-center gap-2">
            {canBulkDelete &&
              (bulkConfirm ? (
                <>
                  <span className="text-[10px] text-[var(--muted)]">
                    Delete {selectedItems.length} {config.title.toLowerCase()}?
                  </span>
                  <button
                    type="button"
                    data-testid="simple-resource-bulk-delete-confirm"
                    onClick={() => void deleteSelected()}
                    disabled={isBulkDeleting}
                    className="rounded-md bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60 cursor-pointer"
                  >
                    {isBulkDeleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkConfirm(false)}
                    className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-testid="simple-resource-bulk-delete"
                  onClick={() => setBulkConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[10px] font-medium text-rose-600 transition-colors hover:bg-rose-500/20 cursor-pointer dark:text-rose-400"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete selected
                </button>
              ))}
            <button
              type="button"
              onClick={() => {
                setSelectedKeys(new Set());
                setBulkConfirm(false);
              }}
              className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 shrink-0 px-3">
          <ErrorBanner
            message={error}
            title={`Unable to load ${config.title.toLowerCase()}`}
            actionLabel="Retry"
            onAction={() => void load()}
          />
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="flex h-8 items-center gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-3">
            {[112, 88, 64, 48].map((width) => (
              <div
                key={width}
                className="h-2.5 animate-pulse rounded bg-[var(--surface-hover)]"
                style={{ width }}
              />
            ))}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex h-10 items-center gap-4 px-3">
                <div className="h-2.5 w-40 animate-pulse rounded bg-[var(--surface-hover)]" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-[var(--surface-hover)]" />
                <div className="ml-auto h-2.5 w-12 animate-pulse rounded bg-[var(--surface-hover)]" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto">
          <EmptyState
            variant={search || filter !== "All" ? "search" : "empty"}
            title={
              search || filter !== "All"
                ? `No ${config.title.toLowerCase()} match this filter`
                : !available
                  ? (config.unavailableTitle ??
                    "This resource API is not available")
                  : config.emptyTitle
            }
            description={
              search || filter !== "All"
                ? "Try a different search or clear the filter."
                : !available
                  ? (config.unavailableDescription ??
                    "The cluster does not serve this resource API.")
                  : config.emptyDescription
            }
            action={
              search || filter !== "All"
                ? {
                    label: "Clear filters",
                    onClick: () => {
                      setSearch("");
                      setFilter("All");
                    },
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] select-none">
              <tr className="h-8 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {canBulkDelete && (
                  <th scope="col" className="w-[34px] px-2 py-1">
                    <input
                      type="checkbox"
                      aria-label="Select all visible resources"
                      data-testid="simple-resource-select-all"
                      checked={
                        filteredItems.length > 0 &&
                        filteredItems.every((item) =>
                          selectedKeys.has(itemKey(item)),
                        )
                      }
                      onChange={toggleAllVisible}
                      className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                    />
                  </th>
                )}
                <th
                  scope="col"
                  className={cn(
                    "px-3 py-1 font-semibold",
                    config.namespaceScoped ? "w-[22%]" : "w-[26%]",
                  )}
                >
                  <SortButton
                    label={config.nameLabel ?? "Name"}
                    active={sort.key === "name"}
                    dir={sort.dir}
                    onClick={() => toggleSort("name")}
                  />
                </th>
                {config.namespaceScoped && (
                  <th scope="col" className="w-[12%] px-3 py-1 font-semibold">
                    Namespace
                  </th>
                )}
                {config.columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn("px-3 py-1 font-semibold", column.className)}
                  >
                    {column.label}
                  </th>
                ))}
                <th scope="col" className="w-[10%] px-3 py-1 font-semibold">
                  <SortButton
                    label="Status"
                    active={sort.key === "status"}
                    dir={sort.dir}
                    onClick={() => toggleSort("status")}
                  />
                </th>
                <th
                  scope="col"
                  className={cn(
                    "px-3 py-1 font-semibold",
                    config.ageLabel ? "w-[10%]" : "w-[6%]",
                  )}
                >
                  <SortButton
                    label={config.ageLabel ?? "Age"}
                    active={sort.key === "age"}
                    dir={sort.dir}
                    onClick={() => toggleSort("age")}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredItems.map((item) => (
                <tr
                  key={`${item.namespace ?? ""}/${item.name}`}
                  data-testid="simple-resource-row"
                  data-resource-name={item.name}
                  onClick={() => setSelected(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(item);
                    }
                  }}
                  tabIndex={0}
                  className="h-9 cursor-pointer transition-colors hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-hidden"
                >
                  {canBulkDelete && (
                    <td
                      className="px-2 py-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.name}`}
                        checked={selectedKeys.has(itemKey(item))}
                        onChange={() => toggleSelected(item)}
                        onClick={(event) => event.stopPropagation()}
                        className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                      />
                    </td>
                  )}
                  <td className="px-3 py-1">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <config.icon
                        className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
                        aria-hidden="true"
                      />
                      <div
                        className={cn(
                          "min-w-0 truncate font-medium text-[var(--foreground)]",
                          config.primaryMono && "font-mono text-[11px]",
                        )}
                        title={config.primary(item)}
                      >
                        {config.primary(item)}
                      </div>
                    </div>
                  </td>
                  {config.namespaceScoped && (
                    <td className="truncate px-3 py-1 font-mono text-[10px] text-[var(--muted)]">
                      {item.namespace || "—"}
                    </td>
                  )}
                  {config.columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "truncate px-3 py-1 text-[var(--muted)]",
                        column.className,
                      )}
                    >
                      {column.render(item)}
                    </td>
                  ))}
                  <td className="px-3 py-1">
                    <span
                      className={cn(
                        "inline-flex items-center truncate font-mono text-[10px] font-medium",
                        TONE_TEXT[item.statusTone],
                      )}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-1 font-mono text-[10px] tabular-nums text-[var(--muted)]">
                    {item.age}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ResourceDetailDrawer
          item={selected}
          kind={kind}
          configTitle={config.title}
          currentContext={currentContext}
          resourceRef={resourceRef}
          canEdit={canEdit}
          canDelete={canDelete}
          onClose={() => setSelected(null)}
          onEdit={handleEditSelected}
          onChanged={() => {
            setSelected(null);
            void load();
          }}
        />
      )}

      {kind === "helmreleases" && (
        <HelmChartActionModal
          open={showInstall}
          mode="install"
          onClose={() => setShowInstall(false)}
          onCompleted={() => void load()}
        />
      )}
    </div>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 1 | -1;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded transition-colors cursor-pointer hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
        active ? "text-[var(--foreground)]" : "text-[var(--muted)]",
      )}
    >
      {label}
      {active ? (
        dir === 1 ? (
          <ArrowUp
            className="h-3 w-3 text-[var(--accent)]"
            aria-hidden="true"
          />
        ) : (
          <ArrowDown
            className="h-3 w-3 text-[var(--accent)]"
            aria-hidden="true"
          />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" aria-hidden="true" />
      )}
    </button>
  );
}
