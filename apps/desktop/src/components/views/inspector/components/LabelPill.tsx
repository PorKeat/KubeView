"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export interface LabelPillProps {
  labelKey: string;
  value: string;
}

export function LabelPill({ labelKey, value }: LabelPillProps) {
  const [copied, setCopied] = React.useState(false);
  const slashIndex = labelKey.lastIndexOf("/");
  const prefix = slashIndex !== -1 ? labelKey.substring(0, slashIndex + 1) : "";
  const name = slashIndex !== -1 ? labelKey.substring(slashIndex + 1) : labelKey;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${labelKey}=${value}`);
    setCopied(true);
    toast.success(`Copied: ${labelKey}=${value}`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={handleCopy}
      title={`Click to copy: ${labelKey}=${value}`}
      className="group inline-flex items-center text-[10px] font-mono rounded-lg border border-[var(--border)] bg-[var(--surface-active)] hover:border-[var(--accent)]/50 transition-all cursor-pointer overflow-hidden shadow-2xs max-w-full"
    >
      <div className="px-2 py-1 flex items-center gap-0.5 border-r border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] min-w-0 truncate">
        {prefix && (
          <span className="text-[var(--muted)]/60 text-[9px] truncate max-w-[120px]">
            {prefix}
          </span>
        )}
        <span className="font-semibold text-[var(--foreground)]">{name}</span>
      </div>
      <div className="px-2 py-1 font-mono text-[var(--foreground)] bg-black/[0.04] dark:bg-white/[0.05] truncate max-w-[200px] flex items-center gap-1.5">
        <span className="truncate">{value}</span>
        {copied ? (
          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
        ) : (
          <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
        )}
      </div>
    </div>
  );
}
