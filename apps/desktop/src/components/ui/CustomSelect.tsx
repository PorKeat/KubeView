"use client";

import * as React from "react";
import { ChevronDown, Check, Search } from "lucide-react";
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
  containerClassName?: string;
  dropdownWidth?: string;
  triggerTestId?: string;
  optionTestId?: (value: T) => string;
  ariaLabel?: string;
  disabled?: boolean;
  searchable?: boolean;
  emptyLabel?: string;
}

export function CustomSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  icon,
  className,
  containerClassName,
  dropdownWidth = "w-48",
  triggerTestId,
  optionTestId,
  ariaLabel,
  disabled = false,
  searchable = false,
  emptyLabel = "No options available",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selectRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    if (searchable) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, searchable]);

  React.useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = query.trim()
    ? options.filter((option) =>
        option.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : options;

  return (
    <div
      className={cn("relative inline-block", containerClassName)}
      ref={selectRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        data-testid={triggerTestId}
        className={cn(
          "flex items-center justify-between gap-2 px-2.5 py-1 text-xs font-mono rounded-lg",
          "bg-slate-100/80 dark:bg-black/30 border border-[var(--border)]",
          "hover:bg-[var(--surface-hover)] hover:border-black/20 dark:hover:border-white/20 text-[var(--foreground)]",
          "transition-all cursor-pointer outline-hidden select-none group",
          isOpen &&
            "border-black/20 dark:border-white/20 ring-1 ring-[var(--accent)]/30",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {icon}
          {selectedOption?.icon}
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-transform duration-200 shrink-0",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
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
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "absolute left-0 top-full mt-1.5 p-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl shadow-black/30 dark:shadow-black/70 z-50",
              "outline-hidden select-none backdrop-blur-xl",
              dropdownWidth,
            )}
          >
            {searchable && (
              <div className="relative mb-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search..."
                  aria-label={`Search ${ariaLabel || "options"}`}
                  className="w-full rounded-md border border-[var(--border)] bg-slate-50 py-1 pl-7 pr-2 text-[10px] font-mono text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
                />
              </div>
            )}
            <div
              className="max-h-60 overflow-y-auto space-y-0.5"
              role="listbox"
              aria-label={ariaLabel}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-2.5 py-2 text-[10px] font-mono text-[var(--muted)]">
                  {emptyLabel}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-testid={optionTestId?.(option.value)}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer outline-hidden transition-colors text-xs font-mono border",
                        isSelected
                          ? "bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10 text-[var(--foreground)] font-semibold shadow-xs"
                          : "border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-[var(--foreground)]",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {option.icon}
                        <span className="truncate">{option.label}</span>
                        {option.badge && (
                          <span className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.2 font-mono text-[9px] text-[var(--muted)] dark:bg-white/5">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
