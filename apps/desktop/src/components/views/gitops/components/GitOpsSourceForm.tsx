"use client";

import * as React from "react";
import {
  ChevronDown,
  FolderOpen,
  FolderSearch,
  History,
  ScanSearch,
} from "lucide-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

function sourceLabel(path: string): string {
  return path.split("/").filter(Boolean).pop() || path;
}

export function GitOpsSourceForm({
  path,
  recentPaths,
  isScanning,
  isDragActive,
  onChange,
  onScan,
  onChooseFolder,
  onUseRecentPath,
}: {
  path: string;
  recentPaths: string[];
  isScanning: boolean;
  isDragActive: boolean;
  onChange: (value: string) => void;
  onScan: () => void;
  onChooseFolder: () => void;
  onUseRecentPath: (path: string) => void;
}) {
  const [manualMode, setManualMode] = React.useState(false);

  return (
    <form
      data-testid="gitops-source-form"
      onSubmit={(event) => {
        event.preventDefault();
        onScan();
      }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)]">
        <FolderSearch className="h-3.5 w-3.5 text-[var(--accent)]" />
        Manifest source
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
        Choose a repository folder, drop it below, or reuse a recent source. Raw
        YAML is compared against the live cluster.
      </p>

      <div
        className={cn(
          "mt-2.5 rounded-lg border border-dashed p-3 transition-colors",
          isDragActive
            ? "border-[var(--accent)] bg-[var(--accent)]/10"
            : "border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02]",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <FolderOpen className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-[var(--foreground)]">
                {isDragActive ? "Drop folder to scan" : "Local manifest folder"}
              </div>
              <div className="truncate font-mono text-[9px] text-[var(--muted)]">
                {path || "Drag and drop, or choose a folder"}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-testid="gitops-choose-folder"
              onClick={() => {
                setManualMode(true);
                void onChooseFolder();
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              <FolderOpen className="h-3 w-3" />
              Choose folder
            </button>
            <button
              type="button"
              data-testid="gitops-manual-toggle"
              onClick={() => setManualMode((current) => !current)}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[9px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  manualMode && "rotate-180",
                )}
              />
              {manualMode ? "Hide path" : "Enter path manually"}
            </button>
          </div>
        </div>
      </div>

      {manualMode && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            data-testid="gitops-source-path"
            value={path}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/path/to/your/gitops/repository"
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
            aria-label="Local repository path"
          />
          <button
            type="submit"
            data-testid="gitops-scan"
            disabled={isScanning || !path.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-50"
          >
            {isScanning ? (
              <ScanSearch className="h-3 w-3 animate-pulse" />
            ) : (
              <ScanSearch className="h-3 w-3" />
            )}
            {isScanning ? "Scanning..." : "Scan for drift"}
          </button>
        </div>
      )}

      {!manualMode && path && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.02]">
          <span className="min-w-0 truncate font-mono text-[9px] text-[var(--muted)]">
            Selected: {path}
          </span>
          <button
            type="submit"
            data-testid="gitops-scan"
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1 text-[9px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <ScanSearch
              className={cn("h-3 w-3", isScanning && "animate-pulse")}
            />
            Scan again
          </button>
        </div>
      )}

      {recentPaths.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <History className="h-3 w-3 text-[var(--muted)]" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
            Recent
          </span>
          {recentPaths.map((recentPath) => (
            <button
              key={recentPath}
              type="button"
              data-testid="gitops-recent-path"
              onClick={() => onUseRecentPath(recentPath)}
              className="max-w-[220px] truncate rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-[9px] text-[var(--muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]"
              title={recentPath}
            >
              {sourceLabel(recentPath)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-[var(--muted)]">
        <Tooltip content="Secrets are excluded until redaction support is implemented.">
          <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono">
            raw YAML only
          </span>
        </Tooltip>
        <span>Remote Git and controller sync are planned.</span>
      </div>
    </form>
  );
}
