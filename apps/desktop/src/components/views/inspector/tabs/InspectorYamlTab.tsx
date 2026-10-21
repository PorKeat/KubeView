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
            <Tooltip content={isWrap ? "Disable word wrap" : "Enable word wrap"}>
              <button
                type="button"
                onClick={() => setIsWrap((prev) => !prev)}
                aria-label={isWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
                className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border",
                  isWrap
                    ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)] shadow-2xs"
                    : "border-transparent hover:bg-white/[0.08] text-slate-400 hover:text-white"
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
                      isLoading && "animate-spin text-[var(--accent)]"
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
            <Tooltip content={copiedYaml ? "Copied to clipboard" : "Copy YAML to clipboard"}>
              <button
                type="button"
                onClick={onCopy}
                disabled={isLoading}
                aria-label="Copy YAML to clipboard"
                className={cn(
                  "h-7 px-2.5 rounded-lg font-mono text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] border",
                  copiedYaml
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border-white/[0.1]"
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
