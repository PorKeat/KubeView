import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FontSizePreference = "sm" | "md" | "lg" | "xl";
export type PageSizePreference = 50 | 100 | 250;

export interface SettingsState {
  fontSize: FontSizePreference;
  defaultPageSize: PageSizePreference;
  autoRefreshSeconds: number;
  reducedMotion: boolean;
  setFontSize: (fontSize: FontSizePreference) => void;
  setDefaultPageSize: (pageSize: PageSizePreference) => void;
  setAutoRefreshSeconds: (seconds: number) => void;
  setReducedMotion: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: "md",
      defaultPageSize: 50,
      autoRefreshSeconds: 0,
      reducedMotion: false,
      setFontSize: (fontSize) => set({ fontSize }),
      setDefaultPageSize: (defaultPageSize) => set({ defaultPageSize }),
      setAutoRefreshSeconds: (autoRefreshSeconds) =>
        set({ autoRefreshSeconds }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: "kubeview-preferences",
      partialize: (state) => ({
        fontSize: state.fontSize,
        defaultPageSize: state.defaultPageSize,
        autoRefreshSeconds: state.autoRefreshSeconds,
        reducedMotion: state.reducedMotion,
      }),
    },
  ),
);
