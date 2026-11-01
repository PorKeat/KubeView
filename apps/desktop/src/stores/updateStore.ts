import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import type { Update } from "@tauri-apps/plugin-updater";
import { isTauri } from "@/lib/ipc";

export type UpdatePhase =
  | "idle"
  | "unsupported"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "ready"
  | "error";

export interface AvailableUpdate {
  version: string;
  currentVersion: string;
  notes?: string;
  date?: string;
}

interface UpdateState {
  phase: UpdatePhase;
  info: AvailableUpdate | null;
  downloadedBytes: number;
  totalBytes: number | null;
  error: string | null;
  lastCheckedAt: string | null;
  dismissedVersion: string | null;
  checkForUpdates: (manual?: boolean) => Promise<void>;
  installUpdate: () => Promise<void>;
  restartApp: () => Promise<void>;
  dismiss: () => void;
}

let pendingUpdate: Update | null = null;
let inFlightCheck: Promise<void> | null = null;

function messageFor(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Update failed.";
}

async function releasePendingUpdate(): Promise<void> {
  if (!pendingUpdate) return;
  try {
    await pendingUpdate.close();
  } catch {
    // The update resource may already be released after an install.
  }
  pendingUpdate = null;
}

export const useUpdateStore = create<UpdateState>()(
  persist(
    (set, get) => ({
      phase: "idle",
      info: null,
      downloadedBytes: 0,
      totalBytes: null,
      error: null,
      lastCheckedAt: null,
      dismissedVersion: null,

      checkForUpdates: async (manual = false) => {
        if (!isTauri()) {
          set({ phase: "unsupported", error: null });
          if (manual) {
            toast.info(
              "Automatic updates are available in the installed desktop app.",
            );
          }
          return;
        }

        if (inFlightCheck) return inFlightCheck;
        if (
          get().phase === "downloading" ||
          get().phase === "installing" ||
          (!manual && (get().phase === "available" || get().phase === "ready"))
        ) {
          return;
        }

        const run = (async () => {
          set({ phase: "checking", error: null });
          try {
            const updater = await import("@tauri-apps/plugin-updater");
            await releasePendingUpdate();
            const update = await updater.check({ timeout: 20_000 });
            const checkedAt = new Date().toISOString();

            if (!update) {
              set({
                phase: "idle",
                info: null,
                lastCheckedAt: checkedAt,
                error: null,
              });
              if (manual) toast.success("KubeView is up to date.");
              return;
            }

            pendingUpdate = update;
            const info: AvailableUpdate = {
              version: update.version,
              currentVersion: update.currentVersion,
              notes: update.body,
              date: update.date,
            };
            set({
              phase: "available",
              info,
              lastCheckedAt: checkedAt,
              error: null,
            });

            if (manual || get().dismissedVersion !== update.version) {
              toast.info(`KubeView ${update.version} is available`, {
                description: "The signed update is ready to install.",
                duration: 12_000,
                action: {
                  label: "Update now",
                  onClick: () => void get().installUpdate(),
                },
              });
            }
          } catch (error) {
            const message = messageFor(error);
            set({ phase: "error", error: message });
            if (manual) toast.error(`Update check failed: ${message}`);
          } finally {
            inFlightCheck = null;
          }
        })();

        inFlightCheck = run;
        return run;
      },

      installUpdate: async () => {
        const phase = get().phase;
        if (
          phase === "downloading" ||
          phase === "installing" ||
          phase === "ready"
        ) {
          return;
        }
        let update = pendingUpdate;
        if (!update) {
          await get().checkForUpdates(true);
          update = pendingUpdate;
          if (!update) return;
        }

        set({
          phase: "downloading",
          downloadedBytes: 0,
          totalBytes: null,
          error: null,
        });

        try {
          await update.downloadAndInstall(
            (event) => {
              if (event.event === "Started") {
                set({
                  totalBytes: event.data.contentLength ?? null,
                  downloadedBytes: 0,
                });
              } else if (event.event === "Progress") {
                set((state) => ({
                  downloadedBytes:
                    state.downloadedBytes + event.data.chunkLength,
                }));
              } else if (event.event === "Finished") {
                set({ phase: "installing" });
              }
            },
            { timeout: 10 * 60_000, restartAfterInstall: true },
          );

          set({ phase: "ready", error: null });
          toast.success("Update installed. Restarting KubeView...");
          try {
            const { relaunch } = await import("@tauri-apps/plugin-process");
            await relaunch();
          } catch (restartError) {
            set({
              phase: "ready",
              error: `Update installed, but restart failed: ${messageFor(
                restartError,
              )}`,
            });
          }
        } catch (error) {
          set({ phase: "error", error: messageFor(error) });
          toast.error(`Update failed: ${messageFor(error)}`);
        }
      },

      restartApp: async () => {
        try {
          const { relaunch } = await import("@tauri-apps/plugin-process");
          await relaunch();
        } catch (error) {
          set({ error: `Could not restart KubeView: ${messageFor(error)}` });
        }
      },

      dismiss: () => {
        const version = get().info?.version;
        if (!version) return;
        set({ dismissedVersion: version });
      },
    }),
    {
      name: "kubeview-updates",
      skipHydration: true,
      partialize: (state) => ({
        lastCheckedAt: state.lastCheckedAt,
        dismissedVersion: state.dismissedVersion,
      }),
    },
  ),
);
