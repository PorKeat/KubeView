export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window === "undefined") return;

  const tauriWindow = window as unknown as {
    __TAURI_INTERNALS__?: unknown;
  };

  if (tauriWindow.__TAURI_INTERNALS__) {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    } catch (error) {
      console.warn(
        "[KubeView] Native link opener unavailable, falling back to browser:",
        error,
      );
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
