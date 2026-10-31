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
import {
  isInternalEndpoint,
  joinEndpoint,
  replaceEndpointHost,
  splitEndpoint,
} from "@/lib/endpointUtils";
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
  const available = detectedSystemConfigs.filter((c) => !c.isImported);

  const toggleSelectAllDetected = () => {
    if (selectedDetected.size === available.length && available.length > 0) {
      setSelectedDetected(new Set());
    } else {
      setSelectedDetected(
        new Set(available.map((c) => `${c.filePath}::${c.contextName}`)),
      );
    }
  };

  const toggleItem = (itemKey: string) => {
    const next = new Set(selectedDetected);
    if (next.has(itemKey)) next.delete(itemKey);
    else next.add(itemKey);
    setSelectedDetected(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center">
        <div>
          <h4 className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            Auto-Detected System Clusters
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
            Scanned standard OS paths: <code>~/.kube/config</code>,{" "}
            <code>~/.kube/kubeconfig</code>, <code>$KUBECONFIG</code>. Select
            which clusters to add.
          </p>
        </div>
        <button
          type="button"
          onClick={() => detectSystemConfigs()}
          disabled={isDetectingConfigs}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-50 sm:self-auto"
        >
          <RotateCw
            className={cn(
              "h-3 w-3",
              isDetectingConfigs && "animate-spin text-[var(--accent)]",
            )}
            aria-hidden="true"
          />
          Re-Scan
        </button>
      </div>

      {isDetectingConfigs ? (
        <div className="flex flex-col items-center justify-center gap-2 py-14 text-[var(--muted)]">
          <RotateCw
            className="h-5 w-5 animate-spin text-[var(--accent)]"
            aria-hidden="true"
          />
          <span className="text-[11px]">
            Scanning OS directories for Kubernetes configurations...
          </span>
        </div>
      ) : detectedSystemConfigs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Info className="h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
          <span className="mt-2 text-xs font-semibold text-[var(--foreground)]">
            No kubeconfigs found in ~/.kube
          </span>
          <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--muted)]">
            We scanned standard OS paths but didn&apos;t find any kubeconfig
            files. You can pick files, select a folder, or paste YAML using the
            other tabs.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("browse")}
              className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              Pick Files or Folder
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("paste")}
              className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              Paste YAML
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={toggleSelectAllDetected}
              className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              {selectedDetected.size > 0 &&
              selectedDetected.size === available.length ? (
                <CheckSquare
                  className="h-3.5 w-3.5 text-[var(--accent)]"
                  aria-hidden="true"
                />
              ) : selectedDetected.size > 0 ? (
                <CheckSquare
                  className="h-3.5 w-3.5 text-[var(--accent)] opacity-70"
                  aria-hidden="true"
                />
              ) : (
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Select All ({available.length} Available)
            </button>

            {selectedDetected.size > 0 && (
              <button
                type="button"
                onClick={() => handleImportDetected()}
                disabled={isSubmitting}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                Import Selected ({selectedDetected.size})
              </button>
            )}
          </div>

          <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {detectedSystemConfigs.map((c) => {
              const itemKey = `${c.filePath}::${c.contextName}`;
              const isSelected = selectedDetected.has(itemKey);
              const isInternal = isInternalEndpoint(c.server);
              const overrideValue = overrideEndpoints[itemKey];
              const baseParts = splitEndpoint(c.server);
              const overrideParts = overrideValue
                ? splitEndpoint(
                    overrideValue.includes("://")
                      ? overrideValue
                      : `${overrideValue}:${baseParts.port}`,
                  )
                : baseParts;
              const effectiveServer = overrideValue
                ? replaceEndpointHost(c.server, overrideValue)
                : c.server;

              return (
                <div
                  key={itemKey}
                  onClick={() => !c.isImported && toggleItem(itemKey)}
                  className={cn(
                    "border-l-2 py-3 pl-3 pr-1 transition-colors",
                    c.isImported
                      ? "border-transparent opacity-60"
                      : isSelected
                        ? "cursor-pointer border-[var(--accent)] bg-[var(--accent)]/[0.04]"
                        : "cursor-pointer border-transparent hover:bg-[var(--surface-hover)]",
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="shrink-0"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {c.isImported ? (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                            <Check className="h-3 w-3" aria-hidden="true" />
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem(itemKey)}
                            aria-label={`Select ${c.contextName}`}
                            className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-mono text-xs font-semibold text-[var(--foreground)]">
                            {c.contextName}
                          </span>
                          {getProviderBadge(c.provider)}
                          {isInternal && (
                            <span className="rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] text-amber-600 dark:text-amber-400">
                              Internal
                            </span>
                          )}
                          {c.authType && (
                            <span className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)] dark:bg-white/5">
                              auth: {c.authType}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-[var(--muted)]">
                          <span
                            className={cn(
                              "truncate font-medium",
                              overrideValue
                                ? "text-[var(--accent)]"
                                : "text-[var(--foreground)]",
                            )}
                          >
                            {effectiveServer || "local server"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className="max-w-sm truncate"
                            title={c.filePath}
                          >
                            {c.filePath}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-2 self-end sm:self-auto"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {c.isImported ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleImportDetected(c)}
                          disabled={isSubmitting}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                        >
                          Add to KubeView
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!c.isImported && isInternal && (
                    <div
                      className="mt-2.5 space-y-1.5 border-t border-[var(--border)] pt-2.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                        <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                          <AlertTriangle
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          Internal hostname — enter the node IP and port:
                        </span>
                        {suggestedIps.length > 0 && !overrideValue && (
                          <button
                            type="button"
                            onClick={() =>
                              setOverrideEndpoints({
                                ...overrideEndpoints,
                                [itemKey]: joinEndpoint(
                                  baseParts.protocol,
                                  suggestedIps[0].ip,
                                  baseParts.port,
                                ),
                              })
                            }
                            className="cursor-pointer font-mono text-[10px] text-[var(--accent)] hover:underline"
                          >
                            Use {suggestedIps[0].ip}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          data-testid={`detected-host-${itemKey}`}
                          placeholder="Master IP / hostname (e.g. 10.1.16.11)"
                          value={overrideValue ? overrideParts.host : ""}
                          onChange={(event) => {
                            const raw = event.target.value.trim();
                            const next = { ...overrideEndpoints };
                            if (!raw) {
                              delete next[itemKey];
                            } else if (
                              raw.includes("://") ||
                              /^[^:]+:\d+$/.test(raw)
                            ) {
                              const parsed = splitEndpoint(raw);
                              next[itemKey] = joinEndpoint(
                                parsed.protocol,
                                parsed.host,
                                parsed.port,
                              );
                            } else {
                              next[itemKey] = joinEndpoint(
                                baseParts.protocol,
                                raw,
                                overrideParts.port,
                              );
                            }
                            setOverrideEndpoints(next);
                          }}
                          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 font-mono text-xs text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)]/50 focus:border-[var(--accent)]"
                          aria-label="Master IP or hostname"
                        />
                        <span className="font-mono text-xs text-[var(--muted)]">
                          :
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          data-testid={`detected-port-${itemKey}`}
                          value={
                            overrideValue ? overrideParts.port : baseParts.port
                          }
                          onChange={(event) => {
                            if (!overrideValue) return;
                            const port = event.target.value.replace(
                              /[^\d]/g,
                              "",
                            );
                            const host = overrideParts.host;
                            if (!host || !port) return;
                            setOverrideEndpoints({
                              ...overrideEndpoints,
                              [itemKey]: joinEndpoint(
                                baseParts.protocol,
                                host,
                                port,
                              ),
                            });
                          }}
                          disabled={!overrideValue}
                          maxLength={5}
                          className="w-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[var(--foreground)] outline-hidden focus:border-[var(--accent)] disabled:opacity-50"
                          aria-label="Master port"
                          title={
                            overrideValue ? "Master port" : "Enter a host first"
                          }
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
