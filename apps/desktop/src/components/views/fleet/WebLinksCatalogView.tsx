"use client";

import * as React from "react";
import { ExternalLink, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";
import { useCatalogStore, type CatalogLink } from "@/stores/catalogStore";
import { openExternalUrl } from "@/lib/openExternal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { clusterTag, clusterTone } from "@/lib/clusterVisuals";

interface LinkFormState {
  id?: string;
  label: string;
  url: string;
  contextName: string;
}

const EMPTY_FORM: LinkFormState = { label: "", url: "", contextName: "" };

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function WebLinksCatalogView() {
  const availableContexts = useClusterStore((state) => state.availableContexts);
  const links = useCatalogStore((state) => state.links);
  const addLink = useCatalogStore((state) => state.addLink);
  const updateLink = useCatalogStore((state) => state.updateLink);
  const removeLink = useCatalogStore((state) => state.removeLink);

  const [form, setForm] = React.useState<LinkFormState | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState<string | null>(
    null,
  );

  const clusterOptions = React.useMemo(
    () => [
      { value: "", label: "All clusters" },
      ...availableContexts.map((context) => ({
        value: context.name,
        label: context.name,
      })),
    ],
    [availableContexts],
  );

  const startCreate = () => {
    setForm({ ...EMPTY_FORM });
    setError(null);
  };

  const startEdit = (link: CatalogLink) => {
    setForm({
      id: link.id,
      label: link.label,
      url: link.url,
      contextName: link.contextName ?? "",
    });
    setError(null);
  };

  const handleSave = () => {
    if (!form) return;
    const label = form.label.trim();
    const url = normalizeUrl(form.url);

    if (!label) {
      setError("Give the link a name.");
      return;
    }
    if (!url) {
      setError("Enter a valid http:// or https:// URL.");
      return;
    }

    const payload = {
      label,
      url,
      contextName: form.contextName || undefined,
    };

    if (form.id) {
      updateLink(form.id, payload);
      toast.success(`Updated ${label}`);
    } else {
      addLink(payload);
      toast.success(`Added ${label}`);
    }
    setForm(null);
    setError(null);
  };

  const handleDelete = (link: CatalogLink) => {
    removeLink(link.id);
    toast.success(`Removed ${link.label}`);
    setConfirmingDelete(null);
  };

  const renderCluster = (contextName?: string) => {
    if (!contextName) {
      return (
        <span className="text-[10px] text-[var(--muted)]">All clusters</span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[var(--foreground)]">
        <span
          className="flex h-4 w-4 items-center justify-center rounded border border-white/15 text-[7px] font-semibold text-white"
          style={{ backgroundImage: clusterTone(contextName) }}
          aria-hidden="true"
        >
          {clusterTag(contextName)}
        </span>
        <span className="max-w-[160px] truncate" title={contextName}>
          {contextName}
        </span>
      </span>
    );
  };

  return (
    <div
      data-testid="web-links-view"
      className="flex w-full flex-1 select-none flex-col overflow-y-auto p-4 md:p-5 lg:p-6"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              Web Links
            </h1>
            <span className="rounded border border-[var(--border)] bg-[var(--surface-active)] px-2 py-0.5 font-mono text-[10px] text-[var(--foreground)]">
              {links.length} {links.length === 1 ? "link" : "links"}
            </span>
          </div>
          <p className="mt-1 max-w-xl text-[11px] text-[var(--muted)]">
            Keep the dashboards and consoles you open every day next to your
            clusters. Links open in your browser and stay on this machine.
          </p>
        </div>
        <button
          type="button"
          data-testid="web-links-add"
          onClick={startCreate}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-[#f08a42] to-[#e85d26] px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-xs transition-all hover:from-[#ff9d5c] hover:to-[#f08a42] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add link
        </button>
      </div>

      {form && (
        <div
          data-testid="web-link-form"
          className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[var(--foreground)]">
              {form.id ? "Edit link" : "New link"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setError(null);
              }}
              aria-label="Close link form"
              className="rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-[1.2fr_2fr_1fr_auto]">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                Name
              </span>
              <input
                type="text"
                data-testid="web-link-label"
                value={form.label}
                onChange={(event) =>
                  setForm({ ...form, label: event.target.value })
                }
                placeholder="Argo CD"
                className="rounded-lg border border-[var(--border)] bg-black/[0.03] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                URL
              </span>
              <input
                type="text"
                data-testid="web-link-url"
                value={form.url}
                onChange={(event) =>
                  setForm({ ...form, url: event.target.value })
                }
                placeholder="https://argo.example.com"
                className="rounded-lg border border-[var(--border)] bg-black/[0.03] px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
              />
            </label>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                Cluster
              </span>
              <CustomSelect
                value={form.contextName}
                onChange={(value) => setForm({ ...form, contextName: value })}
                options={clusterOptions}
                ariaLabel="Link cluster"
                triggerTestId="web-link-cluster"
                dropdownWidth="w-56"
                containerClassName="w-full"
                className="w-full"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                data-testid="web-link-save"
                onClick={handleSave}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(null);
                  setError(null);
                }}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-[10px] text-rose-500">
              {error}
            </p>
          )}
        </div>
      )}

      {links.length === 0 ? (
        <div
          data-testid="web-links-empty"
          className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-16 text-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-[var(--foreground)]">
            No saved links yet
          </h2>
          <p className="mt-1 max-w-sm text-[11px] text-[var(--muted)]">
            Add Argo CD, Grafana, a cloud console, or any dashboard you use with
            your clusters.
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <Plus
              className="h-3.5 w-3.5 text-[var(--accent)]"
              aria-hidden="true"
            />
            Add your first link
          </button>
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <th scope="col" className="px-3 py-2 font-medium">
                  Name
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  URL
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Cluster
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr
                  key={link.id}
                  data-testid="web-link-row"
                  data-link-label={link.label}
                  className="border-b border-[var(--border)]/70 transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-active)] text-[var(--accent)]">
                        <Link2 className="h-3 w-3" aria-hidden="true" />
                      </span>
                      <span className="truncate font-medium text-[var(--foreground)]">
                        {link.label}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-[320px] px-3 py-2.5">
                    <span
                      className="block truncate font-mono text-[10px] text-[var(--muted)]"
                      title={link.url}
                    >
                      {link.url}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {renderCluster(link.contextName)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      {confirmingDelete === link.id ? (
                        <>
                          <button
                            type="button"
                            data-testid="web-link-delete-confirm"
                            onClick={() => handleDelete(link)}
                            className="rounded-md bg-rose-600 px-2 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-rose-500 cursor-pointer"
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDelete(null)}
                            className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            data-testid="web-link-open"
                            onClick={() => void openExternalUrl(link.url)}
                            aria-label={`Open ${link.label}`}
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-active)] hover:text-[var(--foreground)] cursor-pointer"
                          >
                            <ExternalLink
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            Open
                          </button>
                          <button
                            type="button"
                            data-testid="web-link-edit"
                            onClick={() => startEdit(link)}
                            aria-label={`Edit ${link.label}`}
                            className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-active)] hover:text-[var(--foreground)] cursor-pointer"
                          >
                            <Pencil
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                          <button
                            type="button"
                            data-testid="web-link-delete"
                            onClick={() => setConfirmingDelete(link.id)}
                            aria-label={`Remove ${link.label}`}
                            className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[10px] text-[var(--muted)]">
        Saved in local app storage. Nothing is uploaded.
      </p>
    </div>
  );
}
