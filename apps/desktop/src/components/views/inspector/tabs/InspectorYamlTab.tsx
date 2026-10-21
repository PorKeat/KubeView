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

export interface InspectorYamlTabProps {
  yaml: string;
  isLoading: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onRetry?: () => void;
  copiedYaml: boolean;
  resourceName?: string;
}

interface Token {
  text: string;
  className: string;
}

/**
 * Tokenize a single YAML line into VS Code Dark+ color tokens.
 * Accurately handles keys, colons, array markers, strings, numbers, booleans,
 * comments, multiline block scalars, and embedded template expressions.
 */
function tokenizeYamlLine(line: string): Token[] {
  if (!line) return [{ text: "", className: "" }];

  // 1. Comments
  const trimmed = line.trimStart();
  const indentLength = line.length - trimmed.length;
  const indent = line.slice(0, indentLength);

  if (trimmed.startsWith("#")) {
    return [
      { text: indent, className: "" },
      { text: trimmed, className: "text-[#6a9955] italic" },
    ];
  }

  // 2. Document headers
  if (trimmed === "---" || trimmed === "...") {
    return [
      { text: indent, className: "" },
      { text: trimmed, className: "text-[#569cd6] font-bold" },
    ];
  }

  const tokens: Token[] = [];
  if (indent) {
    tokens.push({ text: indent, className: "" });
  }

  let rest = trimmed;

  // 3. Array item prefix "- "
  if (rest.startsWith("- ") || rest === "-") {
    tokens.push({ text: "- ", className: "text-[#569cd6] font-bold" });
    rest = rest.slice(2);
  }

  if (!rest) {
    return tokens;
  }

  // 4. Key-Value match: "some.key/name: value" or "'quoted.key': value"
  const kvMatch = rest.match(/^((?:"[^"]*"|'[^']*'|[^:\s][^:]*)):(\s*.*)?$/);

  if (kvMatch) {
    const rawKey = kvMatch[1];
    const rawValue = kvMatch[2] ?? "";

    tokens.push({ text: rawKey, className: "text-[#9cdcfe] font-medium" });
    tokens.push({ text: ":", className: "text-[#d4d4d4]" });

    if (rawValue) {
      const leadingSpaceMatch = rawValue.match(/^(\s+)(.*)$/);
      const spaces = leadingSpaceMatch ? leadingSpaceMatch[1] : "";
      const val = leadingSpaceMatch ? leadingSpaceMatch[2] : rawValue;

      if (spaces) {
        tokens.push({ text: spaces, className: "" });
      }

      if (val) {
        tokens.push(...tokenizeYamlValue(val));
      }
    }

    return tokens;
  }

  // 5. Template syntax line (e.g. {{- with secret ... -}} or export VAR=...)
  if (rest.includes("{{") || rest.startsWith("export ") || rest.includes("}}")) {
    tokens.push(...tokenizeTemplateOrScript(rest));
    return tokens;
  }

  // 6. Fallback scalar line
  tokens.push(...tokenizeYamlValue(rest));
  return tokens;
}

function tokenizeYamlValue(val: string): Token[] {
  const trimmed = val.trim();

  // Trailing comment: "value # comment"
  const commentIdx = val.indexOf(" #");
  if (commentIdx !== -1) {
    const beforeComment = val.slice(0, commentIdx);
    const commentPart = val.slice(commentIdx);
    return [
      ...tokenizeYamlValue(beforeComment),
      { text: commentPart, className: "text-[#6a9955] italic" },
    ];
  }

  // Block scalars |, |-, |+, >, >-, >+
  if (/^[|>][+-]?$/.test(trimmed)) {
    return [{ text: val, className: "text-[#d7ba7d] font-bold" }];
  }

  // Booleans (VS Code keyword blue)
  if (/^(true|false|yes|no)$/i.test(trimmed)) {
    return [{ text: val, className: "text-[#569cd6] font-semibold" }];
  }

  // Nulls
  if (/^(null|~)$/i.test(trimmed)) {
    return [{ text: val, className: "text-[#569cd6] font-semibold" }];
  }

  // Numbers (including integers, floats, and k8s quantities like 100m, 512Mi, 2Gi)
  if (/^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?(m|k|M|G|T|P|E|Ki|Mi|Gi|Ti|Pi|Ei)?$/.test(trimmed)) {
    return [{ text: val, className: "text-[#b5cea8]" }];
  }

  // Quoted strings ("..." or '...') (VS Code warm coral)
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return [{ text: val, className: "text-[#ce9178]" }];
  }

  // Template tags inside value
  if (val.includes("{{")) {
    return tokenizeTemplateOrScript(val);
  }

  // Unquoted string value (e.g. secret/data/woodpecker, woodpecker-agent-, apps/v1)
  return [{ text: val, className: "text-[#ce9178]" }];
}

function tokenizeTemplateOrScript(str: string): Token[] {
  const parts = str.split(
    /(\{\{-?|-?\}\}|"[^"]*"|'[^']*'|\bwith\b|\bend\b|\brange\b|\bif\b|\belse\b|\bsecret\b|\bexport\b)/g
  );
  return parts
    .filter(Boolean)
    .map((p) => {
      if (p.startsWith("{{") || p.endsWith("}}")) {
        return { text: p, className: "text-[#ffd700] font-bold" };
      }
      if (/^(with|end|range|if|else)$/.test(p)) {
        return { text: p, className: "text-[#c586c0] font-semibold" };
      }
      if (p === "export") {
        return { text: p, className: "text-[#569cd6] font-semibold" };
      }
      if (p === "secret") {
        return { text: p, className: "text-[#dcdcaa]" };
      }
      if (p.startsWith('"') || p.startsWith("'")) {
        return { text: p, className: "text-[#ce9178]" };
      }
      if (p.startsWith(".")) {
        return { text: p, className: "text-[#9cdcfe]" };
      }
      return { text: p, className: "text-[#d4d4d4]" };
    });
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
        <div className="bg-[#252526] border-b border-[#181818] flex items-center justify-between px-2 h-9 select-none shrink-0">
          {/* Active File Tab */}
          <div className="flex items-center h-full">
            <div className="flex items-center gap-2 px-3 h-full bg-[#1e1e1e] border-t-2 border-[#f08a42] text-slate-200 text-xs font-mono font-medium shadow-xs border-r border-[#181818]">
              <FileCode className="w-3.5 h-3.5 text-[#cb171e]" />
              <span className="truncate max-w-[200px]">
                {resourceName ? `${resourceName}.yaml` : "manifest.yaml"}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-white/[0.06] text-slate-400">
                YAML
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1">
            {/* Inline Search Bar */}
            {isSearchOpen ? (
              <div className="flex items-center gap-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded-md px-2 py-0.5 text-xs mr-1 animate-in fade-in duration-150">
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
                  <span className="text-[10px] font-mono text-slate-400 px-1">
                    {searchMatchCount}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCloseSearch}
                  className="text-slate-400 hover:text-white p-0.5"
                  title="Close search"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOpenSearch}
                title="Search in YAML (Ctrl+F)"
                className="p-1.5 rounded-md hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Word Wrap Toggle */}
            <button
              type="button"
              onClick={() => setIsWrap((prev) => !prev)}
              title={isWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                isWrap
                  ? "bg-white/[0.1] text-amber-300"
                  : "hover:bg-white/[0.08] text-slate-400 hover:text-white"
              )}
            >
              <WrapText className="w-3.5 h-3.5" />
            </button>

            {/* Refresh */}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isLoading}
                title="Re-fetch YAML manifest from cluster"
                className="p-1.5 rounded-md hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCw
                  className={cn(
                    "w-3.5 h-3.5",
                    isLoading && "animate-spin text-[#f08a42]"
                  )}
                />
              </button>
            )}

            {/* Download */}
            <button
              type="button"
              onClick={onDownload}
              disabled={isLoading}
              title="Download YAML to file"
              className="p-1.5 rounded-md hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={onCopy}
              disabled={isLoading}
              title="Copy YAML to clipboard"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-mono transition-colors cursor-pointer ml-1 shadow-xs",
                copiedYaml
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/[0.1]"
              )}
            >
              {copiedYaml ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="text-[11px] font-medium">
                {copiedYaml ? "Copied" : "Copy"}
              </span>
            </button>
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
                      isMatch
                        ? "bg-[#623314]/40"
                        : "hover:bg-white/[0.03]"
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
                        isWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
                      )}
                    >
                      {tokens.map((tok, tIdx) => {
                        if (!tok.text) return null;

                        // If search query is active and token contains match, highlight substring
                        if (
                          searchQuery.trim().length > 0 &&
                          tok.text.toLowerCase().includes(searchQuery.toLowerCase())
                        ) {
                          const regex = new RegExp(
                            `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                            "gi"
                          );
                          const segments = tok.text.split(regex);
                          return (
                            <span key={tIdx} className={tok.className}>
                              {segments.map((seg, sIdx) =>
                                seg.toLowerCase() === searchQuery.toLowerCase() ? (
                                  <mark
                                    key={sIdx}
                                    className="bg-[#623314] text-[#ffd700] ring-1 ring-[#e98038] rounded-xs px-0.5"
                                  >
                                    {seg}
                                  </mark>
                                ) : (
                                  seg
                                )
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
