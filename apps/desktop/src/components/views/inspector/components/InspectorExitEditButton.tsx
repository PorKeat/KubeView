"use client";

import { X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

export function InspectorExitEditButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip
      content="Exit edit mode (unsaved changes are discarded)"
      side="bottom"
    >
      <button
        type="button"
        data-testid="inspector-yaml-exit-edit"
        onClick={onClick}
        aria-label="Exit edit mode"
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[10px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Exit edit
      </button>
    </Tooltip>
  );
}
