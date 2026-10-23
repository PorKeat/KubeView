"use client";

import * as React from "react";
import {
  X,
  FileText,
  RotateCw,
  RotateCcw,
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
  SearchX,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Tooltip } from "@/components/ui/Tooltip";
import { getStreamPort } from "@/lib/ipc";

const ERROR_REGEX = /error|fatal|fail|panic|exception/i;
const WARN_REGEX = /warn|alert/i;

interface LogLineProps {
  line: string;
  lineIdx: number;
  showLineNumbers: boolean;
  wrapLines: boolean;
}

const LogLineRow = React.memo(function LogLineRow({
  line,
  lineIdx,
  showLineNumbers,
  wrapLines,
}: LogLineProps) {
  const isError = ERROR_REGEX.test(line);
  const isWarning = !isError && WARN_REGEX.test(line);

  return (
    <div
      className="flex hover:bg-white/[0.04] rounded-xs px-1 group transition-colors"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto 22px",
      }}
    >
      {showLineNumbers && (
        <span className="w-12 text-slate-500/70 select-none text-right pr-3 shrink-0 text-[11px] font-mono border-r border-white/5 mr-2.5">
          {lineIdx + 1}
        </span>
      )}
      <span
        className={cn(
          "flex-1 font-mono",
          wrapLines ? "break-all whitespace-pre-wrap" : "whitespace-pre",
          isError
            ? "text-rose-400"
            : isWarning
            ? "text-amber-300"
            : "text-slate-300"
        )}
      >
        {line}
      </span>
    </div>
  );
});

export function PodLogsModal() {
  const { logsModalPod, closeLogsModal, getPodLogs, pods } = useClusterStore();
  const [logs, setLogs] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedContainer, setSelectedContainer] = React.useState<string>("");
  const [containers, setContainers] = React.useState<string[]>([]);
  const [tailLines, setTailLines] = React.useState<number>(500);
  const [previous, setPrevious] = React.useState(false);
  const [isPreviousNotFound, setIsPreviousNotFound] = React.useState(false);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [wrapLines, setWrapLines] = React.useState(true);
  const [showLineNumbers, setShowLineNumbers] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const logsContainerRef = React.useRef<HTMLDivElement>(null);

  // Fast deferred search to keep typing at 60 FPS
  const deferredSearch = React.useDeferredValue(search);

  // Match pod in store for immediate container resolution & restart statistics
  const podSummary = React.useMemo(() => {
    if (!logsModalPod) return null;
    return pods.find(
      (p) => p.name === logsModalPod.name && p.namespace === logsModalPod.namespace
    );
  }, [logsModalPod, pods]);

  // Immediately resolve container names on modal open
  React.useEffect(() => {
    if (podSummary?.containers && podSummary.containers.length > 0) {
      setContainers(podSummary.containers.map((c) => c.name));
    }
  }, [podSummary]);

  const currentContainerName =
    selectedContainer || logsModalPod?.container || containers[0] || "";

  const activeContainerInfo = React.useMemo(() => {
    return podSummary?.containers?.find((c) => c.name === currentContainerName);
  }, [podSummary, currentContainerName]);

  const restartCount =
    activeContainerInfo?.restartCount ?? podSummary?.restarts ?? 0;

  const fetchLogs = React.useCallback(
    async (isBackground = false) => {
      if (!logsModalPod) return;
      if (!isBackground) setIsLoading(true);

      // Fast check: if previous was toggled on a container with 0 restarts, avoid doomed K8s network call
      if (previous && restartCount === 0) {
        setIsPreviousNotFound(true);
        setLogs("");
        if (!isBackground) setIsLoading(false);
        return;
      }

      try {
        setIsPreviousNotFound(false);
        const res = await getPodLogs({
          namespace: logsModalPod.namespace,
          podName: logsModalPod.name,
          container: selectedContainer || logsModalPod.container,
          tailLines,
          previous,
          timestamps: showTimestamps,
        });

        if (res) {
          if (previous && (!res.logs || res.logs.trim() === "")) {
            setIsPreviousNotFound(true);
            setLogs("");
          } else {
            setIsPreviousNotFound(false);
            setLogs(res.logs || "No logs returned for this container.");
          }
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
          const isTerminatedNotFound =
            previous &&
            (msg.toLowerCase().includes("previous terminated container") ||
              msg.toLowerCase().includes("not found"));

          if (isTerminatedNotFound) {
            setIsPreviousNotFound(true);
            setLogs("");
            toast.info(
              `No previous terminated container found for "${currentContainerName || logsModalPod.name}".`
            );
          } else {
            setLogs(`Error retrieving logs: ${msg}`);
            toast.error(`Failed to fetch logs: ${msg}`);
          }
        }
      } finally {
        if (!isBackground) setIsLoading(false);
      }
    },
    [
      logsModalPod,
      selectedContainer,
      tailLines,
      previous,
      restartCount,
      showTimestamps,
      getPodLogs,
      currentContainerName,
    ]
  );

  React.useEffect(() => {
    if (logsModalPod) {
      setSelectedContainer(logsModalPod.container || "");
      setIsPreviousNotFound(false);
      fetchLogs(false);
    } else {
      setLogs("");
      setContainers([]);
      setIsFollowing(false);
      setIsPreviousNotFound(false);
    }
  }, [logsModalPod]);

  // Re-fetch when container, tail lines, previous flag, or timestamps toggle changes (snapshot mode)
  React.useEffect(() => {
    if (logsModalPod && !isFollowing) {
      fetchLogs(false);
    }
  }, [selectedContainer, tailLines, previous, showTimestamps, isFollowing]);

  // Real-time SSE Log Stream when isFollowing is active (zero polling)
  React.useEffect(() => {
    if (!isFollowing || !logsModalPod) return;

    let es: EventSource | null = null;
    let isCancelled = false;
    let buffer: string[] = [];
    let flushTimer: NodeJS.Timeout | null = null;

    const flushBuffer = () => {
      if (buffer.length === 0) return;
      const chunk = buffer.join("\n");
      buffer = [];
      setLogs((prev) => {
        if (!prev) return chunk;
        const combined = prev + "\n" + chunk;
        const lines = combined.split("\n");
        if (lines.length > tailLines * 1.5) {
          return lines.slice(lines.length - tailLines).join("\n");
        }
        return combined;
      });
      requestAnimationFrame(() => {
        if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
      });
    };

    const startStream = async () => {
      setIsLoading(true);
      setLogs(""); // Clear previous snapshot logs for a fresh live stream
      try {
        const port = await getStreamPort();
        if (isCancelled) return;

        const url = new URL(`http://127.0.0.1:${port}/api/stream/logs`);
        url.searchParams.set("namespace", logsModalPod.namespace);
        url.searchParams.set("pod", logsModalPod.name);
        if (selectedContainer || logsModalPod.container) {
          url.searchParams.set(
            "container",
            selectedContainer || logsModalPod.container || ""
          );
        }
        url.searchParams.set("tailLines", String(tailLines));
        url.searchParams.set("timestamps", showTimestamps ? "true" : "false");
        url.searchParams.set("previous", previous ? "true" : "false");
        url.searchParams.set("follow", "true");

        es = new EventSource(url.toString());

        es.onopen = () => {
          if (!isCancelled) {
            setIsLoading(false);
          }
        };

        es.addEventListener("init", (_e) => {
          if (!isCancelled) {
            setIsLoading(false);
          }
        });

        es.onmessage = (e) => {
          if (isCancelled) return;
          try {
            const line = JSON.parse(e.data);
            buffer.push(line);
          } catch {
            buffer.push(e.data);
          }

          if (!flushTimer) {
            flushTimer = setTimeout(() => {
              flushBuffer();
              flushTimer = null;
            }, 60); // Batch at ~16fps to keep main thread free for low-spec devices
          }
        };

        es.onerror = () => {
          if (flushTimer) clearTimeout(flushTimer);
          flushBuffer();
          if (!isCancelled) {
            setIsLoading(false);
          }
        };
      } catch (err: unknown) {
        console.warn("[PodLogsModal] SSE stream error:", err);
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    startStream();

    return () => {
      isCancelled = true;
      if (flushTimer) clearTimeout(flushTimer);
      if (es) {
        es.close();
      }
    };
  }, [
    isFollowing,
    logsModalPod?.name,
    logsModalPod?.namespace,
    selectedContainer,
    tailLines,
    previous,
    showTimestamps,
  ]);

  // Auto-scroll when logs change if user is following
  React.useEffect(() => {
    if (isFollowing && logsContainerRef.current) {
      requestAnimationFrame(() => {
        if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
      });
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

  // Split lines and memoize
  const logLines = React.useMemo(() => {
    if (!logs) return [];
    return logs.split("\n");
  }, [logs]);

  // Filter lines using deferred search
  const filteredLines = React.useMemo(() => {
    if (!deferredSearch) return logLines;
    const term = deferredSearch.toLowerCase();
    return logLines.filter((line) => line.toLowerCase().includes(term));
  }, [logLines, deferredSearch]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 select-none sm:h-[88vh] sm:rounded-2xl">
        
        {/* Modal Top Header */}
        <div className="min-h-14 border-b border-[var(--border)] px-3 sm:px-5 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between shrink-0 bg-slate-50/80 dark:bg-black/30 gap-2 sm:gap-3">
          {/* Left: Identity */}
          <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0 pr-0 sm:pr-2">
            <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--border)] flex items-center justify-center text-[var(--foreground)] shrink-0 shadow-2xs">
              <FileText className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[var(--foreground)] truncate font-mono tracking-tight">
                  {logsModalPod.name}
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/[0.04] dark:bg-white/[0.06] text-[var(--muted)] border border-[var(--border)]">
                  ns:{logsModalPod.namespace}
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
                onChange={setSelectedContainer}
                options={containers.map((c) => ({ value: c, label: c }))}
                icon={<Layers className="w-3.5 h-3.5 text-[var(--accent)]" />}
                placeholder="Container"
                dropdownWidth="w-36"
              />
            )}

            {/* Tail Lines Selector */}
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

            {/* Stream Modes & Toggles */}
            <div className="flex items-center gap-1.5">
              {/* Follow Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !isFollowing;
                  setIsFollowing(next);
                  if (next) {
                    scrollToBottom();
                    toast.info("Live real-time log stream active (SSE)");
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all cursor-pointer shadow-2xs active:scale-[0.98]",
                  isFollowing
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                )}
                title="Toggle continuous log tailing and streaming"
              >
                <Radio className={cn("w-3.5 h-3.5", isFollowing && "text-emerald-500")} />
                <span>Follow</span>
              </button>

              {/* Timestamps Toggle */}
              <button
                type="button"
                onClick={() => setShowTimestamps(!showTimestamps)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all cursor-pointer shadow-2xs active:scale-[0.98]",
                  showTimestamps
                    ? "bg-[var(--surface-active)] border-[var(--border)] text-[var(--foreground)] font-semibold"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                )}
                title="Toggle RFC3339 timestamps"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Timestamps</span>
              </button>

              {/* Previous Toggle with restart badge */}
              <button
                type="button"
                onClick={() => {
                  const next = !previous;
                  setPrevious(next);
                  if (next && restartCount === 0) {
                    toast.info(
                      `Container "${currentContainerName}" has 0 restarts (no previous logs).`
                    );
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition-all cursor-pointer shadow-2xs active:scale-[0.98]",
                  previous
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
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
                  onClick={() => fetchLogs(false)}
                  disabled={isLoading}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer active:scale-[0.98]"
                  aria-label="Refresh logs"
                >
                  <RotateCw
                    className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-[var(--accent)]")}
                  />
                </button>
              </Tooltip>

              <Tooltip content={copied ? "Copied to clipboard" : "Copy logs to clipboard"}>
                <button
                  type="button"
                  onClick={handleCopy}
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
                  onClick={handleDownload}
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
                onClick={closeLogsModal}
                className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-[var(--muted)] transition-colors cursor-pointer"
                aria-label="Close logs dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Secondary Subtoolbar: Search, Gutter & Line Toggles */}
        <div className="h-10 border-b border-[var(--border)] px-4 sm:px-5 flex items-center justify-between text-xs bg-black/[0.02] dark:bg-black/20 shrink-0 gap-3">
          {/* Left: Search filter input */}
          <div className="relative flex items-center flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search logs (e.g. error, timeout, GET)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-16 py-1 bg-black/[0.03] dark:bg-black/40 border border-[var(--border)] rounded-lg text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--border-strong)] transition-all"
            />
            {search && (
              <div className="absolute right-2 flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  {filteredLines.length}
                </span>
                <Tooltip content="Clear search">
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Right: Display options & jump controls */}
          <div className="flex items-center gap-2 text-[11px] font-mono">
            {/* Wrap Toggle */}
            <button
              type="button"
              onClick={() => setWrapLines(!wrapLines)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer border",
                wrapLines
                  ? "bg-[var(--surface-active)] text-[var(--foreground)] border-[var(--border)] font-medium shadow-2xs"
                  : "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)] border-transparent"
              )}
              title="Toggle line wrapping"
            >
              <WrapText className="w-3 h-3" />
              <span>Wrap</span>
            </button>

            {/* Line Numbers Toggle */}
            <button
              type="button"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer border",
                showLineNumbers
                  ? "bg-[var(--surface-active)] text-[var(--foreground)] border-[var(--border)] font-medium shadow-2xs"
                  : "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)] border-transparent"
              )}
              title="Toggle line numbers"
            >
              <ListOrdered className="w-3 h-3" />
              <span>Line Numbers</span>
            </button>

            {/* Total Lines counter */}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)] hidden sm:inline-block">
              Lines: <strong className="text-[var(--foreground)]">{filteredLines.length}</strong>
              {search && <span> (filtered)</span>}
            </span>

            {/* Jump to bottom */}
            <button
              type="button"
              onClick={scrollToBottom}
              className="px-2 py-0.5 rounded-md text-[11px] font-mono text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.98]"
              title="Scroll to latest line"
            >
              <ArrowDownToLine className="w-3 h-3" />
              <span>Bottom</span>
            </button>
          </div>
        </div>

        {/* Console / Log Stream Canvas */}
        <div
          ref={logsContainerRef}
          className="flex-1 overflow-y-auto bg-[#090d16] dark:bg-[#07090e] p-4 font-mono text-[12px] leading-relaxed text-slate-200 select-text"
        >
          {isLoading && logLines.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 gap-2 font-mono text-xs">
              <RotateCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
              <span>Fetching log lines from cluster...</span>
            </div>
          ) : isPreviousNotFound || (previous && !logs && !isLoading) ? (
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
                    {currentContainerName || logsModalPod.name}
                  </code>{" "}
                  has <strong className="text-slate-200">0 restarts</strong> and has never terminated. Previous logs are only recorded after a container crashes or restarts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrevious(false)}
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
                  {search ? `No log entries matching "${search}"` : "No logs available"}
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
                  onClick={() => setSearch("")}
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
      </div>
    </div>
  );
}
