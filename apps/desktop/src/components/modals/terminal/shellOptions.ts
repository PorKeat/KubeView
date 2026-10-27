import type { ShellOption } from "./types";

export const SHELL_OPTIONS: ShellOption[] = [
  {
    value: "auto",
    label: "Auto-detect",
    triggerLabel: "Auto (sh, bash, ash)",
    badge: "Recommended",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    description: "Automatic fallback: sh ➔ bash ➔ ash with binary probe",
  },
  {
    value: "/bin/sh",
    label: "/bin/sh",
    triggerLabel: "/bin/sh",
    badge: "Default",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    description: "Standard POSIX system shell present in most containers",
  },
  {
    value: "/bin/bash",
    label: "/bin/bash",
    triggerLabel: "/bin/bash",
    badge: "Bash",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    description: "GNU Bourne-Again Shell with rich syntax & built-ins",
  },
  {
    value: "/bin/ash",
    label: "/bin/ash",
    triggerLabel: "/bin/ash",
    badge: "Alpine",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    description: "Lightweight Almquist Shell standard for Alpine Linux",
  },
  {
    value: "sh",
    label: "sh",
    triggerLabel: "sh",
    badge: "PATH",
    badgeClass: "bg-white/[0.06] text-slate-400 border-white/[0.08]",
    description: "Lookup 'sh' binary from container system $PATH",
  },
  {
    value: "bash",
    label: "bash",
    triggerLabel: "bash",
    badge: "PATH",
    badgeClass: "bg-white/[0.06] text-slate-400 border-white/[0.08]",
    description: "Lookup 'bash' binary from container system $PATH",
  },
  {
    value: "/bin/zsh",
    label: "/bin/zsh",
    triggerLabel: "/bin/zsh",
    badge: "Zsh",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    description: "Z Shell commonly used in specialized developer images",
  },
];

export function resolveShellOption(shell: string): ShellOption {
  return (
    SHELL_OPTIONS.find((o) => o.value === shell) || {
      value: shell,
      label: shell,
      triggerLabel: shell,
      badge: "Custom",
      badgeClass: "bg-white/[0.06] text-slate-400 border-white/[0.08]",
      description: "Custom shell binary path",
    }
  );
}
