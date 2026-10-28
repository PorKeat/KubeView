export type YamlDiffKind = "context" | "added" | "removed";

export interface YamlDiffLine {
  kind: YamlDiffKind;
  oldLine?: number;
  newLine?: number;
  text: string;
}

export interface YamlDiff {
  lines: YamlDiffLine[];
  added: number;
  removed: number;
  changed: number;
  hasChanges: boolean;
}

const MAX_DP_CELLS = 1_000_000;

function splitLines(value: string): string[] {
  if (!value) return [];
  return value.replace(/\r\n/g, "\n").split("\n");
}

function prefixSuffixDiff(original: string[], modified: string[]): YamlDiff {
  let prefix = 0;
  while (
    prefix < original.length &&
    prefix < modified.length &&
    original[prefix] === modified[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < original.length - prefix &&
    suffix < modified.length - prefix &&
    original[original.length - 1 - suffix] ===
      modified[modified.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const lines: YamlDiffLine[] = [];
  let added = 0;
  let removed = 0;
  for (let index = 0; index < prefix; index += 1) {
    lines.push({
      kind: "context",
      oldLine: index + 1,
      newLine: index + 1,
      text: original[index],
    });
  }
  for (let index = prefix; index < original.length - suffix; index += 1) {
    lines.push({
      kind: "removed",
      oldLine: index + 1,
      text: original[index],
    });
    removed += 1;
  }
  for (let index = prefix; index < modified.length - suffix; index += 1) {
    lines.push({
      kind: "added",
      newLine: index + 1,
      text: modified[index],
    });
    added += 1;
  }
  for (let index = 0; index < suffix; index += 1) {
    const oldIndex = original.length - suffix + index;
    const newIndex = modified.length - suffix + index;
    lines.push({
      kind: "context",
      oldLine: oldIndex + 1,
      newLine: newIndex + 1,
      text: original[oldIndex],
    });
  }

  return {
    lines,
    added,
    removed,
    changed: Math.min(added, removed),
    hasChanges: added > 0 || removed > 0,
  };
}

export function diffYamlLines(
  originalValue: string,
  modifiedValue: string,
): YamlDiff {
  const original = splitLines(originalValue);
  const modified = splitLines(modifiedValue);

  if (original.length * modified.length > MAX_DP_CELLS) {
    return prefixSuffixDiff(original, modified);
  }

  const n = original.length;
  const m = modified.length;
  const dp: Uint32Array[] = Array.from(
    { length: n + 1 },
    () => new Uint32Array(m + 1),
  );

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] =
        original[i] === modified[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lines: YamlDiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldLine = 1;
  let newLine = 1;
  let added = 0;
  let removed = 0;

  while (i < n && j < m) {
    if (original[i] === modified[j]) {
      lines.push({
        kind: "context",
        oldLine,
        newLine,
        text: original[i],
      });
      i += 1;
      j += 1;
      oldLine += 1;
      newLine += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ kind: "removed", oldLine, text: original[i] });
      i += 1;
      oldLine += 1;
      removed += 1;
    } else {
      lines.push({ kind: "added", newLine, text: modified[j] });
      j += 1;
      newLine += 1;
      added += 1;
    }
  }

  while (i < n) {
    lines.push({ kind: "removed", oldLine, text: original[i] });
    i += 1;
    oldLine += 1;
    removed += 1;
  }
  while (j < m) {
    lines.push({ kind: "added", newLine, text: modified[j] });
    j += 1;
    newLine += 1;
    added += 1;
  }

  return {
    lines,
    added,
    removed,
    changed: Math.min(added, removed),
    hasChanges: added > 0 || removed > 0,
  };
}
