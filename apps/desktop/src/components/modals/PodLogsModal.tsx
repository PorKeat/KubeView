"use client";

import * as React from "react";
import {
  X,
  FileText,
  RotateCw,
  Copy,
  Download,
  Search,
  Check,
  Layers,
  ArrowDownToLine,
  Clock,
  WrapText,
  ListOrdered,
  Radio,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/CustomSelect";

export function PodLogsModal() {
  const { logsModalPod, closeLogsModal, getPodLogs } = useClusterStore();
  const [logs, setLogs] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedContainer, setSelectedContainer] = React.useState<string>("");
  const [containers, setContainers] = React.useState<string[]>([]);
  const [tailLines, setTailLines] = React.useState<number>(500);
  const [previous, setPrevious] = React.useState(false);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [wrapLines, setWrapLines] = React.useState(true);
  const [showLineNumbers, setShowLineNumbers] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const logsContainerRef = React.useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = React.useRef(true);

  const fetchLogs = React.useCallback(
    async (isBackground = false) => {
      if (!logsModalPod) return;
      if (!isBackground) setIsLoading(true);

      try {
        const res = await getPodLogs({
          namespace: logsModalPod.namespace,
          podName: logsModalPod.name,
          container: selectedContainer || logsModalPod.container,
          tailLines,
          previous,
          timestamps: showTimestamps,
        });

        if (res) {
          setLogs(res.logs || "No logs returned for this container.");
          if (res.containers && res.containers.length > 0) {
            setContainers(res.containers);
            if (!selectedContainer) {
              setSelectedContainer(res.container || res.containers[0]);
            }
          }
        }
      } catch (err: unknown) {
        if (!isBackground) {
          const msg = err instanceof Error ? err.message : String(err);
          setLogs(`Error retrieving logs: ${msg}`);
          toast.error(`Failed to fetch logs: ${msg}`);
        }
      } finally {
        if (!isBackground) setIsLoading(false);
      }
    },
    [logsModalPod, selectedContainer, tailLines, previous, showTimestamps, getPodLogs]
  );

  React.useEffect(() => {
    if (logsModalPod) {
      setSelectedContainer(logsModalPod.container || "");
      fetchLogs(false);
    } else {
      setLogs("");
      setContainers([]);
      setIsFollowing(false);
    }
  }, [logsModalPod]);

  // Re-fetch when container, tail lines, previous flag, or timestamps toggle changes
  React.useEffect(() => {
    if (logsModalPod && selectedContainer) {
      fetchLogs(false);
    }
  }, [selectedContainer, tailLines, previous, showTimestamps]);

  // Live Follow polling interval
  React.useEffect(() => {
    if (!isFollowing || !logsModalPod) return;

    const timer = setInterval(() => {
      fetchLogs(true);
    }, 2000);

    return () => clearInterval(timer);
  }, [isFollowing, logsModalPod, fetchLogs]);

  // Auto-scroll when logs change if user is following
  React.useEffect(() => {
    if (isFollowing && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, isFollowing]);

  // Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && logsModalPod) {
        closeLogsModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [logsModalPod, closeLogsModal]);

  if (!logsModalPod) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    toast.success("Logs copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${logsModalPod.name}-${selectedContainer || "logs"}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Log file downloaded");
  };

  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  };

  // Split lines and filter
  const logLines = logs.split("\n");
  const filteredLines = search
    ? logLines.filter((line) => line.toLowerCase().includes(search.toLowerCase()))
    : logLines;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-6xl h-[88vh] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="h-14 border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-black/30 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20 shadow-xs shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--foreground)] truncate font-mono">
                  {logsModalPod.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/[0.05] dark:bg-white/[0.08] text-[var(--muted)] border border-[var(--border)]">
                  ns: {logsModalPod.namespace}
                </span>
                {isFollowing && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold font-mono bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">
                Real-time container stdout/stderr log stream
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Container Selector */}
            {containers.length > 1 && (
              <CustomSelect
                value={selectedContainer}
                onChange={setSelectedContainer}
                options={containers.map((c) => ({ value: c, label: c }))}
                icon={<Layers className="w-3.5 h-3.5 text-[#F08A42]" />}
                placeholder="Container"
              />
            )}

            {/* Tail Lines */}
            <CustomSelect
              value={tailLines}
              onChange={setTailLines}
              options={[
                { value: 100, label: "100 lines" },
                { value: 500, label: "500 lines" },
                { value: 1000, label: "1,000 lines" },
                { value: 5000, label: "5,000 lines" },
              ]}
              dropdownWidth="w-32"
            />

            {/* Live Follow Toggle */}
            <button
              onClick={() => {
                const next = !isFollowing;
                setIsFollowing(next);
                if (next) {
                  scrollToBottom();
                  toast.info("Live log streaming enabled (auto-refreshing)");
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer shadow-2xs",
                isFollowing
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              )}
              title="Toggle continuous log tailing and streaming"
            >
              <Radio className={cn("w-3.5 h-3.5", isFollowing && "text-emerald-500 animate-pulse")} />
              <span>Follow</span>
            </button>

            {/* Timestamps Toggle */}
            <button
              onClick={() => setShowTimestamps(!showTimestamps)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer",
                showTimestamps
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)] font-semibold"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              )}
              title="Toggle Kubernetes RFC3339 timestamps"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timestamps</span>
            </button>

            {/* Previous flag */}
            <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[var(--border)] text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={previous}
                onChange={(e) => setPrevious(e.target.checked)}
                className="rounded accent-[var(--accent)]"
              />
              <span>Previous</span>
            </label>

            {/* Refresh */}
            <button
              onClick={() => fetchLogs(false)}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="Refresh Logs"
            >
              <RotateCw className={cn("w-4 h-4", isLoading && "animate-spin text-[var(--accent)]")} />
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="Copy All Logs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              title="Download Logs as File"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={closeLogsModal}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-[var(--muted)] transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar & display controls */}
        <div className="h-10 border-b border-[var(--border)] px-4 flex items-center justify-between text-xs bg-black/[0.02] dark:bg-black/20 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search / filter logs (e.g. error, timeout, GET)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-hidden font-mono"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] font-mono">
            {/* Wrap toggle */}
            <button
              onClick={() => setWrapLines(!wrapLines)}
              className={cn(
                "flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer",
                wrapLines && "text-[var(--accent)] font-semibold"
              )}
              title="Toggle line wrapping"
            >
              <WrapText className="w-3 h-3" />
              <span>Wrap</span>
            </button>

            {/* Line numbers toggle */}
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={cn(
                "flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer",
                showLineNumbers && "text-[var(--accent)] font-semibold"
              )}
              title="Toggle line numbers"
            >
              <ListOrdered className="w-3 h-3" />
              <span>Line Numbers</span>
            </button>

            <span>
              Lines: <strong className="text-[var(--foreground)]">{filteredLines.length}</strong>
              {search && <span> (filtered from {logLines.length})</span>}
            </span>

            <button
              onClick={scrollToBottom}
              className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors cursor-pointer ml-1"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Bottom</span>
            </button>
          </div>
        </div>

        {/* Log Stream Body */}
        <div
          ref={logsContainerRef}
          className="flex-1 overflow-y-auto bg-slate-950 p-4 font-mono text-[12px] leading-relaxed text-slate-200 select-text"
        >
          {isLoading && logLines.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 gap-2">
              <RotateCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
              <span>Streaming log lines from cluster...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              No matching log entries found.
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredLines.map((line, idx) => {
                const isError = /error|fatal|fail|panic|exception/i.test(line);
                const isWarning = /warn|alert/i.test(line);

                return (
                  <div key={idx} className="flex hover:bg-white/[0.05] rounded px-1 group">
                    {showLineNumbers && (
                      <span className="w-12 text-slate-600 select-none text-right pr-3 shrink-0 text-[11px]">
                        {idx + 1}
                      </span>
                    )}
                    <span
                      className={cn(
                        "flex-1",
                        wrapLines ? "break-all whitespace-pre-wrap" : "whitespace-pre",
                        isError ? "text-rose-400" : isWarning ? "text-amber-300" : "text-slate-300"
                      )}
                    >
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
