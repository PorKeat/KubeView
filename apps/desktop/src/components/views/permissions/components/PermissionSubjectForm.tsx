"use client";

import { LoaderCircle, Search, UserRound } from "lucide-react";
import type { PermissionSubject } from "@kubeview/contracts";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { cn } from "@/lib/utils";

const KINDS: Array<{
  value: PermissionSubject["kind"];
  label: string;
}> = [
  { value: "ServiceAccount", label: "Service account" },
  { value: "User", label: "User" },
  { value: "Group", label: "Group" },
];

export function PermissionSubjectForm({
  subject,
  isLoading,
  isIdentityLoading,
  isCurrentIdentity,
  identityError,
  onChange,
  onLoad,
  onUseCurrentIdentity,
}: {
  subject: PermissionSubject;
  isLoading: boolean;
  isIdentityLoading: boolean;
  isCurrentIdentity: boolean;
  identityError?: string | null;
  onChange: (subject: PermissionSubject) => void;
  onLoad: () => void;
  onUseCurrentIdentity: () => void;
}) {
  const isServiceAccount = subject.kind === "ServiceAccount";

  return (
    <section
      data-testid="permission-subject-form"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[var(--foreground)]">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-[var(--accent)]" />
          Subject to inspect
        </div>
        <button
          type="button"
          data-testid="permission-use-current"
          onClick={onUseCurrentIdentity}
          disabled={isIdentityLoading}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1 text-[9px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:cursor-wait disabled:opacity-50"
        >
          {isIdentityLoading ? (
            <LoaderCircle className="h-3 w-3 animate-spin" />
          ) : (
            <UserRound className="h-3 w-3" />
          )}
          {isCurrentIdentity ? "Current identity" : "Use my identity"}
        </button>
      </div>

      {identityError && (
        <p className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 text-[9px] text-amber-700 dark:text-amber-400">
          Current identity unavailable: {identityError}. Using the fallback
          service account.
        </p>
      )}

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1">
          <span className="block font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
            Kind
          </span>
          <CustomSelect<PermissionSubject["kind"]>
            value={subject.kind}
            onChange={(kind) => onChange({ ...subject, kind })}
            options={KINDS.map((kind) => ({
              value: kind.value,
              label: kind.label,
            }))}
            triggerTestId="permission-subject-kind"
            ariaLabel="Subject kind"
            containerClassName="w-full"
            className="w-full rounded-lg bg-[var(--surface)] px-2 py-1.5 text-[11px]"
            dropdownWidth="w-full"
          />
        </label>

        <label className="space-y-1">
          <span className="block font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
            Name
          </span>
          <input
            data-testid="permission-subject-name"
            value={subject.name}
            onChange={(event) =>
              onChange({ ...subject, name: event.target.value })
            }
            placeholder={isServiceAccount ? "default" : "user@example.com"}
            className="w-full rounded-lg border border-[var(--border)] bg-slate-50 px-2 py-1.5 font-mono text-[11px] text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
          />
        </label>

        {isServiceAccount && (
          <label className="space-y-1">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
              Namespace
            </span>
            <input
              data-testid="permission-subject-namespace"
              value={subject.namespace ?? ""}
              onChange={(event) =>
                onChange({ ...subject, namespace: event.target.value })
              }
              placeholder="default"
              className="w-full rounded-lg border border-[var(--border)] bg-slate-50 px-2 py-1.5 font-mono text-[11px] text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
            />
          </label>
        )}

        <label className="space-y-1">
          <span className="block font-mono text-[9px] uppercase tracking-wider text-[var(--muted)]">
            Groups
          </span>
          <input
            data-testid="permission-subject-groups"
            value={(subject.groups ?? []).join(", ")}
            onChange={(event) =>
              onChange({
                ...subject,
                groups: event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
            placeholder="optional, comma separated"
            className="w-full rounded-lg border border-[var(--border)] bg-slate-50 px-2 py-1.5 font-mono text-[11px] text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="permission-load"
          onClick={onLoad}
          disabled={isLoading || !subject.name.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-50"
        >
          <Search className="h-3 w-3" />
          {isLoading ? "Loading permissions..." : "Load permissions"}
        </button>
        <span
          className={cn(
            "text-[9px] font-mono text-[var(--muted)]",
            !isServiceAccount && "hidden sm:inline",
          )}
        >
          Service accounts automatically inherit system groups.
        </span>
      </div>
    </section>
  );
}
