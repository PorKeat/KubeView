"use client";

import * as React from "react";
import { AlertTriangle, RotateCw, ShieldCheck } from "lucide-react";
import type {
  GitOpsResourceDrift,
  ResourceCapabilities,
} from "@kubeview/contracts";
import { diffYamlLines } from "@/lib/yamlDiff";
import { ResourceDiffView } from "@/components/views/inspector/components/ResourceDiffView";
import { gitOpsStatusTone } from "../hooks/useGitOps";

export function GitOpsDiffPanel({
  resource,
  capabilities,
  capabilityError,
  capabilityReason,
  canApply,
  isApplying,
  applyError,
  pendingApply,
  onRequestApply,
  onCancelApply,
  onApply,
}: {
  resource: GitOpsResourceDrift | null;
  capabilities: ResourceCapabilities | null;
  capabilityError: string | null;
  capabilityReason: string;
  canApply: boolean;
  isApplying: boolean;
  applyError: string | null;
  pendingApply: boolean;
  onRequestApply: () => void;
  onCancelApply: () => void;
  onApply: () => void;
}) {
  const diff = React.useMemo(
    () => diffYamlLines(resource?.liveYaml ?? "", resource?.desiredYaml ?? ""),
    [resource?.desiredYaml, resource?.liveYaml],
  );

  if (!resource) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[10px] text-[var(--muted)]">
        Select a drifted resource to inspect the desired and live manifests.
      </div>
    );
  }

  const tone = gitOpsStatusTone(resource.status);

  return (
    <div
      data-testid="gitops-diff-panel"
      className="flex h-full min-h-0 flex-col bg-[var(--surface)]"
    >
      <div className="shrink-0 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-mono text-[11px] font-semibold text-[var(--foreground)]">
              {resource.kind}/{resource.name}
            </h2>
            <p className="truncate font-mono text-[9px] text-[var(--muted)]">
              {resource.apiVersion} · {resource.namespace || "cluster-scoped"} ·{" "}
              {resource.sourceFile}
            </p>
          </div>
          <span
            className={`rounded border px-2 py-0.5 text-[9px] font-medium ${tone.className}`}
          >
            {tone.label}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        {resource.status === "error" && (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-2.5 text-[10px] text-rose-600 dark:text-rose-400">
            {resource.message || "Unable to evaluate this manifest."}
          </div>
        )}

        {applyError && (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-2.5 text-[10px] text-rose-600 dark:text-rose-400">
            {applyError}
          </div>
        )}

        {capabilityError && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[10px] text-amber-700 dark:text-amber-400">
            Capability check unavailable. The API server will still authorize
            the apply. {capabilityError}
          </div>
        )}

        <ResourceDiffView diff={diff} />

        {resource.status !== "clean" && resource.status !== "error" && (
          <div className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
            {pendingApply ? (
              <div
                data-testid="gitops-apply-confirm"
                className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-amber-700 dark:text-amber-400"
              >
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Apply the desired manifest to the live cluster?
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onCancelApply}
                    className="rounded-md border border-[var(--border)] px-2.5 py-1 text-[10px] text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    data-testid="gitops-confirm-apply"
                    onClick={onApply}
                    disabled={isApplying}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                  >
                    {isApplying && (
                      <RotateCw className="h-3 w-3 animate-spin" />
                    )}
                    Confirm apply
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[10px] text-[var(--muted)]">
                  {!capabilities
                    ? "Checking permissions..."
                    : canApply
                      ? "Desired manifest will be validated with a dry-run before apply."
                      : capabilityReason}
                </div>
                <button
                  type="button"
                  data-testid="gitops-apply-desired"
                  onClick={onRequestApply}
                  disabled={!canApply || isApplying}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Apply desired
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
