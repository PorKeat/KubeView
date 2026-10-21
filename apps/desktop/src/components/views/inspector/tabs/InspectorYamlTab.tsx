"use client";

import * as React from "react";
import { Download, Copy, Check, RotateCw } from "lucide-react";

export interface InspectorYamlTabProps {
  yaml: string;
  isLoading: boolean;
  onCopy: () => void;
  onDownload: () => void;
  copiedYaml: boolean;
}

export function InspectorYamlTab({
  yaml,
  isLoading,
  onCopy,
  onDownload,
  copiedYaml,
}: InspectorYamlTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <span className="text-[11px] font-mono text-[var(--muted)]">Live Kubernetes YAML Definition</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onDownload}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
          <button
            onClick={onCopy}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[#F08A42] hover:bg-[#d97530] text-white font-medium transition-colors cursor-pointer shadow-xs"
          >
            {copiedYaml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedYaml ? "Copied" : "Copy YAML"}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-[var(--muted)] gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-[#F08A42]" />
          <span>Fetching live object from cluster...</span>
        </div>
      ) : (
        <pre className="p-4 rounded-2xl bg-slate-950 border border-[var(--border)] text-[11px] font-mono text-emerald-400 dark:text-emerald-300/90 overflow-x-auto leading-relaxed select-text shadow-inner max-h-[65vh]">
          {yaml}
        </pre>
      )}
    </div>
  );
}
