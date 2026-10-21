"use client";

import * as React from "react";
import { Layers, ChevronDown, Check, Search, X, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useClusterStore } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NamespaceSelectorDropdownProps {
  variant?: "header" | "toolbar" | "unified";
  className?: string;
}

export function NamespaceSelectorDropdown({
  variant = "header",
  className,
}: NamespaceSelectorDropdownProps) {
  const { currentNamespace, availableNamespaces, setCurrentNamespace, pods } = useClusterStore();
  const [search, setSearch] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState<"all" | "workloads" | "system">("all");
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click and Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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

  const namespaceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pods) {
      counts[p.namespace] = (counts[p.namespace] || 0) + 1;
    }
    return counts;
  }, [pods]);

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
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Select Kubernetes namespace (current: ${currentNamespace === "all" ? "All Namespaces" : currentNamespace})`}
        aria-expanded={isOpen}
        className={cn(
          "flex items-center gap-1.5 text-xs font-mono transition-colors outline-hidden select-none group cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
          variant === "header" &&
            "px-2.5 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-black/20 dark:hover:border-white/20 text-[var(--foreground)] shadow-xs",
          variant === "toolbar" &&
            "px-2.5 py-1.5 rounded-lg bg-slate-100/90 dark:bg-black/40 border border-[var(--border)] hover:border-black/20 dark:hover:border-white/20 text-[var(--foreground)] shrink-0",
          variant === "unified" &&
            "px-2.5 py-1.5 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[var(--foreground)]",
          isOpen && variant !== "unified" && "border-black/20 dark:border-white/20 ring-1 ring-[var(--accent)]/30",
          isOpen && variant === "unified" && "bg-black/[0.08] dark:bg-white/[0.1]",
          className
        )}
        title={`Filter by Namespace (Current: ${currentNamespace})`}
      >
        <Layers className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors shrink-0" aria-hidden="true" />
        <span className="text-[11px] text-[var(--muted)] uppercase font-semibold tracking-wider">
          ns:
        </span>
        <span className="font-bold max-w-[120px] truncate text-[var(--foreground)]">
          {currentNamespace === "all" ? "All Namespaces" : currentNamespace}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 30,
              mass: 0.8,
            }}
            style={{ transformOrigin: "top left" }}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-1.5 z-50 w-80 max-w-[calc(100vw-2rem)] p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl shadow-black/30 dark:shadow-black/70 backdrop-blur-xl outline-hidden select-none"
          >
            {/* Header & Title */}
            <div className="px-2 pt-1 pb-2 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--foreground)] tracking-tight flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[var(--muted)]" aria-hidden="true" />
                  <span>Namespaces</span>
                </span>
                <span className="text-[11px] text-[var(--muted)] font-mono tabular-nums">
                  {availableNamespaces.length} available
                </span>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  aria-label="Filter namespaces"
                  placeholder="Search namespace..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-black/[0.025] dark:bg-white/[0.035] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] outline-hidden focus:border-[var(--accent)] focus-visible:ring-1 focus-visible:ring-[var(--accent)] font-mono transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills (Quiet elevated buttons, zero fluorescent orange) */}
              <div className="flex items-center gap-1 mt-2 pt-1" role="group" aria-label="Filter namespace categories">
                <button
                  type="button"
                  onClick={() => setFilterCategory("all")}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer font-mono outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--accent)] border",
                    filterCategory === "all"
                      ? "bg-black/[0.08] dark:bg-white/[0.1] text-[var(--foreground)] font-semibold border-black/10 dark:border-white/15 shadow-xs"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  All ({availableNamespaces.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory("workloads")}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer font-mono outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--accent)] border",
                    filterCategory === "workloads"
                      ? "bg-black/[0.08] dark:bg-white/[0.1] text-[var(--foreground)] font-semibold border-black/10 dark:border-white/15 shadow-xs"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  Apps ({workloadCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory("system")}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer font-mono outline-hidden focus-visible:ring-1 focus-visible:ring-[var(--accent)] border",
                    filterCategory === "system"
                      ? "bg-black/[0.08] dark:bg-white/[0.1] text-[var(--foreground)] font-semibold border-black/10 dark:border-white/15 shadow-xs"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
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
                  <button
                    key={ns}
                    type="button"
                    onClick={() => {
                      setCurrentNamespace(ns);
                      toast.info(`Switched to namespace: ${isAll ? "All Namespaces" : ns}`);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer outline-hidden transition-all text-xs font-mono border",
                      isSelected
                        ? "bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10 text-[var(--foreground)] font-semibold shadow-xs"
                        : "border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:border-[var(--border)] text-[var(--foreground)]"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isAll ? (
                        <Globe className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                      ) : (
                        <Layers className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 opacity-70" />
                      )}
                      <span className="truncate">
                        {isAll ? "All Namespaces" : ns}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-[var(--muted)] font-mono tabular-nums px-1.5 py-0.2 rounded bg-black/[0.03] dark:bg-white/[0.04] border border-[var(--border)]">
                        {isAll ? pods.length : (namespaceCounts[ns] || 0)}
                      </span>
                      {isSystem && !isAll && (
                        <span className="px-1.5 py-0.2 text-[10px] rounded font-mono bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                          sys
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
                    </div>
                  </button>
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
                      className="mt-1.5 text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="px-2.5 py-1.5 mt-1 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)] font-mono tabular-nums">
              <span>Active: {currentNamespace === "all" ? "All" : currentNamespace}</span>
              <span>{filteredNamespaces.length} shown</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
