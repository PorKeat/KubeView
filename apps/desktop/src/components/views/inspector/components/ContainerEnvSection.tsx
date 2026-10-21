"use client";

import * as React from "react";
import { Key, ChevronDown, ChevronRight, Search, Eye, EyeOff, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ContainerEnvVar } from "@kubeview/contracts";

export interface ContainerEnvSectionProps {
  env: ContainerEnvVar[];
}

export function ContainerEnvSection({ env }: ContainerEnvSectionProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showValues, setShowValues] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = search
    ? env.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          (e.value && e.value.toLowerCase().includes(search.toLowerCase())) ||
          (e.valueFrom && e.valueFrom.toLowerCase().includes(search.toLowerCase()))
      )
    : env;

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-black/[0.01] dark:bg-white/[0.01]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold text-[11px] text-[var(--foreground)]">Environment Variables</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
            {env.length}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[var(--muted)]">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-[var(--border)] space-y-2.5 bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search env variables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] rounded-lg text-[var(--foreground)] outline-hidden focus:border-[var(--accent)]"
              />
            </div>
            <button
              onClick={() => setShowValues(!showValues)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono transition-colors cursor-pointer shrink-0",
                showValues
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
              title={showValues ? "Mask sensitive values" : "Reveal all values"}
            >
              {showValues ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showValues ? "Mask" : "Reveal"}</span>
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] font-mono text-[10px]">
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const isSecret = Boolean(item.valueFrom && item.valueFrom.startsWith("Secret:"));
                const displayVal = showValues
                  ? item.value || (item.valueFrom ? item.valueFrom : "")
                  : isSecret || !item.value
                  ? "••••••••"
                  : item.value.length > 35
                  ? item.value.slice(0, 35) + "..."
                  : item.value;

                return (
                  <div key={item.name} className="p-2 flex items-start justify-between gap-2 hover:bg-[var(--surface-hover)] group">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[var(--foreground)] select-all">{item.name}</span>
                        {item.valueFrom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]">
                            {item.valueFrom}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] select-all break-all">
                        {displayVal}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const copyText = `${item.name}=${item.value || item.valueFrom || ""}`;
                        navigator.clipboard.writeText(copyText);
                        toast.success(`Copied ${item.name}`);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer shrink-0"
                      title="Copy KEY=VALUE"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-[var(--muted)] text-[10px]">
                No environment variables match &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
