"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Layers, ChevronDown, Check, Search, Filter } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NamespaceSelectorDropdown() {
  const { currentNamespace, availableNamespaces, setCurrentNamespace } = useClusterStore();
  const [search, setSearch] = React.useState("");

  const filteredNamespaces = availableNamespaces.filter((ns) =>
    ns.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[var(--accent)] transition-all text-[var(--foreground)] outline-hidden group select-none"
          title="Filter by Namespace"
        >
          <Layers className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider">ns:</span>
          <span className="font-semibold max-w-[110px] truncate">{currentNamespace}</span>
          <ChevronDown className="w-3 h-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-transform duration-150" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="w-64 p-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 outline-hidden select-none"
        >
          {/* Search Header */}
          <div className="p-2 border-b border-[var(--border)] mb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[var(--foreground)] uppercase tracking-wider">
                Namespaces
              </span>
              <span className="text-[10px] text-[var(--muted)] font-mono">
                {availableNamespaces.length} available
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter namespaces..."
                className="w-full pl-7 pr-2.5 py-1 text-xs bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filteredNamespaces.map((ns) => {
              const isSelected = ns === currentNamespace;

              return (
                <DropdownMenu.Item
                  key={ns}
                  onSelect={() => {
                    setCurrentNamespace(ns);
                    toast.info(`Namespace switched to: ${ns}`);
                  }}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer outline-hidden transition-colors text-xs font-mono",
                    isSelected
                      ? "bg-[var(--surface-active)] text-[var(--accent)] font-semibold"
                      : "hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                  )}
                >
                  <span className="truncate">{ns === "all" ? "★ All Namespaces" : ns}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
                </DropdownMenu.Item>
              );
            })}

            {filteredNamespaces.length === 0 && (
              <div className="py-3 text-center text-xs text-[var(--muted)]">
                No namespaces matching &quot;{search}&quot;
              </div>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
