"use client";

import * as React from "react";

export function formatAnsiOutput(raw: string): React.ReactNode {
  if (!raw) return null;

  // 1. Strip screen-clear, cursor positions, private modes, and stray control brackets (\x1b[H\x1b[J, [H, [J, \x1b[2J, \x1b[K, etc.)
  const cleaned = raw
    .replace(/\x1b\[[0-9;]*[A-HJKSTf]/g, "")
    .replace(/\[[HJKSTf]/g, "")
    .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const parts = cleaned.split(/(\x1b\[[0-9;]*m)/g);
  if (parts.length <= 1) {
    return cleaned;
  }

  const elements: React.ReactNode[] = [];
  let activeStyles: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const match = part.match(/^\x1b\[([0-9;]*)m$/);
    if (match) {
      const codeStr = match[1] || "0";
      const codes = codeStr.split(";").map(Number);
      for (const code of codes) {
        if (code === 0) {
          activeStyles = [];
        } else if (code === 1) {
          activeStyles.push("font-bold text-white");
        } else if (code === 2) {
          activeStyles.push("opacity-70");
        } else if (code === 3) {
          activeStyles.push("italic");
        } else if (code === 4) {
          activeStyles.push("underline");
        } else if (code === 30) {
          activeStyles = activeStyles.filter((s) => !s.startsWith("text-"));
          activeStyles.push("text-slate-900 dark:text-slate-400");
        } else if (code === 31 || code === 91) {
          activeStyles = activeStyles.filter((s) => !s.startsWith("text-"));
          activeStyles.push("text-rose-400");
        } else if (code === 32 || code === 92) {
          activeStyles = activeStyles.filter((s) => !s.startsWith("text-"));
          activeStyles.push("text-emerald-400");
        } else if (code === 33 || code === 93) {
          activeStyles = activeStyles.filter((s) => !s.startsWith("text-"));
          activeStyles.push("text-amber-300");
        } else if (code === 34 || code === 94) {
          activeStyles = activeStyles.filter((s) => !s.startsWith("text-"));
          activeStyles.push("text-sky-400");
        } else if (code === 35 || code === 95) {
          activeStyles = activeStyles.filter((s) => !s.startsWith("text-"));
          activeStyles.push("text-purple-400");
        } else if (code === 36 || code === 96) {
          activeStyles = activeStyles.filter((s) => !s.startsWith("text-"));
          activeStyles.push("text-cyan-400");
        } else if (code === 37 || code === 97) {
          activeStyles = activeStyles.filter((s) => !s.startsWith("text-"));
          activeStyles.push("text-slate-200");
        }
      }
    } else {
      elements.push(
        <span
          key={i}
          className={
            activeStyles.length > 0 ? activeStyles.join(" ") : undefined
          }
        >
          {part}
        </span>,
      );
    }
  }

  return elements;
}
