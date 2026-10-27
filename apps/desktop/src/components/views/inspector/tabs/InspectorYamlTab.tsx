"use client";

import * as React from "react";
import {
  Download,
  Copy,
  Check,
  RotateCw,
  Search,
  X,
  WrapText,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import { tokenizeYamlLine } from "./yamlTokenizer";

export interface InspectorYamlTabProps {
  yaml: string;
  isLoading: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onRetry?: () => void;
  copiedYaml: boolean;
  resourceName?: string;
}

export function InspectorYamlTab({
  yaml,
  isLoading,
  onCopy,
  onDownload,
  onRetry,
  copiedYaml,
  resourceName,
}: InspectorYamlTabProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isWrap, setIsWrap] = React.useState(true);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Split lines
  const lines = React.useMemo(() => {
    if (!yaml) return [];
    return yaml.split("\n");
  }, [yaml]);

  // Pre-tokenize lines for instantaneous, buttery rendering
  const tokenizedLines = React.useMemo(() => {
    return lines.map((line) => tokenizeYamlLine(line));
  }, [lines]);

  // Search match statistics
  const searchMatchCount = React.useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const lower = searchQuery.toLowerCase();
    let count = 0;
    for (const line of lines) {
      if (line.toLowerCase().includes(lower)) count++;
    }
    return count;
  }, [lines, searchQuery]);

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="space-y-2">
      {/* VS Code Window Frame */}
      <div className="rounded-xl border border-white/[0.1] bg-[#1e1e1e] shadow-2xl overflow-hidden flex flex-col font-mono text-[12px]">
        {/* VS Code Editor Tab Bar */}
        <div className="bg-[#14161f] border-b border-white/[0.08] flex items-center justify-between px-2.5 h-10 select-none shrink-0">
          {/* Active File Tab */}
          <div className="flex items-center h-full pt-1.5">
            <div className="relative flex items-center gap-2 px-3.5 h-[calc(100%+1px)] bg-[#1e1e1e] rounded-t-lg border-t border-x border-white/[0.1] text-slate-200 text-xs font-mono font-medium shadow-xs">
              {/* Refined gradient active indicator */}
              <div className="absolute top-0 inset-x-2 h-[2px] bg-gradient-to-r from-[var(--accent)] to-[#e85d26] rounded-full" />
              <FileCode className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="truncate max-w-[220px] tracking-tight">
                {resourceName ? `${resourceName}.yaml` : "manifest.yaml"}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold bg-white/[0.06] text-slate-400 border border-white/[0.08] tracking-wider">
                YAML
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 py-1">
            {/* Inline Search Bar */}
            {isSearchOpen ? (
              <div className="flex items-center gap-1.5 bg-[#14161f] border border-white/15 rounded-lg px-2.5 h-7 text-xs animate-in fade-in duration-150 shadow-inner">
                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Find in YAML..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handleCloseSearch();
                  }}
                  className="w-32 bg-transparent text-[11px] font-mono text-slate-200 placeholder-slate-500 outline-none"
                />
                {searchQuery && (
                  <span className="text-[10px] font-mono text-slate-400 px-1 tabular-nums">
                    {searchMatchCount}
                  </span>
                )}
                <Tooltip content="Close search" shortcut="Esc">
                  <button
                    type="button"
                    onClick={handleCloseSearch}
                    className="text-slate-400 hover:text-white p-0.5 cursor-pointer rounded hover:bg-white/10 transition-colors"
                    aria-label="Close search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Tooltip>
              </div>
            ) : (
              <Tooltip content="Find in YAML" shortcut="Ctrl+F">
                <button
                  type="button"
                  onClick={handleOpenSearch}
                  aria-label="Search in YAML"
                  className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            )}

            {/* Word Wrap Toggle */}
            <Tooltip
              content={isWrap ? "Disable word wrap" : "Enable word wrap"}
            >
              <button
                type="button"
                onClick={() => setIsWrap((prev) => !prev)}
                aria-label={isWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
                className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border",
                  isWrap
                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)] shadow-2xs"
                    : "border-transparent hover:bg-white/[0.08] text-slate-400 hover:text-white",
                )}
              >
                <WrapText className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            {/* Refresh */}
            {onRetry && (
              <Tooltip content="Re-fetch YAML manifest">
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isLoading}
                  aria-label="Re-fetch YAML manifest from cluster"
                  className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                >
                  <RotateCw
                    className={cn(
                      "w-3.5 h-3.5",
                      isLoading && "animate-spin text-[var(--accent)]",
                    )}
                  />
                </button>
              </Tooltip>
            )}

            {/* Download */}
            <Tooltip content="Download YAML file">
              <button
                type="button"
                onClick={onDownload}
                disabled={isLoading}
                aria-label="Download YAML to file"
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* Copy Button */}
            <Tooltip
              content={
                copiedYaml ? "Copied to clipboard" : "Copy YAML to clipboard"
              }
            >
              <button
                type="button"
                onClick={onCopy}
                disabled={isLoading}
                aria-label="Copy YAML to clipboard"
                className={cn(
                  "h-7 px-2.5 rounded-lg font-mono text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] border",
                  copiedYaml
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border-white/[0.1]",
                )}
              >
                {copiedYaml ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedYaml ? "Copied" : "Copy"}</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Editor Content Area */}
        {isLoading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 gap-2 bg-[#1e1e1e] font-mono text-xs">
            <RotateCw className="w-4 h-4 animate-spin text-[#f08a42]" />
            <span>Fetching live manifest from cluster...</span>
          </div>
        ) : (
          <div className="max-h-[68vh] overflow-y-auto overflow-x-auto bg-[#1e1e1e] select-text">
            <div className="min-w-full inline-block py-2">
              {tokenizedLines.map((tokens, lineIdx) => {
                const lineNum = lineIdx + 1;
                const rawLine = lines[lineIdx] || "";
                const isMatch =
                  searchQuery.trim().length > 0 &&
                  rawLine.toLowerCase().includes(searchQuery.toLowerCase());

                return (
                  <div
                    key={lineIdx}
                    className={cn(
                      "flex group transition-colors leading-5",
                      isMatch ? "bg-[#623314]/40" : "hover:bg-white/[0.03]",
                    )}
                  >
                    {/* Line Number Gutter (unselectable, VS Code grey) */}
                    <span className="w-12 pr-3.5 text-right select-none text-[#6e7681] group-hover:text-slate-400 shrink-0 border-r border-[#2d2d2d] font-mono text-[11px] tabular-nums">
                      {lineNum}
                    </span>

                    {/* Tokenized Syntax Highlighting Line */}
                    <span
                      className={cn(
                        "pl-3.5 flex-1 font-mono text-[11px]",
                        isWrap
                          ? "whitespace-pre-wrap break-all"
                          : "whitespace-pre",
                      )}
                    >
                      {tokens.map((tok, tIdx) => {
                        if (!tok.text) return null;

                        // If search query is active and token contains match, highlight substring
                        if (
                          searchQuery.trim().length > 0 &&
                          tok.text
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        ) {
                          const regex = new RegExp(
                            `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                            "gi",
                          );
                          const segments = tok.text.split(regex);
                          return (
                            <span key={tIdx} className={tok.className}>
                              {segments.map((seg, sIdx) =>
                                seg.toLowerCase() ===
                                searchQuery.toLowerCase() ? (
                                  <mark
                                    key={sIdx}
                                    className="bg-[#623314] text-[#ffd700] ring-1 ring-[#e98038] rounded-xs px-0.5"
                                  >
                                    {seg}
                                  </mark>
                                ) : (
                                  seg
                                ),
                              )}
                            </span>
                          );
                        }

                        return (
                          <span key={tIdx} className={tok.className}>
                            {tok.text}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VS Code Editor Status Bar */}
        <div className="h-6 px-3 bg-[#181818] border-t border-[#2d2d2d] text-[#858585] flex items-center justify-between text-[10px] select-none font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Kubernetes YAML</span>
            <span>•</span>
            <span>UTF-8</span>
            <span>•</span>
            <span>Spaces: 2</span>
          </div>

          <div className="flex items-center gap-3">
            <span>{lines.length} lines</span>
            <span>•</span>
            <span>{yaml.length} bytes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
