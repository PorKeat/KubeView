import { isTauri } from "@/lib/ipc";

export interface SaveTextFileOptions {
  defaultPath: string;
  mimeType?: string;
  filters?: { name: string; extensions: string[] }[];
}

/**
 * Save text through the native Tauri dialog when running as a desktop app.
 * Browser preview keeps the normal blob-download fallback.
 * Returns false when the user cancels the save dialog.
 */
export async function saveTextFile(
  contents: string,
  options: SaveTextFileOptions,
): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      defaultPath: options.defaultPath,
      filters: options.filters,
    });
    if (!path) return false;

    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_text_file", { path, contents });
    return true;
  }

  const blob = new Blob([contents], {
    type: options.mimeType ?? "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = options.defaultPath;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
