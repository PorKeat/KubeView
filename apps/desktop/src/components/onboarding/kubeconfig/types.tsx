import * as React from "react";
import type { ClusterContextInfo } from "@/stores/clusterStore";

export interface DiscoveredConfigFile {
  id: string;
  name: string;
  relativePath: string;
  sizeBytes: number;
  rawYaml: string;
  contexts: string[];
  isValid: boolean;
  selected: boolean;
}

export function getProviderBadge(provider: ClusterContextInfo["provider"]) {
  switch (provider) {
    case "kind":
      return (
        <span className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
          Kind
        </span>
      );
    case "eks":
      return (
        <span className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
          AWS EKS
        </span>
      );
    case "gke":
      return (
        <span className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
          GCP GKE
        </span>
      );
    case "aks":
      return (
        <span className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
          Azure AKS
        </span>
      );
    case "minikube":
      return (
        <span className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
          Minikube
        </span>
      );
    default:
      return (
        <span className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-[var(--surface-active)] text-[var(--foreground)] border border-[var(--border)]">
          K8s
        </span>
      );
  }
}

export function extractContexts(yamlText: string): string[] {
  if (!yamlText) return [];
  try {
    const contextsBlock = yamlText.split(/contexts:/)[1];
    if (!contextsBlock) return [];
    const blockContent = contextsBlock.split(/^[a-zA-Z0-9_-]+:/m)[0];
    const matches = blockContent.match(/-\s*name:\s*([^\s\n\r]+)/g);
    if (!matches) return [];
    return matches.map((m) =>
      m
        .replace(/-\s*name:\s*/, "")
        .replace(/['"]/g, "")
        .trim(),
    );
  } catch {
    return [];
  }
}

export async function scanFilesFromDrop(
  dataTransfer: DataTransfer,
): Promise<{ file: File; path: string }[]> {
  const results: { file: File; path: string }[] = [];
  const items = Array.from(dataTransfer.items || []);

  interface FileSystemEntryLike {
    isFile: boolean;
    isDirectory: boolean;
    name: string;
    file?: (
      success: (file: File) => void,
      error: (err: unknown) => void,
    ) => void;
    createReader?: () => {
      readEntries: (
        success: (entries: FileSystemEntryLike[]) => void,
        error: (err: unknown) => void,
      ) => void;
    };
  }

  async function traverseEntry(
    entry: FileSystemEntryLike | null,
    currentPath = "",
  ): Promise<void> {
    if (!entry) return;
    if (entry.isFile && entry.file) {
      const file = await new Promise<File>((resolve, reject) => {
        entry.file?.(resolve, reject);
      });
      results.push({
        file,
        path: currentPath ? `${currentPath}/${file.name}` : file.name,
      });
    } else if (entry.isDirectory && entry.createReader) {
      const dirReader = entry.createReader();
      const entries = await new Promise<FileSystemEntryLike[]>(
        (resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        },
      );
      for (const child of entries) {
        await traverseEntry(
          child,
          currentPath ? `${currentPath}/${entry.name}` : entry.name,
        );
      }
    }
  }

  const entries = items
    .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
    .filter((entry): entry is FileSystemEntry => Boolean(entry));

  if (entries.length > 0) {
    for (const entry of entries) {
      await traverseEntry(entry);
    }
  } else if (dataTransfer.files) {
    for (const f of Array.from(dataTransfer.files)) {
      results.push({ file: f, path: f.name });
    }
  }

  return results;
}
