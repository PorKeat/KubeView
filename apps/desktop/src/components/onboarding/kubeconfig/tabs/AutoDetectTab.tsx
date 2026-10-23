"use client";

import * as React from "react";
import {
  Sparkles,
  RotateCw,
  Info,
  CheckSquare,
  Square,
  Plus,
  Check,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import type { DetectedContextInfo } from "@kubeview/contracts";
import { isInternalEndpoint, replaceEndpointHost } from "@/lib/endpointUtils";
import { cn } from "@/lib/utils";
import { getProviderBadge } from "../types";

export interface AutoDetectTabProps {
  detectedSystemConfigs: DetectedContextInfo[];
  isDetectingConfigs: boolean;
  selectedDetected: Set<string>;
  setSelectedDetected: React.Dispatch<React.SetStateAction<Set<string>>>;
  overrideEndpoints: Record<string, string>;
  setOverrideEndpoints: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  suggestedIps: { ip: string; source: string }[];
  detectSystemConfigs: () => Promise<DetectedContextInfo[]>;
  handleImportDetected: (c?: DetectedContextInfo) => Promise<void>;
  isSubmitting: boolean;
  setActiveTab: (tab: "auto" | "browse" | "paste" | "manage") => void;
}

export function AutoDetectTab({
  detectedSystemConfigs,
  isDetectingConfigs,
  selectedDetected,
  setSelectedDetected,
  overrideEndpoints,
  setOverrideEndpoints,
  suggestedIps,
  detectSystemConfigs,
  handleImportDetected,
  isSubmitting,
  setActiveTab,
}: AutoDetectTabProps) {
  const toggleSelectAllDetected = () => {
    const nonImported = detectedSystemConfigs.filter((c) => !c.isImported);
    if (
      selectedDetected.size === nonImported.length &&
      nonImported.length > 0
    ) {
      setSelectedDetected(new Set());
    } else {
      setSelectedDetected(
        new Set(nonImported.map((c) => `${c.filePath}::${c.contextName}`)),
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
        <div>
          <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F08A42]" />
            <span>Auto-Detected System Clusters</span>
          </h4>
          <p className="text-xs text-[var(--muted)] mt-1">
            Scanned standard OS paths: <code>~/.kube/config</code>,{" "}
            <code>~/.kube/kubeconfig</code>, <code>$KUBECONFIG</code>. Select
            which clusters to add.
          </p>
        </div>
        <button
          onClick={() => detectSystemConfigs()}
          disabled={isDetectingConfigs}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <RotateCw
            className={cn(
              "w-3.5 h-3.5",
              isDetectingConfigs && "animate-spin text-[#F08A42]",
            )}
          />
          <span>Re-Scan</span>
        </button>
      </div>

      {isDetectingConfigs ? (
        <div className="py-16 flex flex-col items-center justify-center text-[var(--muted)] gap-3">
          <RotateCw className="w-6 h-6 animate-spin text-[#F08A42]" />
          <span className="text-xs font-medium">
            Scanning OS directories for Kubernetes configurations...
          </span>
        </div>
      ) : detectedSystemConfigs.length === 0 ? (
        <div className="py-16 border-2 border-dashed border-[var(--border)] rounded-3xl flex flex-col items-center justify-center text-center p-8 text-[var(--muted)]">
          <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3">
            <Info className="w-6 h-6 opacity-40 text-[var(--foreground)]" />
          </div>
          <span className="text-sm font-semibold text-[var(--foreground)]">
            No Kubeconfigs Found in ~/.kube
          </span>
          <p className="text-xs max-w-md mt-1.5 leading-relaxed">
            We scanned standard OS paths but didn&apos;t find any kubeconfig
            files. You can manually pick files, select a folder, or paste YAML
            using the other tabs.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setActiveTab("browse")}
              className="px-4 py-2 rounded-xl bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-all cursor-pointer"
            >
              Pick Files or Folder
            </button>
            <button
              onClick={() => setActiveTab("paste")}
              className="px-4 py-2 rounded-xl bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-all cursor-pointer"
            >
              Paste YAML
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Bulk Selection Header */}
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <button
              onClick={toggleSelectAllDetected}
              className="flex items-center gap-2.5 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer font-medium"
            >
              {selectedDetected.size > 0 &&
              selectedDetected.size ===
                detectedSystemConfigs.filter((c) => !c.isImported).length ? (
                <CheckSquare className="w-4 h-4 text-[#F08A42]" />
              ) : selectedDetected.size > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#F08A42] opacity-70" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>
                Select All (
                {detectedSystemConfigs.filter((c) => !c.isImported).length}{" "}
                Available)
              </span>
            </button>

            {selectedDetected.size > 0 && (
              <button
                onClick={() => handleImportDetected()}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F08A42] hover:bg-[#E07931] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Import Selected ({selectedDetected.size})</span>
              </button>
            )}
          </div>

          {/* Cards List */}
          <div className="space-y-2.5">
            {detectedSystemConfigs.map((c) => {
              const itemKey = `${c.filePath}::${c.contextName}`;
              const isSelected = selectedDetected.has(itemKey);
              const isInternal = isInternalEndpoint(c.server);
              const effectiveServer = overrideEndpoints[itemKey]
                ? replaceEndpointHost(c.server, overrideEndpoints[itemKey])
                : c.server;

              return (
                <div
                  key={itemKey}
                  onClick={() => {
                    if (!c.isImported) {
                      const next = new Set(selectedDetected);
                      if (next.has(itemKey)) {
                        next.delete(itemKey);
                      } else {
                        next.add(itemKey);
                      }
                      setSelectedDetected(next);
                    }
                  }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex flex-col gap-3",
                    c.isImported
                      ? "bg-slate-50/50 dark:bg-white/[0.02] border-[var(--border)] opacity-85"
                      : isSelected
                        ? "bg-[#F08A42]/10 border-[#F08A42] shadow-sm cursor-pointer"
                        : "bg-slate-50 dark:bg-black/30 border border-[var(--border)] hover:border-slate-300 dark:hover:border-white/20 cursor-pointer",
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 w-full">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.isImported ? (
                          <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const next = new Set(selectedDetected);
                              if (next.has(itemKey)) {
                                next.delete(itemKey);
                              } else {
                                next.add(itemKey);
                              }
                              setSelectedDetected(next);
                            }}
                            className="w-4 h-4 rounded accent-[#F08A42] cursor-pointer"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-[var(--foreground)] truncate">
                            {c.contextName}
                          </span>
                          {getProviderBadge(c.provider)}
                          {isInternal && (
                            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Internal Domain
                            </span>
                          )}
                          {c.authType && (
                            <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                              auth: {c.authType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)] font-mono mt-1 flex-wrap">
                          <span
                            className={cn(
                              "font-medium",
                              overrideEndpoints[itemKey]
                                ? "text-[#F08A42]"
                                : "text-[var(--foreground)]",
                            )}
                          >
                            {effectiveServer || "local server"}
                          </span>
                          <span>•</span>
                          <span
                            className="truncate max-w-sm text-[11px]"
                            title={c.filePath}
                          >
                            {c.filePath}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="shrink-0 flex items-center gap-2 self-end sm:self-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.isImported ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImportDetected(c)}
                          disabled={isSubmitting}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F08A42] hover:bg-[#E07931] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          <span>Add to KubeView</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Internal Domain IP Input Prompt */}
                  {!c.isImported && isInternal && (
                    <div
                      className="pt-2.5 border-t border-[var(--border)] space-y-1.5 w-full text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Internal hostname detected. Enter node IP to connect
                          from this computer:
                        </span>
                        {suggestedIps.length > 0 &&
                          !overrideEndpoints[itemKey] && (
                            <button
                              type="button"
                              onClick={() =>
                                setOverrideEndpoints({
                                  ...overrideEndpoints,
                                  [itemKey]: suggestedIps[0].ip,
                                })
                              }
                              className="text-[10px] text-[#F08A42] hover:underline font-mono cursor-pointer"
                            >
                              Use {suggestedIps[0].ip}
                            </button>
                          )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter Master IP (e.g. 10.1.16.11)"
                          value={overrideEndpoints[itemKey] || ""}
                          onChange={(e) =>
                            setOverrideEndpoints({
                              ...overrideEndpoints,
                              [itemKey]: e.target.value,
                            })
                          }
                          className="flex-1 px-3 py-1.5 text-xs font-mono bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)]/50 focus:border-[#F08A42] outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
