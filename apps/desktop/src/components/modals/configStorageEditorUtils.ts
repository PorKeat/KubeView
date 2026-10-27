import type { SecretEditEntry } from "@kubeview/contracts";

export interface EditableEntry {
  id: string;
  key: string;
  value: string;
  binary: boolean;
}

const KEY_PATTERN = /^[-._a-zA-Z0-9]+$/;
const MAX_SIZE = 1 << 20;

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makeEntry(key = "", value = "", binary = false): EditableEntry {
  return { id: makeId(), key, value, binary };
}

export function entriesFromMap(data: Record<string, string>): EditableEntry[] {
  return Object.entries(data)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => makeEntry(key, value));
}

export function entriesFromSecret(entries: SecretEditEntry[]): EditableEntry[] {
  return [...entries]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((entry) => makeEntry(entry.key, entry.value, entry.binary));
}

function valueBytes(entry: EditableEntry): number {
  if (!entry.binary) return new TextEncoder().encode(entry.value).length;
  try {
    return atob(entry.value).length;
  } catch {
    return -1;
  }
}

export function validateEntries(
  entries: EditableEntry[],
  binaryData: Record<string, string>,
): string | null {
  const keys = new Set<string>();
  let total = 0;
  for (const entry of entries) {
    const key = entry.key.trim();
    if (!key) return "Every data entry needs a key.";
    if (!KEY_PATTERN.test(key)) {
      return `Key "${key}" may only contain letters, numbers, dots, dashes, and underscores.`;
    }
    if (keys.has(key)) return `Duplicate key "${key}".`;
    keys.add(key);
    const bytes = valueBytes(entry);
    if (bytes < 0) return `Value for "${key}" is not valid base64.`;
    total += key.length + bytes;
  }
  for (const [key, value] of Object.entries(binaryData)) {
    try {
      total += key.length + atob(value).length;
    } catch {
      return `Binary data for "${key}" is invalid.`;
    }
  }
  if (total > MAX_SIZE) {
    return "Data is larger than the Kubernetes 1 MiB limit.";
  }
  return null;
}
