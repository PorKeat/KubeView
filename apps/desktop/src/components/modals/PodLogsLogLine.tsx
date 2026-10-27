"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ERROR_REGEX = /error|fatal|fail|panic|exception/i;
const WARN_REGEX = /warn|alert/i;

interface LogLineProps {
  line: string;
  lineIdx: number;
  showLineNumbers: boolean;
  wrapLines: boolean;
}

export const LogLineRow = React.memo(function LogLineRow({
  line,
  lineIdx,
  showLineNumbers,
  wrapLines,
}: LogLineProps) {
  const isError = ERROR_REGEX.test(line);
  const isWarning = !isError && WARN_REGEX.test(line);

  return (
    <div
      className="flex hover:bg-white/[0.04] rounded-xs px-1 group transition-colors"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto 22px",
      }}
    >
      {showLineNumbers && (
        <span className="w-12 text-slate-500/70 select-none text-right pr-3 shrink-0 text-[11px] font-mono border-r border-white/5 mr-2.5">
          {lineIdx + 1}
        </span>
      )}
      <span
        className={cn(
          "flex-1 font-mono",
          wrapLines ? "break-all whitespace-pre-wrap" : "whitespace-pre",
          isError
            ? "text-rose-400"
            : isWarning
              ? "text-amber-300"
              : "text-slate-300",
        )}
      >
        {line}
      </span>
    </div>
  );
});
