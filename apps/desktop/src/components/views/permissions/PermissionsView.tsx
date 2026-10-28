"use client";

import { ShieldCheck } from "lucide-react";
import { ErrorBanner, StatusBeacon } from "@/components/ui";
import { useClusterStore } from "@/stores/clusterStore";
import { usePermissionExplainerStore } from "@/stores/permissionExplainerStore";
import { usePermissionChecker } from "./hooks/usePermissionChecker";
import { PermissionCheckForm } from "./components/PermissionCheckForm";
import { PermissionDecisionPanel } from "./components/PermissionDecisionPanel";
import { PermissionEffectivePanel } from "./components/PermissionEffectivePanel";
import { PermissionSubjectForm } from "./components/PermissionSubjectForm";

export function PermissionsView() {
  const currentContext = useClusterStore((state) => state.currentContext);
  const pendingOperation = usePermissionExplainerStore(
    (state) => state.pendingOperation,
  );
  const {
    subject,
    effective,
    decision,
    isLoading,
    isIdentityLoading,
    isChecking,
    loadError,
    identityError,
    checkError,
    isCurrentIdentity,
    updateSubject,
    load,
    loadCurrentIdentity,
    check,
  } = usePermissionChecker();

  return (
    <div
      data-testid="permissions-view"
      className="flex h-full min-h-0 flex-col overflow-hidden"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[var(--foreground)]">
              Permissions Checker
            </h1>
            <p className="truncate text-[10px] text-[var(--muted)]">
              Inspect effective RBAC and explain allowed or denied operations on{" "}
              {currentContext || "the current cluster"}.
            </p>
          </div>
        </div>
        <StatusBeacon
          size="xs"
          variant={currentContext ? "active" : "offline"}
          label={currentContext || "no context"}
        />
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <PermissionSubjectForm
          subject={subject}
          isLoading={isLoading}
          isIdentityLoading={isIdentityLoading}
          isCurrentIdentity={isCurrentIdentity}
          identityError={identityError}
          onChange={updateSubject}
          onLoad={load}
          onUseCurrentIdentity={() => void loadCurrentIdentity()}
        />

        {pendingOperation && (
          <div
            data-testid="permission-prefilled"
            className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-[10px] text-sky-700 dark:text-sky-300"
          >
            Prefilled from a denied request. Review the operation and run the
            check against the current identity.
          </div>
        )}

        {loadError && (
          <div className="overflow-hidden rounded-lg border border-rose-500/20">
            <ErrorBanner message={loadError} />
          </div>
        )}

        {isLoading && !effective && (
          <div
            data-testid="permission-loading"
            className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
          >
            <div className="h-3 w-40 animate-pulse rounded bg-[var(--surface-hover)]" />
            <div className="h-6 w-full animate-pulse rounded bg-[var(--surface-hover)]/70" />
            <div className="h-20 w-full animate-pulse rounded bg-[var(--surface-hover)]/50" />
          </div>
        )}

        {effective && <PermissionEffectivePanel result={effective} />}

        {!effective && !isLoading && !loadError && (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center">
            <p className="text-[11px] font-medium text-[var(--foreground)]">
              No permission snapshot yet
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Choose a user, group, or service account and load its effective
              access.
            </p>
          </div>
        )}

        <PermissionCheckForm
          defaultNamespace={
            subject.kind === "ServiceAccount"
              ? subject.namespace || "default"
              : "default"
          }
          initialOperation={pendingOperation ?? undefined}
          isChecking={isChecking}
          onCheck={check}
        />

        {checkError && (
          <div className="overflow-hidden rounded-lg border border-rose-500/20">
            <ErrorBanner message={checkError} />
          </div>
        )}

        {isChecking && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
              Evaluating RBAC rules and cluster access...
            </div>
          </div>
        )}

        {decision && <PermissionDecisionPanel decision={decision} />}
      </div>
    </div>
  );
}
