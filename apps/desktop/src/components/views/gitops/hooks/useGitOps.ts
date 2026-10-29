"use client";

import * as React from "react";
import type {
  GitOpsDriftReport,
  GitOpsDriftStatus,
  GitOpsResourceDrift,
  ResourceApplyResult,
  ResourceCapabilities,
} from "@kubeview/contracts";
import { toast } from "sonner";
import { invokeRpc, isTauri } from "@/lib/ipc";
import { useClusterStore } from "@/stores/clusterStore";

const PATH_STORAGE_KEY = "kubeview-gitops-source-path";
const RECENT_STORAGE_KEY = "kubeview-gitops-recent-paths";
const MAX_RECENT_PATHS = 5;

function resourceKey(resource: GitOpsResourceDrift): string {
  return `${resource.apiVersion}/${resource.kind}/${resource.namespace ?? ""}/${resource.name}`;
}

function preferredResource(
  report: GitOpsDriftReport,
): GitOpsResourceDrift | null {
  return (
    report.resources.find((resource) => resource.status === "changed") ??
    report.resources.find((resource) => resource.status === "missing") ??
    report.resources[0] ??
    null
  );
}

function readRecentPaths(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function useGitOps() {
  const currentContext = useClusterStore((state) => state.currentContext);
  const [path, setPath] = React.useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(PATH_STORAGE_KEY) ?? "";
  });
  const [recentPaths, setRecentPaths] =
    React.useState<string[]>(readRecentPaths);
  const [report, setReport] = React.useState<GitOpsDriftReport | null>(null);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const [pendingApply, setPendingApply] = React.useState(false);
  const [capabilities, setCapabilities] =
    React.useState<ResourceCapabilities | null>(null);
  const [capabilityError, setCapabilityError] = React.useState<string | null>(
    null,
  );

  const selected = React.useMemo(() => {
    if (!report || !selectedKey) return null;
    return (
      report.resources.find(
        (resource) => resourceKey(resource) === selectedKey,
      ) ?? null
    );
  }, [report, selectedKey]);

  React.useEffect(() => {
    if (path.trim()) {
      window.localStorage.setItem(PATH_STORAGE_KEY, path.trim());
    }
  }, [path]);

  const rememberPath = React.useCallback((target: string) => {
    const trimmed = target.trim();
    if (!trimmed) return;
    setRecentPaths((current) => {
      const next = [
        trimmed,
        ...current.filter((item) => item !== trimmed),
      ].slice(0, MAX_RECENT_PATHS);
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  React.useEffect(() => {
    setCapabilities(null);
    setCapabilityError(null);
    if (
      !selected ||
      !currentContext ||
      selected.status === "clean" ||
      selected.status === "error"
    ) {
      return;
    }

    let cancelled = false;
    invokeRpc<ResourceCapabilities>("resources.capabilities", {
      contextName: currentContext,
      apiVersion: selected.apiVersion,
      kind: selected.kind,
      resource: selected.resource,
      name: selected.name,
      namespace: selected.namespace || undefined,
    })
      .then((result) => {
        if (!cancelled) setCapabilities(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setCapabilityError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentContext, selected, selectedKey]);

  const scan = React.useCallback(
    async (sourcePath = path) => {
      const target = sourcePath.trim();
      if (!currentContext) {
        setError("No Kubernetes context is selected.");
        return;
      }
      if (!target) {
        setError("Enter a local repository or manifest directory path.");
        return;
      }

      setIsScanning(true);
      setError(null);
      setApplyError(null);
      setPendingApply(false);
      try {
        const result = await invokeRpc<GitOpsDriftReport>("gitops.scan", {
          contextName: currentContext,
          path: target,
        });
        setReport(result);
        const preferred = preferredResource(result);
        setSelectedKey(preferred ? resourceKey(preferred) : null);
        setPath(target);
        rememberPath(target);
        toast.success(
          `Scanned ${result.total} manifest${result.total === 1 ? "" : "s"}`,
        );
      } catch (err) {
        setReport(null);
        setSelectedKey(null);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsScanning(false);
      }
    },
    [currentContext, path, rememberPath],
  );

  const chooseFolder = React.useCallback(async () => {
    if (!isTauri()) {
      toast.info(
        "The native folder picker is available in the desktop app. Enter a path manually in the browser preview.",
      );
      return;
    }

    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Choose a GitOps repository",
      });
      if (typeof selectedPath !== "string" || !selectedPath.trim()) return;
      setPath(selectedPath);
      await scan(selectedPath);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open the folder picker.",
      );
    }
  }, [scan]);

  const useRecentPath = React.useCallback(
    (recentPath: string) => {
      setPath(recentPath);
      setError(null);
      void scan(recentPath);
    },
    [scan],
  );

  React.useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/webview")
      .then(({ getCurrentWebview }) =>
        getCurrentWebview().onDragDropEvent((event) => {
          if (cancelled) return;
          if (event.payload.type === "enter") {
            setIsDragActive(true);
            return;
          }
          if (event.payload.type === "leave") {
            setIsDragActive(false);
            return;
          }
          if (event.payload.type === "drop") {
            setIsDragActive(false);
            const droppedPath = event.payload.paths[0];
            if (droppedPath) {
              setPath(droppedPath);
              void scan(droppedPath);
            }
          }
        }),
      )
      .then((cleanup) => {
        if (cancelled) cleanup();
        else unlisten = cleanup;
      })
      .catch(() => {
        // Drag and drop is optional; the folder picker remains available.
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [scan]);

  const selectResource = (resource: GitOpsResourceDrift) => {
    setSelectedKey(resourceKey(resource));
    setPendingApply(false);
    setApplyError(null);
  };

  const requiredVerb =
    selected?.status === "missing" ? ("create" as const) : ("update" as const);
  const canApply =
    !!selected &&
    (selected.status === "changed" || selected.status === "missing") &&
    (!capabilities || capabilities[requiredVerb] !== false);
  const capabilityReason =
    capabilities?.reasons?.[requiredVerb] ||
    `Your identity is not allowed to ${requiredVerb} this resource.`;

  const apply = async () => {
    if (!selected || !currentContext) return;
    if (!canApply) {
      setApplyError(capabilityReason);
      return;
    }

    setIsApplying(true);
    setApplyError(null);
    try {
      const ref = {
        contextName: currentContext,
        yaml: selected.desiredYaml,
        resource: selected.resource,
        name: selected.name,
        namespace: selected.namespace || undefined,
      };
      await invokeRpc<ResourceApplyResult>("resources.apply", {
        ...ref,
        dryRun: true,
      });
      const result = await invokeRpc<ResourceApplyResult>("resources.apply", {
        ...ref,
        dryRun: false,
      });
      toast.success(
        `${result.kind} ${result.name} ${result.created ? "created" : "updated"}`,
      );
      setPendingApply(false);
      await scan(path);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err));
      toast.error("Failed to apply drift");
    } finally {
      setIsApplying(false);
    }
  };

  return {
    path,
    setPath,
    recentPaths,
    report,
    selected,
    selectedKey,
    isScanning,
    isApplying,
    isDragActive,
    error,
    applyError,
    pendingApply,
    setPendingApply,
    capabilities,
    capabilityError,
    canApply,
    capabilityReason,
    scan,
    chooseFolder,
    useRecentPath,
    selectResource,
    apply,
  };
}

export function gitOpsStatusTone(status: GitOpsDriftStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "clean":
      return {
        label: "In sync",
        className:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      };
    case "changed":
      return {
        label: "Changed",
        className:
          "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      };
    case "missing":
      return {
        label: "Missing",
        className:
          "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
      };
    case "error":
      return {
        label: "Error",
        className:
          "border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
      };
  }
}
