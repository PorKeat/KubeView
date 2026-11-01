"use client";

import * as React from "react";
import {
  ArrowUpCircle,
  Download,
  ExternalLink,
  RefreshCw,
  X,
} from "lucide-react";
import { openExternalUrl } from "@/lib/openExternal";
import { useUpdateStore } from "@/stores/updateStore";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function UpdateBanner() {
  const {
    phase,
    info,
    downloadedBytes,
    totalBytes,
    error,
    dismissedVersion,
    installUpdate,
    dismiss,
    restartApp,
  } = useUpdateStore();

  const available = phase === "available" && info;
  const visible =
    (available && info.version !== dismissedVersion) ||
    phase === "downloading" ||
    phase === "installing" ||
    phase === "ready";

  if (!visible) return null;

  const percent =
    totalBytes && totalBytes > 0
      ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
      : null;
  const title = available
    ? `KubeView ${info.version} is available`
    : phase === "downloading"
      ? `Downloading KubeView ${info?.version ?? "update"}`
      : phase === "installing"
        ? "Installing update"
        : "Update installed";
  const detail = available
    ? "Install the signed update without leaving KubeView. Your settings and clusters are preserved."
    : phase === "downloading"
      ? `${formatBytes(downloadedBytes)}${
          totalBytes ? ` of ${formatBytes(totalBytes)}` : ""
        }${percent !== null ? ` · ${percent}%` : ""}`
      : phase === "installing"
        ? "KubeView will restart when installation completes."
        : error || "Restart KubeView to finish the update.";

  return (
    <div
      data-testid="update-banner"
      className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-2 sm:px-4"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
        {phase === "ready" ? (
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        ) : phase === "available" ? (
          <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold text-[var(--foreground)]">
            {title}
          </p>
          {available && (
            <span className="rounded border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-1.5 py-0.5 font-mono text-[9px] text-[var(--accent)]">
              v{info.currentVersion} → v{info.version}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">
          {detail}
        </p>
        {phase === "downloading" && (
          <div className="mt-1.5 h-1 w-full max-w-sm overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className={cn(
                "h-full rounded-full bg-[var(--accent)] transition-[width] duration-200",
                percent === null && "w-1/3 animate-pulse",
              )}
              style={percent !== null ? { width: `${percent}%` } : undefined}
            />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {available && (
          <>
            <button
              type="button"
              onClick={() =>
                void openExternalUrl(
                  `https://github.com/PorKeat/KubeView/releases/tag/v${info.version}`,
                )
              }
              className="hidden items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] sm:inline-flex"
            >
              <ExternalLink className="h-3 w-3" />
              Notes
            </button>
            <button
              type="button"
              data-testid="update-banner-install"
              onClick={() => void installUpdate()}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-zinc-950 transition-opacity hover:opacity-90"
            >
              Install update
            </button>
            <button
              type="button"
              data-testid="update-banner-dismiss"
              onClick={dismiss}
              aria-label="Dismiss update"
              className="rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {phase === "ready" && (
          <button
            type="button"
            data-testid="update-banner-restart"
            onClick={() => void restartApp()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-zinc-950 transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-3 w-3" />
            Restart now
          </button>
        )}
      </div>
    </div>
  );
}
