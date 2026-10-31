"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
import { cn } from "@/lib/utils";
import { EmptyState, ErrorBanner, Tooltip } from "@/components/ui";
import { useSlideSheetMount } from "@/components/ui/useSlideSheetMount";
import { toast } from "sonner";
import {
  SIMPLE_RESOURCE_REFS,
  SAFE_DELETE_KINDS,
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

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unable to load resources from the cluster.";
}

function ResourceDetailDrawer({
  item,
  configTitle,
  currentContext,
  resourceRef,
  canDelete,
  onClose,
  onDeleted,
}: {
  item: SimpleResourceItem;
  configTitle: string;
  currentContext: string;
  resourceRef?: SimpleResourceRef;
  canDelete: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [yamlLoading, setYamlLoading] = React.useState(false);
  const [yamlCopied, setYamlCopied] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const { isMounted, requestClose } = useSlideSheetMount(onClose);

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
      onDeleted();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to delete resource.",
      );
    } finally {
      setDeleting(false);
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

          {(resolvedRef || canDelete) && (
            <section className="space-y-2 border-t border-[var(--border)] pt-3">
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
              {confirmDelete && (
                <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-2.5">
                  <p className="text-[11px] text-[var(--foreground)]">
                    Delete <span className="font-mono">{item.name}</span>?
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="simple-resource-delete-confirm"
                      onClick={() => void deleteResource()}
                      disabled={deleting}
                      className="rounded-md bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60 cursor-pointer"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
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
            {resolvedRef
              ? "Read-only details with YAML copy and safe actions."
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
  const namespaceRevision = useClusterStore((state) => state.namespaceRevision);
  const [items, setItems] = React.useState<SimpleResourceItem[]>([]);
  const [truncated, setTruncated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [available, setAvailable] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>(
    config.defaultSort ?? { key: "name", dir: 1 },
  );
  const [selected, setSelected] = React.useState<SimpleResourceItem | null>(
    null,
  );
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
  }, [load, reloadRevision]);

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
                  className="cursor-pointer transition-colors hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-hidden"
                >
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
          configTitle={config.title}
          currentContext={currentContext}
          resourceRef={SIMPLE_RESOURCE_REFS[kind]}
          canDelete={SAFE_DELETE_KINDS.has(kind)}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            void load();
          }}
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
