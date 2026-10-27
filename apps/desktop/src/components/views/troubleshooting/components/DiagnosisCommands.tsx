"use client";

import * as React from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { toast } from "sonner";
import type { PodDiagnosisCommand } from "@kubeview/contracts";
import { Tooltip } from "@/components/ui";

export function DiagnosisCommands({
  commands,
}: {
  commands: PodDiagnosisCommand[];
}) {
  const [copied, setCopied] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = (command: PodDiagnosisCommand) => {
    navigator.clipboard.writeText(command.command);
    setCopied(command.command);
    toast.success(`Copied: ${command.label}`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1500);
  };

  return (
    <section
      data-testid="pod-diagnosis-commands"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)]">
        <Terminal className="h-3.5 w-3.5 text-[var(--accent)]" />
        Suggested commands
      </div>
      <div className="mt-2 space-y-1.5">
        {commands.map((command) => (
          <div
            key={command.command}
            className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)]/70 bg-[#1e1e1e] p-1.5 pl-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[8px] uppercase tracking-wider text-slate-400">
                {command.label}
              </div>
              <code className="block truncate font-mono text-[9px] text-slate-200">
                {command.command}
              </code>
            </div>
            <Tooltip content="Copy command">
              <button
                type="button"
                data-testid="pod-diagnosis-command-copy"
                onClick={() => copy(command)}
                aria-label={`Copy ${command.label}`}
                className="shrink-0 rounded-md border border-white/10 p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {copied === command.command ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </Tooltip>
          </div>
        ))}
      </div>
    </section>
  );
}
