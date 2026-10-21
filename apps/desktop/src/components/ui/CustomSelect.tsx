"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface CustomSelectOption<T extends string | number> {
  value: T;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  dropdownWidth?: string;
}

export function CustomSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  icon,
  className,
  dropdownWidth = "w-48",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative inline-block" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={cn(
          "flex items-center justify-between gap-2 px-2.5 py-1 text-xs font-mono rounded-lg",
          "bg-slate-100/80 dark:bg-black/30 border border-[var(--border)]",
          "hover:bg-[var(--surface-hover)] hover:border-black/20 dark:hover:border-white/20 text-[var(--foreground)]",
          "transition-all cursor-pointer outline-hidden select-none group",
          isOpen && "border-black/20 dark:border-white/20 ring-1 ring-[var(--accent)]/30",
          className
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon}
          {selectedOption?.icon}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 30,
              mass: 0.8,
            }}
            style={{ transformOrigin: "top left" }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute left-0 top-full mt-1.5 p-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl shadow-black/30 dark:shadow-black/70 z-50",
              "outline-hidden select-none backdrop-blur-xl",
              dropdownWidth
            )}
          >
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer outline-hidden transition-colors text-xs font-mono border",
                      isSelected
                        ? "bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10 text-[var(--foreground)] font-semibold shadow-xs"
                        : "border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-[var(--foreground)]"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon}
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <span className="px-1.5 py-0.2 text-[9px] rounded font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
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
