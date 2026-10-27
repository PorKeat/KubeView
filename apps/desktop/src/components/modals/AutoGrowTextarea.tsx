"use client";

import * as React from "react";

export function AutoGrowTextarea({
  value,
  onChange,
  disabled,
  masked,
  ariaLabel,
  testId,
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  masked: boolean;
  ariaLabel: string;
  testId: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    const nextHeight = Math.min(360, Math.max(64, element.scrollHeight));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > 360 ? "auto" : "hidden";
  }, [value, masked]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      disabled={disabled}
      rows={2}
      spellCheck={false}
      aria-label={ariaLabel}
      data-testid={testId}
      style={
        masked
          ? ({ WebkitTextSecurity: "disc" } as React.CSSProperties)
          : undefined
      }
      className="min-h-16 max-h-[360px] w-full resize-none border-0 bg-transparent px-3 py-2.5 font-mono text-[11px] leading-5 text-[var(--foreground)] outline-hidden focus:ring-0 disabled:opacity-60"
    />
  );
}
