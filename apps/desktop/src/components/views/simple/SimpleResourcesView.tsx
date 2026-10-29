"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
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
import { EmptyState, ErrorBanner } from "@/components/ui";
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

const TONE_DOT: Record<SimpleResourceStatusTone, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
  muted: "bg-slate-400",
};

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

  React.useEffect(() => {
    setYamlCopied(false);
    setConfirmDelete(false);
    setActionError(null);
  }, [item]);

  const copyYaml = async () => {
    if (!resourceRef || !currentContext) return;
    setYamlLoading(true);
    setActionError(null);
    try {
      const result = await invokeRpc<{ yaml: string }>("resources.get", {
        contextName: currentContext,
        apiVersion: resourceRef.apiVersion,
        kind: resourceRef.kind,
        resource: resourceRef.resource,
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
    if (!resourceRef || !currentContext) return;
    setDeleting(true);
    setActionError(null);
    try {
      await invokeRpc("resources.delete", {
        contextName: currentContext,
        apiVersion: resourceRef.apiVersion,
        kind: resourceRef.kind,
        resource: resourceRef.resource,
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
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      data-testid="simple-resource-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} details`}
      className="fixed inset-0 z-[120] flex justify-end"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl">
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
                "mt-1 flex items-center gap-1.5 font-mono text-[10px]",
                TONE_TEXT[item.statusTone],
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  TONE_DOT[item.statusTone],
                )}
              />
              {item.status}
            </div>
          </div>
          <button
            type="button"
            data-testid="simple-resource-drawer-close"
            onClick={onClose}
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

          {(resourceRef || canDelete) && (
            <section className="space-y-2 border-t border-[var(--border)] pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {resourceRef && (
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
            {resourceRef
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
  const [items, setItems] = React.useState<SimpleResourceItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [truncated, setTruncated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });
  const [selected, setSelected] = React.useState<SimpleResourceItem | null>(
    null,
  );
  const requestId = React.useRef(0);

  const namespace = config.namespaceScoped ? currentNamespace : "all";

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
      setTotalCount(result.totalCount ?? result.items?.length ?? 0);
      setTruncated(Boolean(result.truncated));
    } catch (loadError) {
      if (requestId.current !== id) return;
      setItems([]);
      setTotalCount(0);
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
  }, [load]);

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
            : item.age;
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
      className="flex w-full flex-1 select-none flex-col overflow-y-auto p-4 md:p-5 lg:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-active)] text-[var(--accent)]">
              <config.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                  {config.title}
                </h1>
                <span className="rounded border border-[var(--border)] bg-[var(--surface-active)] px-2 py-0.5 font-mono text-[10px] text-[var(--foreground)]">
                  {totalCount} {totalCount === 1 ? "item" : "items"}
                </span>
                <span className="font-mono text-[10px] text-[var(--muted)]">
                  {scopeLabel}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-[11px] text-[var(--muted)]">
                {config.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-[var(--muted)]",
                isLoading && "animate-spin",
              )}
            />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={config.searchPlaceholder}
              aria-label={`Search ${config.title}`}
              className="w-full rounded-lg border border-[var(--border)] bg-black/[0.03] py-1.5 pl-8 pr-2.5 font-mono text-xs text-[var(--foreground)] outline-hidden transition-all placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
            />
          </div>

          {config.filter && (
            <div
              role="group"
              aria-label={`Filter ${config.title}`}
              className="flex max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-black/[0.03] p-0.5 dark:bg-black/30"
            >
              {config.filter.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                  className={cn(
                    "shrink-0 rounded-md px-2.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                    filter === option
                      ? "border border-[var(--border)]/70 bg-[var(--surface)] font-semibold text-[var(--foreground)] shadow-xs"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
            {filteredItems.length} shown
            {truncated ? " · capped at 500" : ""}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorBanner
            message={error}
            title={`Unable to load ${config.title.toLowerCase()}`}
            actionLabel="Retry"
            onAction={() => void load()}
          />
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-8 animate-pulse rounded-md bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            variant={search || filter !== "All" ? "search" : "empty"}
            title={
              search || filter !== "All"
                ? `No ${config.title.toLowerCase()} match this filter`
                : config.emptyTitle
            }
            description={
              search || filter !== "All"
                ? "Try a different search or clear the filter."
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
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <th scope="col" className="px-3 py-2 font-medium">
                  <SortButton
                    label={config.nameLabel ?? "Name"}
                    active={sort.key === "name"}
                    dir={sort.dir}
                    onClick={() => toggleSort("name")}
                  />
                </th>
                {config.columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn("px-3 py-2 font-medium", column.className)}
                  >
                    {column.label}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 font-medium">
                  <SortButton
                    label="Status"
                    active={sort.key === "status"}
                    dir={sort.dir}
                    onClick={() => toggleSort("status")}
                  />
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  <SortButton
                    label="Age"
                    active={sort.key === "age"}
                    dir={sort.dir}
                    onClick={() => toggleSort("age")}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
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
                  className="cursor-pointer border-b border-[var(--border)]/70 transition-colors last:border-b-0 hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-hidden"
                >
                  <td className="max-w-[320px] px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-active)] text-[var(--muted)]">
                        <config.icon className="h-3 w-3" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div
                          className="truncate font-medium text-[var(--foreground)]"
                          title={config.primary(item)}
                        >
                          {config.primary(item)}
                        </div>
                        {config.secondary && (
                          <div className="truncate font-mono text-[10px] text-[var(--muted)]">
                            {config.secondary(item)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {config.columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-3 py-2.5 text-[var(--muted)]",
                        column.className,
                      )}
                    >
                      {column.render(item)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 font-mono text-[10px]",
                        TONE_TEXT[item.statusTone],
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          TONE_DOT[item.statusTone],
                        )}
                        aria-hidden="true"
                      />
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] tabular-nums text-[var(--muted)]">
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
        "inline-flex items-center gap-1 rounded text-[9px] uppercase tracking-[0.12em] transition-colors cursor-pointer hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
        active ? "text-[var(--foreground)]" : "text-[var(--muted)]",
      )}
    >
      {label}
      {active &&
        (dir === 1 ? (
          <ChevronUp className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        ))}
    </button>
  );
}
