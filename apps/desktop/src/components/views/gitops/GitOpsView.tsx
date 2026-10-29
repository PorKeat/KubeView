"use client";

import { GitBranch } from "lucide-react";
import { ErrorBanner, StatusBeacon } from "@/components/ui";
import { useClusterStore } from "@/stores/clusterStore";
import { GitOpsSourceForm } from "./components/GitOpsSourceForm";
import { GitOpsSummary } from "./components/GitOpsSummary";
import { GitOpsResourceTable } from "./components/GitOpsResourceTable";
import { GitOpsDiffPanel } from "./components/GitOpsDiffPanel";
import { useGitOps } from "./hooks/useGitOps";

export function GitOpsView() {
  const currentContext = useClusterStore((state) => state.currentContext);
  const {
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
  } = useGitOps();

  return (
    <div
      data-testid="gitops-view"
      className="flex h-full min-h-0 flex-col overflow-hidden"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10">
            <GitBranch className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[var(--foreground)]">
              GitOps Drift
            </h1>
            <p className="truncate text-[10px] text-[var(--muted)]">
              Compare a local manifest directory with the live cluster on{" "}
              {currentContext || "the current context"}.
            </p>
          </div>
        </div>
        <StatusBeacon
          size="xs"
          variant={currentContext ? "active" : "offline"}
          label={currentContext || "no context"}
        />
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 lg:max-w-[58%]">
          <GitOpsSourceForm
            path={path}
            recentPaths={recentPaths}
            isScanning={isScanning}
            isDragActive={isDragActive}
            onChange={setPath}
            onScan={() => void scan()}
            onChooseFolder={() => void chooseFolder()}
            onUseRecentPath={useRecentPath}
          />

          {error && (
            <div className="overflow-hidden rounded-lg border border-rose-500/20">
              <ErrorBanner message={error} />
            </div>
          )}

          {report ? (
            <>
              <GitOpsSummary report={report} />
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] text-[var(--muted)]">
                <span className="truncate">
                  {report.path} · {report.total} manifests
                </span>
                <span>{new Date(report.scannedAt).toLocaleTimeString()}</span>
              </div>
              <GitOpsResourceTable
                resources={report.resources}
                selectedKey={selectedKey}
                onSelect={selectResource}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center">
              <GitBranch className="mx-auto h-5 w-5 text-[var(--muted)]" />
              <p className="mt-2 text-[11px] font-medium text-[var(--foreground)]">
                No drift report yet
              </p>
              <p className="mt-1 text-[10px] text-[var(--muted)]">
                Enter a repository path and scan. KubeView reads raw YAML
                locally and never uploads it.
              </p>
            </div>
          )}
        </div>

        <aside className="min-h-[380px] shrink-0 border-t border-[var(--border)] lg:w-[42%] lg:border-l lg:border-t-0">
          <GitOpsDiffPanel
            resource={selected}
            capabilities={capabilities}
            capabilityError={capabilityError}
            capabilityReason={capabilityReason}
            canApply={canApply}
            isApplying={isApplying}
            applyError={applyError}
            pendingApply={pendingApply}
            onRequestApply={() => setPendingApply(true)}
            onCancelApply={() => setPendingApply(false)}
            onApply={() => void apply()}
          />
        </aside>
      </div>
    </div>
  );
}
