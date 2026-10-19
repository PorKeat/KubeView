"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Layers, ChevronDown, Check, Search, X, Sparkles, Filter, Globe } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NamespaceSelectorDropdownProps {
  variant?: "header" | "toolbar";
  className?: string;
}

export function NamespaceSelectorDropdown({
  variant = "header",
  className,
}: NamespaceSelectorDropdownProps) {
  const { currentNamespace, availableNamespaces, setCurrentNamespace } = useClusterStore();
  const [search, setSearch] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState<"all" | "workloads" | "system">("all");
  const [isOpen, setIsOpen] = React.useState(false);

  const isSystemNamespace = (ns: string) => {
    if (ns === "all") return false;
    const lower = ns.toLowerCase();
    return (
      lower.startsWith("kube-") ||
      lower.endsWith("-system") ||
      lower.includes("cilium") ||
      lower.includes("longhorn") ||
      lower.includes("metallb") ||
      lower.includes("traefik") ||
      lower.includes("velero") ||
      lower.includes("vault") ||
      lower.includes("cert-manager")
    );
  };

  const filteredNamespaces = React.useMemo(() => {
    return availableNamespaces.filter((ns) => {
      // Category filter
      if (filterCategory === "workloads" && ns !== "all" && isSystemNamespace(ns)) {
        return false;
      }
      if (filterCategory === "system" && !isSystemNamespace(ns)) {
        return false;
      }
      // Text search
      if (!search.trim()) return true;
      return ns.toLowerCase().includes(search.toLowerCase());
    });
  }, [availableNamespaces, search, filterCategory]);

  const workloadCount = React.useMemo(
    () => availableNamespaces.filter((ns) => ns !== "all" && !isSystemNamespace(ns)).length,
    [availableNamespaces]
  );

  const systemCount = React.useMemo(
    () => availableNamespaces.filter((ns) => isSystemNamespace(ns)).length,
    [availableNamespaces]
  );

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 text-xs font-mono transition-all outline-hidden select-none group cursor-pointer",
            variant === "header" &&
              "px-2.5 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-[#F08A42] text-[var(--foreground)] shadow-xs",
            variant === "toolbar" &&
              "px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-black/40 border border-[var(--border)] hover:border-[#F08A42] text-[var(--foreground)] shrink-0",
            isOpen && "border-[#F08A42] ring-1 ring-[#F08A42]/30",
            className
          )}
          title={`Filter by Namespace (Current: ${currentNamespace})`}
        >
          <Layers className="w-3.5 h-3.5 text-[#F08A42] shrink-0" />
          <span className="text-[10px] text-[var(--muted)] uppercase font-semibold tracking-wider">
            ns:
          </span>
          <span className="font-bold max-w-[120px] truncate text-[var(--foreground)]">
            {currentNamespace === "all" ? "All Namespaces" : currentNamespace}
          </span>
          <ChevronDown
            className={cn(
              "w-3 h-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-transform duration-150 shrink-0",
              isOpen && "rotate-180 text-[#F08A42]"
            )}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="w-72 p-2 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 outline-hidden select-none backdrop-blur-xl"
        >
          {/* Header & Title */}
          <div className="px-2 pt-1 pb-2 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#F08A42]" />
                <span>Namespaces</span>
              </span>
              <span className="text-[10px] text-[var(--muted)] font-mono">
                {availableNamespaces.length} available
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search namespace..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[#F08A42] font-mono transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 mt-2 pt-1">
              <button
                type="button"
                onClick={() => setFilterCategory("all")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer font-mono",
                  filterCategory === "all"
                    ? "bg-[#F08A42] text-white font-semibold shadow-xs"
                    : "bg-black/5 dark:bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                All ({availableNamespaces.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory("workloads")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer font-mono",
                  filterCategory === "workloads"
                    ? "bg-[#F08A42] text-white font-semibold shadow-xs"
                    : "bg-black/5 dark:bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                Apps ({workloadCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory("system")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer font-mono",
                  filterCategory === "system"
                    ? "bg-[#F08A42] text-white font-semibold shadow-xs"
                    : "bg-black/5 dark:bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                System ({systemCount})
              </button>
            </div>
          </div>

          {/* Namespaces List */}
          <div className="max-h-60 overflow-y-auto p-1 space-y-0.5 mt-1">
            {filteredNamespaces.map((ns) => {
              const isSelected = ns === currentNamespace;
              const isSystem = isSystemNamespace(ns);
              const isAll = ns === "all";

              return (
                <DropdownMenu.Item
                  key={ns}
                  onSelect={() => {
                    setCurrentNamespace(ns);
                    toast.info(`Switched to namespace: ${isAll ? "All Namespaces" : ns}`);
                  }}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer outline-hidden transition-all text-xs font-mono",
                    isSelected
                      ? "bg-[#F08A42]/12 text-[#F08A42] font-bold border border-[#F08A42]/20"
                      : "hover:bg-[var(--surface-hover)] text-[var(--foreground)]"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isAll ? (
                      <Globe className="w-3.5 h-3.5 text-[#F08A42] shrink-0" />
                    ) : (
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          isSystem ? "bg-slate-400 dark:bg-slate-600" : "bg-emerald-500"
                        )}
                      />
                    )}
                    <span className="truncate">
                      {isAll ? "All Namespaces" : ns}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isSystem && !isAll && (
                      <span className="px-1.5 py-0.2 text-[9px] rounded font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                        sys
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#F08A42] shrink-0" />}
                  </div>
                </DropdownMenu.Item>
              );
            })}

            {filteredNamespaces.length === 0 && (
              <div className="py-6 text-center text-xs text-[var(--muted)]">
                <p>No namespaces found</p>
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFilterCategory("all");
                    }}
                    className="mt-1.5 text-[11px] text-[#F08A42] hover:underline cursor-pointer"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-2.5 py-1.5 mt-1 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--muted)] font-mono">
            <span>Active: {currentNamespace === "all" ? "All" : currentNamespace}</span>
            <span>{filteredNamespaces.length} shown</span>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
