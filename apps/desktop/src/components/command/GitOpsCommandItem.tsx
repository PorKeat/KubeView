"use client";

import { Command } from "cmdk";
import { GitBranch } from "lucide-react";

export function GitOpsCommandItem({ onSelect }: { onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      value="GitOps Drift repository manifests diff"
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition-colors"
    >
      <GitBranch className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
      <span>GitOps Drift</span>
    </Command.Item>
  );
}
