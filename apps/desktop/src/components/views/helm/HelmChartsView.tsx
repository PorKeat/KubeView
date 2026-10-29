"use client";

import * as React from "react";
import { Boxes, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import type { HelmChartsResult } from "@kubeview/contracts";
import { toast } from "sonner";
import { invokeRpc } from "@/lib/ipc";
import { useHelmStore } from "@/stores/helmStore";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorBanner } from "@/components/ui";
import { CustomSelect } from "@/components/ui/CustomSelect";

function isValidRepoUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function HelmChartsView() {
  const repositories = useHelmStore((state) => state.repositories);
  const selectedRepositoryId = useHelmStore(
    (state) => state.selectedRepositoryId,
  );
  const addRepository = useHelmStore((state) => state.addRepository);
  const removeRepository = useHelmStore((state) => state.removeRepository);
  const selectRepository = useHelmStore((state) => state.selectRepository);

  const [charts, setCharts] = React.useState<HelmChartsResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const requestId = React.useRef(0);

  const selectedRepository = repositories.find(
    (repository) => repository.id === selectedRepositoryId,
  );

  const loadCharts = React.useCallback(async () => {
    if (!selectedRepository) {
      setCharts(null);
      setError(null);
      return;
    }
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setIsLoading(true);
    setError(null);
    try {
      const result = await invokeRpc<HelmChartsResult>("helm.charts", {
        repositoryUrl: selectedRepository.url,
      });
      if (requestId.current === currentRequest) setCharts(result);
    } catch (loadError) {
      if (requestId.current === currentRequest) {
        setCharts(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this chart repository.",
        );
      }
    } finally {
      if (requestId.current === currentRequest) setIsLoading(false);
    }
  }, [selectedRepository]);

  React.useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  const filteredCharts = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return charts?.charts ?? [];
    return (charts?.charts ?? []).filter((chart) =>
      `${chart.name} ${chart.version} ${chart.appVersion ?? ""} ${
        chart.description ?? ""
      }`
        .toLowerCase()
        .includes(query),
    );
  }, [charts, search]);

  const handleAdd = () => {
    if (!name.trim()) {
      setFormError("Give the repository a name.");
      return;
    }
    if (!isValidRepoUrl(url)) {
      setFormError("Enter a valid http:// or https:// repository URL.");
      return;
    }
    addRepository(name, url);
    setName("");
    setUrl("");
    setFormError(null);
    setShowForm(false);
    setSearch("");
    toast.success(`Added Helm repository ${name.trim()}`);
  };

  const handleRemove = () => {
    if (!selectedRepository) return;
    const removedName = selectedRepository.name;
    removeRepository(selectedRepository.id);
    setCharts(null);
    setSearch("");
    toast.success(`Removed ${removedName}`);
  };

  return (
    <div
      data-testid="helm-charts-view"
      className="flex w-full flex-1 select-none flex-col overflow-y-auto p-4 md:p-5 lg:p-6"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              Charts
            </h1>
            {charts && (
              <span className="rounded border border-[var(--border)] bg-[var(--surface-active)] px-2 py-0.5 font-mono text-[10px] text-[var(--foreground)]">
                {charts.totalCount}{" "}
                {charts.totalCount === 1 ? "chart" : "charts"}
              </span>
            )}
          </div>
          <p className="mt-1 max-w-xl text-[11px] text-[var(--muted)]">
            Browse Helm chart repositories. Repository settings stay local; this
            page is read-only and never installs a chart.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-testid="helm-add-repository"
            onClick={() => {
              setShowForm((current) => !current);
              setFormError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
          >
            <Plus className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Add repository</span>
          </button>
          <button
            type="button"
            data-testid="helm-refresh-charts"
            onClick={() => void loadCharts()}
            disabled={!selectedRepository || isLoading}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#f08a42] to-[#e85d26] px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-xs transition-all hover:from-[#ff9d5c] hover:to-[#f08a42] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div
          data-testid="helm-repository-form"
          className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[var(--foreground)]">
              Add Helm repository
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close repository form"
              className="rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
            <input
              data-testid="helm-repository-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Repository name"
              aria-label="Repository name"
              className="rounded-lg border border-[var(--border)] bg-black/[0.03] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
            />
            <input
              data-testid="helm-repository-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://charts.example.com"
              aria-label="Repository URL"
              className="rounded-lg border border-[var(--border)] bg-black/[0.03] px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
            />
            <button
              type="button"
              data-testid="helm-repository-save"
              onClick={handleAdd}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
            >
              Add
            </button>
          </div>
          {formError && (
            <p role="alert" className="mt-2 text-[10px] text-rose-500">
              {formError}
            </p>
          )}
        </div>
      )}

      {repositories.length === 0 ? (
        <div
          data-testid="helm-charts-empty"
          className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-16 text-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]">
            <Boxes className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-[var(--foreground)]">
            No chart repositories yet
          </h2>
          <p className="mt-1 max-w-sm text-[11px] text-[var(--muted)]">
            Add a Helm repository index to search its charts. Nothing is
            installed from this page.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <Plus
              className="h-3.5 w-3.5 text-[var(--accent)]"
              aria-hidden="true"
            />
            Add repository
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 lg:flex-row lg:items-center">
            <div className="min-w-0 shrink-0">
              <CustomSelect
                value={selectedRepositoryId ?? ""}
                onChange={(value) => selectRepository(value || null)}
                options={repositories.map((repository) => ({
                  value: repository.id,
                  label: repository.name,
                  badge: repository.url.replace(/^https?:\/\//, ""),
                }))}
                ariaLabel="Select Helm repository"
                triggerTestId="helm-repository-select"
                dropdownWidth="w-72"
                emptyLabel="No repositories"
              />
            </div>
            <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--muted)]">
              {selectedRepository?.url ?? "Select a repository"}
            </span>
            {selectedRepository && (
              <button
                type="button"
                data-testid="helm-remove-repository"
                onClick={handleRemove}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-rose-500 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Remove
              </button>
            )}
          </div>

          {error && (
            <div className="mt-3">
              <ErrorBanner
                message={error}
                title="Unable to load charts"
                actionLabel="Retry"
                onAction={() => void loadCharts()}
              />
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter charts by name, version, description..."
                aria-label="Search charts"
                className="w-full rounded-lg border border-[var(--border)] bg-black/[0.03] py-1.5 pl-8 pr-2.5 font-mono text-xs text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
              />
            </div>
            <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
              {filteredCharts.length} shown
            </span>
          </div>

          {isLoading ? (
            <div className="mt-3 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-8 animate-pulse rounded-md bg-[var(--surface-hover)]"
                />
              ))}
            </div>
          ) : error ? null : filteredCharts.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                variant={search ? "search" : "empty"}
                title={
                  search
                    ? "No charts match this search"
                    : "No charts in this repository"
                }
                description={
                  search
                    ? "Try a different chart name or version."
                    : "The repository index did not contain chart entries."
                }
                action={
                  search
                    ? {
                        label: "Clear search",
                        onClick: () => setSearch(""),
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
                      Chart
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Version
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      App version
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCharts.map((chart) => (
                    <tr
                      key={`${chart.name}@${chart.version}`}
                      data-testid="helm-chart-row"
                      className="border-b border-[var(--border)]/70 transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-active)] text-[var(--accent)]">
                            <Boxes className="h-3 w-3" aria-hidden="true" />
                          </span>
                          <span className="truncate font-medium text-[var(--foreground)]">
                            {chart.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--muted)]">
                        {chart.version}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--muted)]">
                        {chart.appVersion || "—"}
                      </td>
                      <td className="max-w-[440px] px-3 py-2.5">
                        <span
                          className="block truncate text-[10px] text-[var(--muted)]"
                          title={chart.description}
                        >
                          {chart.description || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="mt-3 text-[10px] text-[var(--muted)]">
        Read-only chart index. Install, upgrade, and rollback are not enabled.
      </p>
    </div>
  );
}
