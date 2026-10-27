"use client";

import * as React from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { AutoGrowTextarea } from "./AutoGrowTextarea";
import type { EditableEntry } from "./configStorageEditorUtils";

export function ConfigStorageEditorEntry({
  entry,
  index,
  immutable,
  isSecret,
  visible,
  onUpdate,
  onRemove,
  onToggleVisibility,
}: {
  entry: EditableEntry;
  index: number;
  immutable: boolean;
  isSecret: boolean;
  visible: boolean;
  onUpdate: (id: string, patch: Partial<EditableEntry>) => void;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}) {
  const lineCount = entry.value ? entry.value.split("\n").length : 1;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 p-3 transition-colors focus-within:border-[var(--accent)]/50">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`config-storage-key-${index}`}
            className="mb-1 block text-[9px] font-mono uppercase tracking-wider text-[var(--muted)]"
          >
            Key
          </label>
          <input
            id={`config-storage-key-${index}`}
            value={entry.key}
            onChange={(event) =>
              onUpdate(entry.id, { key: event.target.value })
            }
            disabled={immutable}
            placeholder="Key"
            aria-label={`Key ${index + 1}`}
            data-testid={`config-storage-key-${index}`}
            className="h-9 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 font-mono text-xs text-[var(--foreground)] outline-hidden transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 disabled:opacity-60"
          />
        </div>
        <div className="flex items-center gap-1 pt-4">
          {entry.binary && (
            <span className="rounded border border-[var(--border)] bg-black/5 px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)] dark:bg-white/5">
              base64
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            disabled={immutable}
            className="cursor-pointer rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"
            aria-label={`Remove ${entry.key || "entry"}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] focus-within:border-[var(--accent)]/50">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-2.5 py-1.5">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--muted)]">
            Value
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--muted)]">
              {lineCount} line{lineCount === 1 ? "" : "s"}
            </span>
            {isSecret && (
              <button
                type="button"
                onClick={() => onToggleVisibility(entry.id)}
                className="cursor-pointer rounded p-0.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label={visible ? "Hide value" : "Show value"}
              >
                {visible ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
        <AutoGrowTextarea
          value={entry.value}
          onChange={(event) =>
            onUpdate(entry.id, { value: event.target.value })
          }
          disabled={immutable}
          masked={isSecret && !visible}
          ariaLabel={`Value ${index + 1}`}
          testId={`config-storage-value-${index}`}
        />
      </div>
    </div>
  );
}
