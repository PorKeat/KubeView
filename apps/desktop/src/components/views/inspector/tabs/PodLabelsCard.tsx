"use client";

import * as React from "react";
import { Tag, Search, Grid, List, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LabelPill } from "../components/LabelPill";

export function PodLabelsCard({ labels }: { labels: Record<string, string> }) {
  const [labelFilter, setLabelFilter] = React.useState("");
  const [labelViewMode, setLabelViewMode] = React.useState<"chips" | "table">(
    "chips",
  );

  const labelEntries = Object.entries(labels);
  const filteredLabels = labelEntries.filter(([k, v]) => {
    if (!labelFilter.trim()) return true;
    const query = labelFilter.toLowerCase();
    return k.toLowerCase().includes(query) || v.toLowerCase().includes(query);
  });

  if (labelEntries.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
          <Tag className="w-3.5 h-3.5 text-[#F08A42]" />
          <span>Labels</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
            {labelEntries.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {labelEntries.length > 3 && (
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={labelFilter}
                onChange={(e) => setLabelFilter(e.target.value)}
                placeholder="Filter labels..."
                className="w-28 sm:w-36 h-6 pl-6 pr-2 text-[10px] rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] outline-hidden focus:border-[var(--accent)] transition-colors font-mono"
              />
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center border border-[var(--border)] rounded-lg p-0.5 bg-black/[0.02] dark:bg-white/[0.02]">
            <button
              onClick={() => setLabelViewMode("chips")}
              className={cn(
                "p-1 rounded cursor-pointer transition-colors",
                labelViewMode === "chips"
                  ? "bg-[var(--surface-active)] text-[#F08A42]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
              title="Chips View"
            >
              <Grid className="w-3 h-3" />
            </button>
            <button
              onClick={() => setLabelViewMode("table")}
              className={cn(
                "p-1 rounded cursor-pointer transition-colors",
                labelViewMode === "table"
                  ? "bg-[var(--surface-active)] text-[#F08A42]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
              title="Table View"
            >
              <List className="w-3 h-3" />
            </button>
          </div>

          {/* Copy All */}
          <button
            onClick={() => {
              const yamlLabels = Object.entries(labels)
                .map(([k, v]) => `  ${k}: "${v}"`)
                .join("\n");
              navigator.clipboard.writeText(`labels:\n${yamlLabels}`);
              toast.success("All labels copied to clipboard");
            }}
            className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            title="Copy All Labels"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chips View */}
      {labelViewMode === "chips" ? (
        <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto pr-1">
          {filteredLabels.length > 0 ? (
            filteredLabels.map(([k, v]) => (
              <LabelPill key={k} labelKey={k} value={v} />
            ))
          ) : (
            <div className="text-[11px] text-[var(--muted)] py-2">
              No labels match &ldquo;{labelFilter}&rdquo;
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="border border-[var(--border)] rounded-xl overflow-hidden max-h-64 overflow-y-auto font-mono text-[10px]">
          <table className="w-full text-left">
            <thead className="bg-black/5 dark:bg-white/5 border-b border-[var(--border)] text-[var(--muted)]">
              <tr>
                <th className="px-2.5 py-1.5 font-semibold">Key</th>
                <th className="px-2.5 py-1.5 font-semibold">Value</th>
                <th className="px-2 py-1.5 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredLabels.map(([k, v]) => (
                <tr
                  key={k}
                  className="hover:bg-[var(--surface-hover)] transition-colors group"
                >
                  <td className="px-2.5 py-1.5 text-[var(--foreground)] font-semibold truncate max-w-[180px]">
                    {k}
                  </td>
                  <td className="px-2.5 py-1.5 text-[var(--muted)] truncate max-w-[200px]">
                    {v}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${k}=${v}`);
                        toast.success(`Copied: ${k}=${v}`);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity"
                      title="Copy Label"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
