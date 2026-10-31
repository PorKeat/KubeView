"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Server, X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

export function KubeconfigModalHeader() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 select-none sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
          <Server className="w-4 h-4" aria-hidden="true" />
        </span>
        <div>
          <Dialog.Title className="text-sm font-semibold text-[var(--foreground)]">
            Kubeconfig &amp; Cluster Management
          </Dialog.Title>
          <Dialog.Description className="hidden text-[11px] text-[var(--muted)] mt-0.5 sm:block">
            Scan system directories (~/.kube), import files, select folders, or
            paste YAML configurations
          </Dialog.Description>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <kbd className="hidden rounded border border-[var(--border)] bg-black/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)] sm:inline-block dark:bg-white/[0.04]">
          Esc
        </kbd>
        <Tooltip content="Close dialog" shortcut="Esc">
          <Dialog.Close asChild>
            <button
              className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </Dialog.Close>
        </Tooltip>
      </div>
    </div>
  );
}
