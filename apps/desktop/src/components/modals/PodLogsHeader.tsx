"use client";

import {
  X,
  FileText,
  RotateCw,
  RotateCcw,
  Copy,
  Download,
  Check,
  Layers,
  Clock,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Tooltip } from "@/components/ui/Tooltip";

export interface PodLogsHeaderProps {
  podName: string;
  namespace: string;
  containers: string[];
  selectedContainer: string;
  onSelectContainer: (container: string) => void;
  tailLines: number;
  onTailLinesChange: (tailLines: number) => void;
  isFollowing: boolean;
  onToggleFollow: () => void;
  showTimestamps: boolean;
  onToggleTimestamps: () => void;
  previous: boolean;
  onTogglePrevious: () => void;
  restartCount: number;
  currentContainerName: string;
  isLoading: boolean;
  copied: boolean;
  onRefresh: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onClose: () => void;
}

export function PodLogsHeader({
  podName,
  namespace,
  containers,
  selectedContainer,
  onSelectContainer,
  tailLines,
  onTailLinesChange,
  isFollowing,
  onToggleFollow,
  showTimestamps,
  onToggleTimestamps,
  previous,
  onTogglePrevious,
  restartCount,
  currentContainerName,
  isLoading,
  copied,
  onRefresh,
  onCopy,
  onDownload,
  onClose,
}: PodLogsHeaderProps) {
  return (
    <div className="min-h-14 border-b border-[var(--border)] px-3 sm:px-5 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between shrink-0 bg-slate-50/80 dark:bg-black/30 gap-2 sm:gap-3">
      {/* Left: Identity */}
      <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0 pr-0 sm:pr-2">
        <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--border)] flex items-center justify-center text-[var(--foreground)] shrink-0 shadow-2xs">
          <FileText className="w-4 h-4 text-[var(--accent)]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[var(--foreground)] truncate font-mono tracking-tight">
              {podName}
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/[0.04] dark:bg-white/[0.06] text-[var(--muted)] border border-[var(--border)]">
              ns:{namespace}
            </span>
            {isFollowing ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                LIVE STREAM
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                SNAPSHOT
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--muted)] font-mono truncate mt-0.5">
            {containers.length > 1
              ? `Active container: ${currentContainerName || "primary"}`
              : "Container stdout/stderr stream"}
          </p>
        </div>
      </div>

      {/* Right: Controls & Actions */}
      <div className="flex max-w-full items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        {/* Container Selector (if multi-container pod) */}
        {containers.length > 1 && (
          <CustomSelect
            value={selectedContainer || containers[0]}
            onChange={onSelectContainer}
            options={containers.map((c) => ({ value: c, label: c }))}
            icon={<Layers className="w-3.5 h-3.5 text-[var(--accent)]" />}
            placeholder="Container"
            dropdownWidth="w-36"
          />
        )}

        {/* Tail Lines Selector */}
        <CustomSelect
          value={tailLines}
          onChange={onTailLinesChange}
          options={[
            { value: 100, label: "100 lines" },
            { value: 500, label: "500 lines" },
            { value: 1000, label: "1,000 lines" },
            { value: 5000, label: "5,000 lines" },
          ]}
          dropdownWidth="w-32"
        />

        {/* Stream Modes & Toggles */}
        <div className="flex items-center gap-1.5">
          {/* Follow Toggle */}
          <button
            type="button"
            onClick={onToggleFollow}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all cursor-pointer shadow-2xs active:scale-[0.98]",
              isFollowing
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
            )}
            title="Toggle continuous log tailing and streaming"
          >
            <Radio
              className={cn("w-3.5 h-3.5", isFollowing && "text-emerald-500")}
            />
            <span>Follow</span>
          </button>

          {/* Timestamps Toggle */}
          <button
            type="button"
            onClick={onToggleTimestamps}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all cursor-pointer shadow-2xs active:scale-[0.98]",
              showTimestamps
                ? "bg-[var(--surface-active)] border-[var(--border)] text-[var(--foreground)] font-semibold"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
            )}
            title="Toggle RFC3339 timestamps"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timestamps</span>
          </button>

          {/* Previous Toggle with restart badge */}
          <button
            type="button"
            onClick={onTogglePrevious}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all cursor-pointer shadow-2xs active:scale-[0.98]",
              previous
                ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
            )}
            title={
              restartCount === 0
                ? `No previous terminated container (0 restarts)`
                : `Show logs for previous terminated container instance (${restartCount} restart${
                    restartCount > 1 ? "s" : ""
                  })`
            }
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Previous</span>
            {restartCount > 0 ? (
              <span className="px-1 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                {restartCount}x
              </span>
            ) : (
              <span className="px-1 py-0.2 rounded text-[9px] bg-black/5 dark:bg-white/5 text-[var(--muted)] opacity-60">
                0
              </span>
            )}
          </button>
        </div>

        <div className="h-4 w-px bg-[var(--border)] mx-0.5" />

        {/* Utility Actions */}
        <div className="flex items-center gap-1">
          <Tooltip content="Refresh logs">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer active:scale-[0.98]"
              aria-label="Refresh logs"
            >
              <RotateCw
                className={cn(
                  "w-3.5 h-3.5",
                  isLoading && "animate-spin text-[var(--accent)]",
                )}
              />
            </button>
          </Tooltip>

          <Tooltip
            content={copied ? "Copied to clipboard" : "Copy logs to clipboard"}
          >
            <button
              type="button"
              onClick={onCopy}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer active:scale-[0.98]"
              aria-label="Copy logs to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </Tooltip>

          <Tooltip content="Download logs to file">
            <button
              type="button"
              onClick={onDownload}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer active:scale-[0.98]"
              aria-label="Download logs file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>

        <div className="h-4 w-px bg-[var(--border)] mx-0.5" />

        {/* Close Button */}
        <Tooltip content="Close dialog" shortcut="Esc">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-[var(--muted)] transition-colors cursor-pointer"
            aria-label="Close logs dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
