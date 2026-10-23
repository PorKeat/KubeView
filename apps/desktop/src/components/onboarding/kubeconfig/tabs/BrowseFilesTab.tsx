"use client";

import * as React from "react";
import {
  Sparkles,
  FolderOpen,
  FileCode,
  Folder,
  Loader2,
  FileCheck,
  Trash2,
  CheckSquare,
  Square,
  Shield,
} from "lucide-react";
import type { DetectedContextInfo } from "@kubeview/contracts";
import { cn } from "@/lib/utils";
import type { DiscoveredConfigFile } from "../types";

export interface BrowseFilesTabProps {
  detectedSystemConfigs: DetectedContextInfo[];
  discoveredFiles: DiscoveredConfigFile[];
  setDiscoveredFiles: React.Dispatch<
    React.SetStateAction<DiscoveredConfigFile[]>
  >;
  singleAliasName: string;
  setSingleAliasName: (val: string) => void;
  folderName: string;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  isReadingFiles: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  handleFilesSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFolderSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  toggleFileSelection: (id: string) => void;
  toggleSelectAll: (select: boolean) => void;
  removeDiscoveredFile: (id: string) => void;
  selectedValidFiles: DiscoveredConfigFile[];
  setActiveTab: (tab: "auto" | "browse" | "paste" | "manage") => void;
}

export function BrowseFilesTab({
  detectedSystemConfigs,
  discoveredFiles,
  setDiscoveredFiles,
  singleAliasName,
  setSingleAliasName,
  folderName,
  isDragging,
  setIsDragging,
  isReadingFiles,
  fileInputRef,
  folderInputRef,
  handleFilesSelect,
  handleFolderSelect,
  handleDrop,
  toggleFileSelection,
  toggleSelectAll,
  removeDiscoveredFile,
  selectedValidFiles,
  setActiveTab,
}: BrowseFilesTabProps) {
  return (
    <div className="space-y-4">
      {/* Auto-detected banner hint */}
      {detectedSystemConfigs.some((c) => !c.isImported) && (
        <div className="p-3.5 rounded-xl bg-[#F08A42]/10 border border-[#F08A42]/25 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#F08A42] shrink-0" />
            <div>
              <span className="font-semibold text-[var(--foreground)] block">
                Auto-Detected System Cluster Configs Found!
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                Found{" "}
                {detectedSystemConfigs.filter((c) => !c.isImported).length}{" "}
                cluster context(s) in your standard OS paths (e.g.{" "}
                <code>~/.kube/kubeconfig</code>).
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("auto")}
            className="px-3 py-1.5 rounded-lg bg-[#F08A42] hover:bg-[#E07931] text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-all"
          >
            View & Select
          </button>
        </div>
      )}

      {/* Hidden Native File & Folder Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesSelect}
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderSelect}
        multiple
        {...({
          webkitdirectory: "",
          directory: "",
        } as unknown as React.InputHTMLAttributes<HTMLInputElement>)}
        className="hidden"
      />

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all relative overflow-hidden",
          isDragging
            ? "border-[#F08A42] bg-[#F08A42]/8 scale-[0.99]"
            : "border-[var(--border)] hover:border-[#F08A42]/60 hover:bg-black/[0.015] dark:hover:bg-white/[0.015]",
        )}
      >
        <div className="w-12 h-12 rounded-2xl bg-[#F08A42]/10 border border-[#F08A42]/20 flex items-center justify-center text-[#F08A42] mb-3">
          <FolderOpen className="w-6 h-6" />
        </div>

        <h4 className="text-sm font-semibold text-[var(--foreground)] mb-1">
          Drag & Drop Kubeconfigs or Pick from Disk
        </h4>
        <p className="text-xs text-[var(--muted)] max-w-md mb-4">
          Drop individual files or an entire folder containing multiple
          kubeconfig files. All valid configurations are auto-discovered and
          indexed.
        </p>

        {/* Dual Action Selection Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--surface-active)] text-xs font-semibold text-[var(--foreground)] border border-[var(--border)] hover:border-black/20 dark:hover:border-white/20 hover:text-[var(--foreground)] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileCode className="w-3.5 h-3.5 text-[#F08A42]" />
            <span>Choose File(s)</span>
          </button>

          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-lg bg-[#F08A42]/10 text-xs font-semibold text-[#F08A42] border border-[#F08A42]/30 hover:bg-[#F08A42]/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Choose Entire Folder</span>
          </button>
        </div>
      </div>

      {/* Loading indicator while parsing files */}
      {isReadingFiles && (
        <div className="py-4 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
          <Loader2 className="w-4 h-4 animate-spin text-[#F08A42]" />
          <span>Scanning and parsing Kubeconfig files...</span>
        </div>
      )}

      {/* SINGLE FILE PREVIEW */}
      {discoveredFiles.length === 1 && !isReadingFiles && (
        <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileCheck className="w-4 h-4 text-[#F08A42] shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-[var(--foreground)] truncate block">
                  {discoveredFiles[0].name}
                </span>
                <span className="text-[10px] text-[var(--muted)] font-mono">
                  {(discoveredFiles[0].sizeBytes / 1024).toFixed(1)} KB •{" "}
                  {discoveredFiles[0].contexts.length > 0
                    ? `${discoveredFiles[0].contexts.length} context(s) found`
                    : "Validating syntax..."}
                </span>
              </div>
            </div>

            <button
              onClick={() => setDiscoveredFiles([])}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
              title="Remove selection"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Context Pills */}
          {discoveredFiles[0].contexts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {discoveredFiles[0].contexts.map((ctx) => (
                <span
                  key={ctx}
                  className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-[#F08A42]/10 text-[#F08A42] border border-[#F08A42]/20"
                >
                  ctx: {ctx}
                </span>
              ))}
            </div>
          )}

          {/* Optional Custom Alias */}
          <div className="pt-2 border-t border-[var(--border)]">
            <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
              Cluster Profile Alias (Optional)
            </label>
            <input
              type="text"
              value={singleAliasName}
              onChange={(e) => setSingleAliasName(e.target.value)}
              placeholder="e.g. production-cluster"
              className="w-full px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] outline-hidden focus:border-[#F08A42]"
            />
          </div>
        </div>
      )}

      {/* MULTI-FILE / FOLDER DISCOVERY LIST */}
      {discoveredFiles.length > 1 && !isReadingFiles && (
        <div className="space-y-3">
          {/* Discovery Header Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-[var(--border)] text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Folder className="w-4 h-4 text-[#F08A42] shrink-0" />
              <span className="font-semibold text-[var(--foreground)] truncate">
                {folderName ? `Folder: ${folderName}` : "Multi-File Selection"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F08A42]/15 text-[#F08A42]">
                {selectedValidFiles.length} of {discoveredFiles.length} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  toggleSelectAll(
                    selectedValidFiles.length !== discoveredFiles.length,
                  )
                }
                className="text-[11px] text-[#F08A42] hover:underline font-medium cursor-pointer"
              >
                {selectedValidFiles.length === discoveredFiles.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
              <button
                type="button"
                onClick={() => setDiscoveredFiles([])}
                className="text-[11px] text-[var(--muted)] hover:text-rose-500 cursor-pointer ml-2"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Scrollable Discovered Items List */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {discoveredFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => file.isValid && toggleFileSelection(file.id)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group text-xs",
                  !file.isValid
                    ? "opacity-50 bg-black/[0.01] border-[var(--border)] cursor-not-allowed"
                    : file.selected
                      ? "bg-[#F08A42]/8 border-[#F08A42]/40"
                      : "bg-black/[0.02] dark:bg-white/[0.02] border-[var(--border)] hover:border-black/20 dark:hover:border-white/20",
                )}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {/* Checkbox */}
                  <div className="text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors shrink-0">
                    {file.selected ? (
                      <CheckSquare className="w-4 h-4 text-[#F08A42]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--foreground)] truncate">
                        {file.relativePath}
                      </span>
                      <span className="text-[10px] text-[var(--muted)] font-mono shrink-0">
                        ({(file.sizeBytes / 1024).toFixed(1)} KB)
                      </span>
                    </div>

                    {/* Context tags in file */}
                    {file.contexts.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {file.contexts.slice(0, 3).map((c) => (
                          <span
                            key={c}
                            className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                          >
                            {c}
                          </span>
                        ))}
                        {file.contexts.length > 3 && (
                          <span className="text-[9px] text-[var(--muted)] font-mono self-center">
                            +{file.contexts.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-500 font-mono mt-0.5 block">
                        No contexts defined
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDiscoveredFile(file.id);
                  }}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-rose-500 transition-colors shrink-0 ml-2 cursor-pointer"
                  title="Exclude file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Guarantee Info */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-[11px] text-[var(--muted)]">
        <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <span>
          Discovered configurations are safely copied to your isolated{" "}
          <code className="font-mono text-[var(--foreground)]">
            ~/.kube/kubeview_*.yaml
          </code>{" "}
          storage. Your system default{" "}
          <code className="font-mono text-[var(--foreground)]">
            ~/.kube/config
          </code>{" "}
          is never overwritten.
        </span>
      </div>
    </div>
  );
}
