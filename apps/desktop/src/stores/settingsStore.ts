import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FontSizePreference = "sm" | "md" | "lg" | "xl";
export type PageSizePreference = 50 | 100 | 250;
export type SettingsSection =
  "appearance" | "data-refresh" | "learning" | "shortcuts";

export interface SettingsState {
  activeSection: SettingsSection;
  fontSize: FontSizePreference;
  defaultPageSize: PageSizePreference;
  autoRefreshSeconds: number;
  reducedMotion: boolean;
  setActiveSection: (section: SettingsSection) => void;
  setFontSize: (fontSize: FontSizePreference) => void;
  setDefaultPageSize: (pageSize: PageSizePreference) => void;
  setAutoRefreshSeconds: (seconds: number) => void;
  setReducedMotion: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activeSection: "appearance",
      fontSize: "md",
      defaultPageSize: 50,
      autoRefreshSeconds: 0,
      reducedMotion: false,
      setActiveSection: (activeSection) => set({ activeSection }),
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
