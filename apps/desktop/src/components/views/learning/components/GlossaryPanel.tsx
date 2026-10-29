"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_TERMS,
} from "@/features/learning/content/glossary";

type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];

export function GlossaryPanel() {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<GlossaryCategory>("All");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const deferredQuery = React.useDeferredValue(query.trim().toLowerCase());

  const filtered = GLOSSARY_TERMS.filter((term) => {
    const matchesCategory = category === "All" || term.category === category;
    if (!matchesCategory) return false;
    if (!deferredQuery) return true;
    const searchable = [
      term.term,
      term.plain,
      term.analogy,
      term.command,
      ...(term.aliases ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(deferredQuery);
  });

  return (
    <section
      data-testid="learning-glossary"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Glossary
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">
            Short definitions with analogies and the kubectl command that shows
            the same object.
          </p>
        </div>
        <div className="relative w-full shrink-0 lg:w-72">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a term..."
            aria-label="Search the Kubernetes glossary"
            data-testid="learning-glossary-search"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-8 pr-2.5 font-mono text-[11px] text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {GLOSSARY_CATEGORIES.map((item) => {
          const isActive = category === item;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={isActive}
              onClick={() => setCategory(item)}
              data-testid={`learning-glossary-category-${item.toLowerCase()}`}
              className={cn(
                "rounded-md border px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                isActive
                  ? "border-[var(--accent)]/35 bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
              )}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-mono text-[var(--muted)]">
        <span>
          {filtered.length} of {GLOSSARY_TERMS.length} terms
        </span>
        {query && <span>Filtered by &quot;{query}&quot;</span>}
      </div>

      {filtered.length === 0 ? (
        <div
          data-testid="learning-glossary-empty"
          className="mt-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center"
        >
          <p className="text-xs font-medium text-[var(--foreground)]">
            No matching terms
          </p>
          <p className="mt-1 text-[10px] text-[var(--muted)]">
            Try a shorter word or clear the category filter.
          </p>
        </div>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((term) => {
            const isExpanded = expandedId === term.id;
            return (
              <article
                key={term.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  isExpanded
                    ? "border-[var(--accent)]/30 bg-[var(--accent)]/[0.04]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]",
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((current) =>
                      current === term.id ? null : term.id,
                    )
                  }
                  aria-expanded={isExpanded}
                  data-testid={`learning-glossary-term-${term.id}`}
                  className="flex w-full items-start justify-between gap-2 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden rounded-md"
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold text-[var(--foreground)]">
                      {term.term}
                    </span>
                    <span className="mt-0.5 block text-[9px] font-mono uppercase tracking-wider text-[var(--muted)]">
                      {term.category}
                    </span>
                  </span>
                  {isExpanded ? (
                    <ChevronUp
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronDown
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
                      aria-hidden="true"
                    />
                  )}
                </button>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
                  {term.plain}
                </p>
                {isExpanded && (
                  <div className="mt-2 space-y-1.5 border-t border-[var(--border)] pt-2">
                    {term.analogy && (
                      <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                        <span className="font-semibold text-[var(--foreground)]">
                          Think of it as:
                        </span>{" "}
                        {term.analogy}
                      </p>
                    )}
                    {term.command && (
                      <code className="block overflow-x-auto whitespace-pre-wrap break-all rounded border border-[var(--border)] bg-black/[0.025] px-1.5 py-1 font-mono text-[9px] text-[var(--muted)] dark:bg-white/[0.03]">
                        {term.command}
                      </code>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
