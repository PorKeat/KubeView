"use client";

import * as React from "react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";
import { getStreamCredentials, resetStreamCredentials } from "@/lib/ipc";
import { saveTextFile } from "@/lib/saveFile";
import { PodLogsHeader } from "./PodLogsHeader";
import { PodLogsToolbar } from "./PodLogsToolbar";
import { PodLogsConsole } from "./PodLogsConsole";

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
      (p) =>
        p.name === logsModalPod.name && p.namespace === logsModalPod.namespace,
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
              `No previous terminated container found for "${currentContainerName || logsModalPod.name}".`,
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
    ],
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
          logsContainerRef.current.scrollTop =
            logsContainerRef.current.scrollHeight;
        }
      });
    };

    const startStream = async () => {
      setIsLoading(true);
      setLogs(""); // Clear previous snapshot logs for a fresh live stream
      try {
        const { port, token } = await getStreamCredentials();
        if (isCancelled) return;

        const url = new URL(`http://127.0.0.1:${port}/api/stream/logs`);
        url.searchParams.set("token", token);
        url.searchParams.set("namespace", logsModalPod.namespace);
        url.searchParams.set("pod", logsModalPod.name);
        if (selectedContainer || logsModalPod.container) {
          url.searchParams.set(
            "container",
            selectedContainer || logsModalPod.container || "",
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
          resetStreamCredentials();
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
          logsContainerRef.current.scrollTop =
            logsContainerRef.current.scrollHeight;
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

  const handleDownload = async () => {
    const saved = await saveTextFile(logs, {
      defaultPath: `${logsModalPod.name}-${selectedContainer || "logs"}.log`,
      mimeType: "text/plain;charset=utf-8",
      filters: [{ name: "Log file", extensions: ["log", "txt"] }],
    });
    if (saved) toast.success("Log file downloaded");
  };

  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  };

  const handleToggleFollow = () => {
    const next = !isFollowing;
    setIsFollowing(next);
    if (next) {
      scrollToBottom();
      toast.info("Live real-time log stream active (SSE)");
    }
  };

  const handleTogglePrevious = () => {
    const next = !previous;
    setPrevious(next);
    if (next && restartCount === 0) {
      toast.info(
        `Container "${currentContainerName}" has 0 restarts (no previous logs).`,
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in zoom-in-95 duration-150 select-none sm:h-[88vh] sm:rounded-2xl">
        {/* Modal Top Header */}
        <PodLogsHeader
          podName={logsModalPod.name}
          namespace={logsModalPod.namespace}
          containers={containers}
          selectedContainer={selectedContainer}
          onSelectContainer={setSelectedContainer}
          tailLines={tailLines}
          onTailLinesChange={setTailLines}
          isFollowing={isFollowing}
          onToggleFollow={handleToggleFollow}
          showTimestamps={showTimestamps}
          onToggleTimestamps={() => setShowTimestamps(!showTimestamps)}
          previous={previous}
          onTogglePrevious={handleTogglePrevious}
          restartCount={restartCount}
          currentContainerName={currentContainerName}
          isLoading={isLoading}
          copied={copied}
          onRefresh={() => fetchLogs(false)}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onClose={closeLogsModal}
        />

        {/* Secondary Subtoolbar: Search, Gutter & Line Toggles */}
        <PodLogsToolbar
          search={search}
          onSearchChange={setSearch}
          filteredCount={filteredLines.length}
          wrapLines={wrapLines}
          onToggleWrapLines={() => setWrapLines(!wrapLines)}
          showLineNumbers={showLineNumbers}
          onToggleLineNumbers={() => setShowLineNumbers(!showLineNumbers)}
          onScrollToBottom={scrollToBottom}
        />

        {/* Console / Log Stream Canvas */}
        <PodLogsConsole
          containerRef={logsContainerRef}
          isLoading={isLoading}
          logLinesCount={logLines.length}
          filteredLines={filteredLines}
          isPreviousNotFound={isPreviousNotFound}
          previous={previous}
          hasLogs={Boolean(logs)}
          search={search}
          currentContainerName={currentContainerName}
          podName={logsModalPod.name}
          showLineNumbers={showLineNumbers}
          wrapLines={wrapLines}
          onClearSearch={() => setSearch("")}
          onReturnToActive={() => setPrevious(false)}
        />
      </div>
    </div>
  );
}
