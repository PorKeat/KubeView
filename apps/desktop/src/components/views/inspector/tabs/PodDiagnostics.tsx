"use client";

import * as React from "react";
import { AlertTriangle, Clock, FileText } from "lucide-react";
import type {
  PodIssueInfo,
  PodPendingInfo,
} from "@/components/views/resources/lib/podIssues";
import type { SelectedResource } from "@/stores/clusterStore";

type OpenLogsModal = (pod: {
  name: string;
  namespace: string;
  container?: string;
}) => void;

function ViewLogsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
      title="Inspect container stdout/stderr logs"
    >
      <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
      <span>View Logs</span>
    </button>
  );
}

function PodIssueCard({
  currentResource,
  issueInfo,
  onOpenLogsModal,
}: {
  currentResource: SelectedResource;
  issueInfo: PodIssueInfo;
  onOpenLogsModal?: OpenLogsModal;
}) {
  return (
    <div className="p-4 rounded-2xl bg-rose-500/[0.04] dark:bg-rose-500/[0.06] border border-rose-500/30 dark:border-rose-500/25 space-y-3 shadow-xs text-left font-sans animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {issueInfo.title}
          </span>
          {issueInfo.containerName && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-black/5 dark:bg-white/10 text-[var(--foreground)] border border-[var(--border)] font-mono">
              container:{" "}
              <strong className="text-[var(--accent)]">
                {issueInfo.containerName}
              </strong>
            </span>
          )}
          {issueInfo.exitCode !== undefined && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-mono font-bold">
              Exit Code {issueInfo.exitCode}
            </span>
          )}
        </div>

        {onOpenLogsModal && (
          <ViewLogsButton
            onClick={() =>
              onOpenLogsModal({
                name: currentResource.name,
                namespace: currentResource.namespace,
                container: issueInfo.containerName,
              })
            }
          />
        )}
      </div>

      {/* Root Cause Diagnostics */}
      <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-black/25 border border-[var(--border)]/70">
        <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted)] block mb-1">
          Root Cause Diagnostics
        </span>
        <p className="text-xs text-[var(--foreground)] leading-relaxed font-mono">
          {issueInfo.rootCause}
        </p>
      </div>

      {/* Actionable Fix Guidance */}
      <div className="flex items-start gap-2 text-[11px] text-[var(--foreground)] bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 p-2.5 rounded-xl">
        <span className="px-1.5 py-0.5 rounded font-bold text-[9px] uppercase bg-rose-500 text-white shrink-0 mt-0.5">
          Fix
        </span>
        <span className="leading-relaxed font-sans">
          {issueInfo.actionableTip}
        </span>
      </div>
    </div>
  );
}

function PodPendingCard({
  currentResource,
  pendingInfo,
  onOpenLogsModal,
}: {
  currentResource: SelectedResource;
  pendingInfo: PodPendingInfo;
  onOpenLogsModal?: OpenLogsModal;
}) {
  return (
    <div className="p-4 rounded-2xl bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border border-amber-500/30 dark:border-amber-500/25 space-y-3 shadow-xs text-left font-sans animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 shrink-0" />
            {pendingInfo.title}
          </span>
          {pendingInfo.containerName && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-black/5 dark:bg-white/10 text-[var(--foreground)] border border-[var(--border)] font-mono">
              container:{" "}
              <strong className="text-[var(--accent)]">
                {pendingInfo.containerName}
              </strong>
            </span>
          )}
        </div>

        {pendingInfo.canViewLogs && onOpenLogsModal && (
          <ViewLogsButton
            onClick={() =>
              onOpenLogsModal({
                name: currentResource.name,
                namespace: currentResource.namespace,
                container: pendingInfo.containerName,
              })
            }
          />
        )}
      </div>

      {/* Root Cause Diagnostics */}
      <div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-black/25 border border-[var(--border)]/70">
        <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted)] block mb-1">
          Root Cause Diagnostics
        </span>
        <p className="text-xs text-[var(--foreground)] leading-relaxed font-mono">
          {pendingInfo.rootCause}
        </p>
      </div>

      {/* Actionable Fix Guidance */}
      <div className="flex items-start gap-2 text-[11px] text-[var(--foreground)] bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 p-2.5 rounded-xl">
        <span className="px-1.5 py-0.5 rounded font-bold text-[9px] uppercase bg-amber-500 text-white shrink-0 mt-0.5">
          Info
        </span>
        <span className="leading-relaxed font-sans">
          {pendingInfo.actionableTip}
        </span>
      </div>
    </div>
  );
}

export function PodDiagnostics({
  currentResource,
  issueInfo,
  pendingInfo,
  onOpenLogsModal,
}: {
  currentResource: SelectedResource;
  issueInfo: PodIssueInfo | null;
  pendingInfo: PodPendingInfo | null;
  onOpenLogsModal?: OpenLogsModal;
}) {
  return (
    <>
      {issueInfo && (
        <PodIssueCard
          currentResource={currentResource}
          issueInfo={issueInfo}
          onOpenLogsModal={onOpenLogsModal}
        />
      )}

      {!issueInfo && pendingInfo && (
        <PodPendingCard
          currentResource={currentResource}
          pendingInfo={pendingInfo}
          onOpenLogsModal={onOpenLogsModal}
        />
      )}
    </>
  );
}
