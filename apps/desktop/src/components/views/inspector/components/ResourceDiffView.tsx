"use client";

import type { YamlDiff } from "@/lib/yamlDiff";
import { cn } from "@/lib/utils";

export function ResourceDiffView({ diff }: { diff: YamlDiff }) {
  if (!diff.hasChanges) {
    return (
      <div
        data-testid="inspector-resource-editor-diff"
        className="flex min-h-[320px] flex-1 items-center justify-center rounded-lg border border-[var(--border)] bg-[#1e1e1e] font-mono text-xs text-slate-400"
      >
        No changes against the live manifest.
      </div>
    );
  }

  return (
    <div
      data-testid="inspector-resource-editor-diff"
      className="min-h-[320px] flex-1 overflow-auto rounded-lg border border-[var(--border)] bg-[#1e1e1e] font-mono text-[11px] leading-5"
    >
      {diff.lines.map((line, index) => (
        <div
          key={`${line.kind}-${line.oldLine ?? 0}-${line.newLine ?? 0}-${index}`}
          className={cn(
            "flex min-w-max border-l-2",
            line.kind === "added" &&
              "border-emerald-500/70 bg-emerald-500/10 text-emerald-300",
            line.kind === "removed" &&
              "border-rose-500/70 bg-rose-500/10 text-rose-300",
            line.kind === "context" && "border-transparent text-slate-400",
          )}
        >
          <span className="w-10 shrink-0 select-none border-r border-white/5 px-1 text-right text-slate-600">
            {line.oldLine ?? ""}
          </span>
          <span className="w-10 shrink-0 select-none border-r border-white/5 px-1 text-right text-slate-600">
            {line.newLine ?? ""}
          </span>
          <span className="w-5 shrink-0 select-none text-center text-slate-500">
            {line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "}
          </span>
          <span className="whitespace-pre pr-3">{line.text || " "}</span>
        </div>
      ))}
    </div>
  );
}
