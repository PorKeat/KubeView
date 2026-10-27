"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Server, X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

export function KubeconfigModalHeader() {
  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-[var(--border)] select-none">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-[#F08A42]/15 border border-[#F08A42]/30 flex items-center justify-center text-[#F08A42] shrink-0 shadow-[0_0_15px_rgba(240,138,66,0.15)]">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <Dialog.Title className="text-sm sm:text-base font-bold text-[var(--foreground)] tracking-tight">
            Kubeconfig & Cluster Management
          </Dialog.Title>
          <Dialog.Description className="hidden sm:block text-xs text-[var(--muted)] mt-0.5">
            Scan system directories (~/.kube), import files, select folders, or
            paste YAML configurations
          </Dialog.Description>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-block px-2.5 py-1 text-[11px] font-mono text-[var(--muted)] rounded-lg border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02]">
          Esc to close
        </span>
        <Tooltip content="Close dialog" shortcut="Esc">
          <Dialog.Close asChild>
            <button
              className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
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
