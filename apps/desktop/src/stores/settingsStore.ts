import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FontSizePreference = "sm" | "md" | "lg" | "xl";
export type PageSizePreference = 50 | 100 | 250;
export type DensityPreference = "comfortable" | "compact";
export type AccentPreference = "orange" | "blue" | "emerald" | "violet";
export type StatusPalettePreference = "standard" | "colorblind";
export type MonoSizePreference = "sm" | "md" | "lg";
export type StartupPagePreference = "overview" | "fleet" | "learning";
export type LogTailPreference = 100 | 500 | 1000;
export type LogFontSizePreference = "sm" | "md" | "lg";
export type SettingsSection =
  | "general"
  | "safety"
  | "appearance"
  | "data-refresh"
  | "notifications"
  | "terminal"
  | "integrations"
  | "advanced"
  | "learning"
  | "shortcuts";

export interface SettingsPreferences {
  fontSize: FontSizePreference;
  defaultPageSize: PageSizePreference;
  autoRefreshSeconds: number;
  reducedMotion: boolean;
  startupPage: StartupPagePreference;
  showClusterRail: boolean;
  sidebarDefaultCollapsed: boolean;
  readOnlyMode: boolean;
  disableExec: boolean;
  protectProduction: boolean;
  protectedContexts: string[];
  pauseWhenHidden: boolean;
  refreshOnFocus: boolean;
  desktopNotifications: boolean;
  notifyWarningsOnly: boolean;
  notificationSound: boolean;
  defaultShell: string;
  logTailLines: LogTailPreference;
  logFontSize: LogFontSizePreference;
  logTimestamps: boolean;
  logWrap: boolean;
  copyOnSelect: boolean;
  confirmExec: boolean;
  density: DensityPreference;
  accent: AccentPreference;
  statusPalette: StatusPalettePreference;
  highContrast: boolean;
  monoFontSize: MonoSizePreference;
  defaultGitOpsPath: string;
  externalEditorCommand: string;
  requestTimeoutSeconds: number;
  experimentalFeatures: boolean;
}

export const DEFAULT_PREFERENCES: SettingsPreferences = {
  fontSize: "md",
  defaultPageSize: 50,
  autoRefreshSeconds: 0,
  reducedMotion: false,
  startupPage: "overview",
  showClusterRail: true,
  sidebarDefaultCollapsed: false,
  readOnlyMode: false,
  disableExec: false,
  protectProduction: false,
  protectedContexts: [],
  pauseWhenHidden: false,
  refreshOnFocus: false,
  desktopNotifications: false,
  notifyWarningsOnly: true,
  notificationSound: false,
  defaultShell: "auto",
  logTailLines: 500,
  logFontSize: "md",
  logTimestamps: true,
  logWrap: true,
  copyOnSelect: false,
  confirmExec: true,
  density: "comfortable",
  accent: "orange",
  statusPalette: "standard",
  highContrast: false,
  monoFontSize: "md",
  defaultGitOpsPath: "",
  externalEditorCommand: "",
  requestTimeoutSeconds: 30,
  experimentalFeatures: false,
};

interface SettingsState extends SettingsPreferences {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
  setFontSize: (fontSize: FontSizePreference) => void;
  setDefaultPageSize: (pageSize: PageSizePreference) => void;
  setAutoRefreshSeconds: (seconds: number) => void;
  setReducedMotion: (enabled: boolean) => void;
  updatePreferences: (patch: Partial<SettingsPreferences>) => void;
  toggleProtectedContext: (contextName: string) => void;
  resetPreferences: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      activeSection: "appearance",
      setActiveSection: (activeSection) => set({ activeSection }),
      setFontSize: (fontSize) => set({ fontSize }),
      setDefaultPageSize: (defaultPageSize) => set({ defaultPageSize }),
      setAutoRefreshSeconds: (autoRefreshSeconds) =>
        set({ autoRefreshSeconds }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      updatePreferences: (patch) => set(patch),
      toggleProtectedContext: (contextName) =>
        set((state) => ({
          protectedContexts: state.protectedContexts.includes(contextName)
            ? state.protectedContexts.filter((name) => name !== contextName)
            : [...state.protectedContexts, contextName],
        })),
      resetPreferences: () => set(DEFAULT_PREFERENCES),
    }),
    {
      name: "kubeview-preferences",
      partialize: (state) => {
        const { activeSection, ...preferences } = state;
        void activeSection;
        return preferences;
      },
    },
  ),
);
