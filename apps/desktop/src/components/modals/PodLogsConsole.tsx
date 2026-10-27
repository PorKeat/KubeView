"use client";

import * as React from "react";
import { RotateCw, RotateCcw, SearchX } from "lucide-react";
import { LogLineRow } from "./PodLogsLogLine";

export interface PodLogsConsoleProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  logLinesCount: number;
  filteredLines: string[];
  isPreviousNotFound: boolean;
  previous: boolean;
  hasLogs: boolean;
  search: string;
  currentContainerName: string;
  podName: string;
  showLineNumbers: boolean;
  wrapLines: boolean;
  onClearSearch: () => void;
  onReturnToActive: () => void;
}

export function PodLogsConsole({
  containerRef,
  isLoading,
  logLinesCount,
  filteredLines,
  isPreviousNotFound,
  previous,
  hasLogs,
  search,
  currentContainerName,
  podName,
  showLineNumbers,
  wrapLines,
  onClearSearch,
  onReturnToActive,
}: PodLogsConsoleProps) {
  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-[#090d16] dark:bg-[#07090e] p-4 font-mono text-[12px] leading-relaxed text-slate-200 select-text"
    >
      {isLoading && logLinesCount === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-400 gap-2 font-mono text-xs">
          <RotateCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
          <span>Fetching log lines from cluster...</span>
        </div>
      ) : isPreviousNotFound || (previous && !hasLogs && !isLoading) ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-sm">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <p className="text-sm font-semibold text-slate-100 font-mono">
              No Previous Terminated Container Found
            </p>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Container{" "}
              <code className="text-amber-400 font-mono text-[11px] bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">
                {currentContainerName || podName}
              </code>{" "}
              has <strong className="text-slate-200">0 restarts</strong> and has
              never terminated. Previous logs are only recorded after a
              container crashes or restarts.
            </p>
          </div>
          <button
            type="button"
            onClick={onReturnToActive}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] border border-[var(--border)] transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs active:scale-[0.98] mt-2"
          >
            <RotateCw className="w-3.5 h-3.5 text-emerald-500" />
            <span>Return to Active Running Logs</span>
          </button>
        </div>
      ) : filteredLines.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
            <SearchX className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-200">
              {search
                ? `No log entries matching "${search}"`
                : "No logs available"}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              {search
                ? "Try adjusting your search query or clear the filter to see all lines."
                : "The container has not emitted any stdout or stderr messages yet."}
            </p>
          </div>
          {search && (
            <button
              type="button"
              onClick={onClearSearch}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors cursor-pointer"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-0.5">
          {filteredLines.map((line, idx) => (
            <LogLineRow
              key={idx}
              line={line}
              lineIdx={idx}
              showLineNumbers={showLineNumbers}
              wrapLines={wrapLines}
            />
          ))}
        </div>
      )}
    </div>
  );
}
