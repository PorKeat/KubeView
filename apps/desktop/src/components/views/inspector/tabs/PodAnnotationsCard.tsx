"use client";

import * as React from "react";
import { FileCode, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

export function PodAnnotationsCard({
  annotations,
}: {
  annotations: Record<string, string>;
}) {
  const [showAnnotations, setShowAnnotations] = React.useState(false);
  const annotationEntries = Object.entries(annotations);

  if (annotationEntries.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2 shadow-2xs">
      <button
        onClick={() => setShowAnnotations(!showAnnotations)}
        className="w-full flex items-center justify-between text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <FileCode className="w-3.5 h-3.5 text-[#F08A42]" />
          <span>Annotations</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
            {annotationEntries.length}
          </span>
        </div>
        {showAnnotations ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)]" />
        )}
      </button>

      {showAnnotations && (
        <div className="pt-2 space-y-1.5 border-t border-[var(--border)] max-h-56 overflow-y-auto font-mono text-[10px]">
          {annotationEntries.map(([k, v]) => (
            <div
              key={k}
              className="p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] flex items-start justify-between gap-2 group"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-[var(--foreground)] block truncate">
                  {k}
                </span>
                <span className="text-[var(--muted)] block truncate text-[9px] mt-0.5">
                  {v}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${k}=${v}`);
                  toast.success(`Copied annotation: ${k}`);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity cursor-pointer shrink-0"
                title="Copy Annotation"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
