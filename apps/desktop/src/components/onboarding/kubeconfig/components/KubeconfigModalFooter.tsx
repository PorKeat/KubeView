"use client";

import * as React from "react";
import { Sparkles, Loader2, UploadCloud, FileCode } from "lucide-react";
import type { DiscoveredConfigFile } from "../types";

export interface KubeconfigModalFooterProps {
  activeTab: "auto" | "browse" | "paste" | "manage";
  closeKubeconfigModal: () => void;
  selectedDetectedCount: number;
  isSubmitting: boolean;
  handleImportDetected: () => Promise<void>;
  handleImportFromFiles: () => Promise<void>;
  handleImportFromPaste: () => Promise<void>;
  selectedValidFiles: DiscoveredConfigFile[];
  totalSelectedContexts: number;
  rawYaml: string;
}

export function KubeconfigModalFooter({
  activeTab,
  closeKubeconfigModal,
  selectedDetectedCount,
  isSubmitting,
  handleImportDetected,
  handleImportFromFiles,
  handleImportFromPaste,
  selectedValidFiles,
  totalSelectedContexts,
  rawYaml,
}: KubeconfigModalFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 select-none sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="hidden text-[10px] font-mono text-[var(--muted)] sm:inline">
        ~/.kube multi-config engine • Isolated in ~/.kubeview/clusters
      </span>

      <div className="flex items-center gap-3 self-end sm:self-auto">
        <button
          type="button"
          onClick={closeKubeconfigModal}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer"
        >
          Cancel
        </button>

        {activeTab === "auto" && (
          <button
            type="button"
            onClick={() => handleImportDetected()}
            disabled={selectedDetectedCount === 0 || isSubmitting}
            className="rounded-lg px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {selectedDetectedCount > 0
                    ? `Import ${selectedDetectedCount} Selected Cluster${selectedDetectedCount > 1 ? "s" : ""}`
                    : "Select Clusters to Import"}
                </span>
              </>
            )}
          </button>
        )}

        {activeTab === "browse" && (
          <button
            type="button"
            onClick={handleImportFromFiles}
            disabled={selectedValidFiles.length === 0 || isSubmitting}
            className="rounded-lg px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Validating & Importing...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>
                  {selectedValidFiles.length > 1
                    ? `Import ${selectedValidFiles.length} Configs (${totalSelectedContexts} Contexts)`
                    : "Import & Connect"}
                </span>
              </>
            )}
          </button>
        )}

        {activeTab === "paste" && (
          <button
            type="button"
            onClick={handleImportFromPaste}
            disabled={!rawYaml.trim() || isSubmitting}
            className="rounded-lg px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Validating & Importing...</span>
              </>
            ) : (
              <>
                <FileCode className="w-3.5 h-3.5" />
                <span>Import YAML & Connect</span>
              </>
            )}
          </button>
        )}

        {activeTab === "manage" && (
          <button
            type="button"
            onClick={closeKubeconfigModal}
            className="px-4 py-1.5 rounded-lg bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-colors cursor-pointer"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
