"use client";

import type { YamlDiff } from "@/lib/yamlDiff";
import { cn } from "@/lib/utils";

export function ResourceDiffView({ diff }: { diff: YamlDiff }) {
  if (!diff.hasChanges) {
    return (
      <div
        data-testid="inspector-resource-editor-diff"
        className="flex min-h-[320px] flex-1 items-center justify-center rounded-lg border border-[var(--editor-border)] bg-[var(--editor-bg)] font-mono text-xs text-[var(--editor-muted)]"
      >
        No changes against the live manifest.
      </div>
    );
  }

  return (
    <div
      data-testid="inspector-resource-editor-diff"
      className="min-h-[320px] flex-1 overflow-auto rounded-lg border border-[var(--editor-border)] bg-[var(--editor-bg)] font-mono text-[11px] leading-5 text-[var(--editor-fg)]"
    >
      {diff.lines.map((line, index) => (
        <div
          key={`${line.kind}-${line.oldLine ?? 0}-${line.newLine ?? 0}-${index}`}
          className={cn(
            "flex min-w-max border-l-2",
            line.kind === "added" &&
              "border-emerald-500/70 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            line.kind === "removed" &&
              "border-rose-500/70 bg-rose-500/10 text-rose-700 dark:text-rose-300",
            line.kind === "context" &&
              "border-transparent text-[var(--editor-muted)]",
          )}
        >
          <span className="w-10 shrink-0 select-none border-r border-[var(--editor-border)] px-1 text-right text-[var(--editor-muted)]">
            {line.oldLine ?? ""}
          </span>
          <span className="w-10 shrink-0 select-none border-r border-[var(--editor-border)] px-1 text-right text-[var(--editor-muted)]">
            {line.newLine ?? ""}
          </span>
          <span className="w-5 shrink-0 select-none text-center text-[var(--editor-muted)]">
            {line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "}
          </span>
          <span className="whitespace-pre pr-3">{line.text || " "}</span>
        </div>
      ))}
    </div>
  );
}
