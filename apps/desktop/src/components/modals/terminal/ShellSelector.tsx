"use client";

import * as React from "react";
import { Check, ChevronDown, Terminal as TerminalIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { SHELL_OPTIONS, resolveShellOption } from "./shellOptions";

export function ShellSelector({
  shell,
  onShellChange,
  onFocusTerminal,
}: {
  shell: string;
  onShellChange?: (shell: string) => void;
  onFocusTerminal: () => void;
}) {
  const [isShellOpen, setIsShellOpen] = React.useState(false);
  const shellMenuRef = React.useRef<HTMLDivElement>(null);
  const [focusedShellIndex, setFocusedShellIndex] = React.useState<number>(-1);
  const activeShellOption = resolveShellOption(shell);

  // Close dropdown on outside click or Escape
  React.useEffect(() => {
    if (!isShellOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        shellMenuRef.current &&
        !shellMenuRef.current.contains(e.target as Node)
      ) {
        setIsShellOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        setIsShellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isShellOpen]);

  const selectShell = (value: string) => {
    onShellChange?.(value);
    setIsShellOpen(false);
    setTimeout(onFocusTerminal, 50);
  };

  return (
    <div className="relative" ref={shellMenuRef}>
      {/* Custom Aesthetic Trigger Button */}
      <button
        type="button"
        data-testid="shell-selector-trigger"
        aria-expanded={isShellOpen}
        aria-haspopup="listbox"
        aria-label="Select container shell environment"
        onClick={() => {
          setIsShellOpen((prev) => !prev);
          const currentIdx = SHELL_OPTIONS.findIndex((o) => o.value === shell);
          setFocusedShellIndex(currentIdx >= 0 ? currentIdx : 0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!isShellOpen) {
              setIsShellOpen(true);
              const currentIdx = SHELL_OPTIONS.findIndex(
                (o) => o.value === shell,
              );
              setFocusedShellIndex(currentIdx >= 0 ? currentIdx : 0);
            }
          }
        }}
        className={cn(
          "h-6 px-2 text-[11px] font-mono rounded-md border flex items-center gap-1.5 transition-all cursor-pointer select-none outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--accent)]",
          isShellOpen
            ? "bg-white/[0.1] border-white/20 text-white shadow-xs"
            : "bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.1] border-white/[0.08] text-slate-300 hover:text-white",
        )}
      >
        <TerminalIcon className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="font-medium">{activeShellOption.triggerLabel}</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0",
            isShellOpen && "rotate-180 text-white",
          )}
        />
      </button>

      {/* Glassy Popover Dropdown (Compact IDE Style) */}
      <AnimatePresence>
        {isShellOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -2 }}
            transition={{ duration: 0.12 }}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg bg-[#0c0f17]/95 border border-white/[0.12] shadow-xl shadow-black/80 backdrop-blur-md p-1 overflow-hidden font-mono select-none"
            role="listbox"
            aria-label="Shell Environments"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocusedShellIndex(
                  (prev) => (prev + 1) % SHELL_OPTIONS.length,
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocusedShellIndex(
                  (prev) =>
                    (prev - 1 + SHELL_OPTIONS.length) % SHELL_OPTIONS.length,
                );
              } else if (e.key === "Enter" && focusedShellIndex >= 0) {
                e.preventDefault();
                const target = SHELL_OPTIONS[focusedShellIndex];
                if (target) {
                  selectShell(target.value);
                }
              }
            }}
          >
            {/* Header Strip */}
            <div className="flex items-center justify-between px-2 py-1 mb-0.5 border-b border-white/[0.06] text-[9px]">
              <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <TerminalIcon className="w-2.5 h-2.5 text-[var(--accent)]" />{" "}
                Shell
              </span>
              <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-white/[0.06] text-slate-400">
                {SHELL_OPTIONS.length}
              </span>
            </div>

            {/* Shell Options List - Compact Single-Line rows */}
            <div className="space-y-0.5">
              {SHELL_OPTIONS.map((opt, idx) => {
                const isSelected = opt.value === shell;
                const isFocused = idx === focusedShellIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-testid={`shell-option-${opt.value}`}
                    onMouseEnter={() => setFocusedShellIndex(idx)}
                    onClick={() => selectShell(opt.value)}
                    className={cn(
                      "w-full text-left flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md transition-colors text-xs cursor-pointer select-none group border outline-hidden",
                      isSelected
                        ? "bg-white/[0.1] border-white/15 text-white"
                        : isFocused
                          ? "bg-white/[0.05] border-white/10 text-slate-200"
                          : "border-transparent hover:bg-white/[0.04] text-slate-300 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <TerminalIcon
                        className={cn(
                          "w-3 h-3 shrink-0",
                          isSelected
                            ? "text-[var(--accent)]"
                            : "text-slate-500 group-hover:text-slate-400",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[11px] font-mono truncate",
                          isSelected
                            ? "text-white font-medium"
                            : "text-slate-300",
                        )}
                      >
                        {opt.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "px-1 py-0.2 rounded text-[9px] font-mono border",
                          opt.badgeClass,
                        )}
                      >
                        {opt.badge}
                      </span>
                      {isSelected ? (
                        <Check className="w-3 h-3 text-[var(--accent)] shrink-0" />
                      ) : (
                        <span className="w-3 h-3" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
