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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 md:px-8 py-4.5 border-t border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] select-none">
      <span className="text-xs text-[var(--muted)] font-mono">
        ~/.kube multi-config engine • Isolated in ~/.kubeview/clusters
      </span>

      <div className="flex items-center gap-3 self-end sm:self-auto">
        <button
          type="button"
          onClick={closeKubeconfigModal}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        >
          Cancel
        </button>

        {activeTab === "auto" && (
          <button
            type="button"
            onClick={() => handleImportDetected()}
            disabled={selectedDetectedCount === 0 || isSubmitting}
            className="px-5 py-2 rounded-xl bg-[#F08A42] hover:bg-[#E07931] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2"
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
            className="px-4 py-1.5 rounded-lg bg-[#F08A42] hover:bg-[#E07931] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2"
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
            className="px-4 py-1.5 rounded-lg bg-[#F08A42] hover:bg-[#E07931] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2"
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
            className="px-4 py-1.5 rounded-lg bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-all cursor-pointer"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
