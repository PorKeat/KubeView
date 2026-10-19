"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
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
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between gap-2 px-2.5 py-1 text-xs font-mono rounded-lg",
            "bg-slate-100/80 dark:bg-black/30 border border-[var(--border)]",
            "hover:bg-[var(--surface-hover)] hover:border-[var(--accent)] text-[var(--foreground)]",
            "transition-all cursor-pointer outline-hidden select-none group",
            className
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            {icon}
            {selectedOption?.icon}
            <span className="truncate">{selectedOption?.label || placeholder}</span>
          </div>
          <ChevronDown className="w-3 h-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-transform duration-150 shrink-0" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className={cn(
            "p-1.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-2xl z-50",
            "animate-in fade-in zoom-in-95 duration-100 outline-hidden select-none backdrop-blur-xl",
            dropdownWidth
          )}
        >
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <DropdownMenu.Item
                  key={String(opt.value)}
                  onSelect={() => onChange(opt.value)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer outline-hidden transition-colors text-xs font-mono",
                    isSelected
                      ? "bg-[#F08A42]/10 text-[#F08A42] font-semibold"
                      : "hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                    {opt.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] rounded font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#F08A42] shrink-0" />}
                </DropdownMenu.Item>
              );
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
