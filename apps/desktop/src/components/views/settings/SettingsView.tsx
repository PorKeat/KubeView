"use client";

import * as React from "react";
import {
  Accessibility,
  Check,
  Keyboard,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  Timer,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useSettingsStore,
  type FontSizePreference,
  type PageSizePreference,
} from "@/stores/settingsStore";
import { LearningSettingsPanel } from "./components/LearningSettingsPanel";
import {
  SettingsHeading,
  SettingsSectionCard,
} from "./components/SettingsSectionCard";

type ThemePreference = "system" | "light" | "dark";

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: React.ElementType;
}> = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const FONT_SIZE_OPTIONS: Array<{
  value: FontSizePreference;
  label: string;
  hint: string;
  previewPx: number;
}> = [
  { value: "sm", label: "Small", hint: "14px base", previewPx: 14 },
  { value: "md", label: "Default", hint: "16px base", previewPx: 16 },
  { value: "lg", label: "Large", hint: "18px base", previewPx: 18 },
  { value: "xl", label: "Extra large", hint: "20px base", previewPx: 20 },
];

const REFRESH_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 5, label: "5 sec" },
  { value: 10, label: "10 sec" },
  { value: 30, label: "30 sec" },
  { value: 60, label: "60 sec" },
];

const PAGE_SIZE_OPTIONS: Array<{
  value: PageSizePreference;
  label: string;
}> = [
  { value: 50, label: "50 rows" },
  { value: 100, label: "100 rows" },
  { value: 250, label: "250 rows" },
];

export function SettingsView() {
  const { setTheme } = useTheme();
  const activeSection = useSettingsStore((state) => state.activeSection);
  const {
    setFontSize,
    setDefaultPageSize,
    setAutoRefreshSeconds,
    setReducedMotion,
  } = useSettingsStore();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeSection]);

  const handleReset = () => {
    setFontSize("md");
    setDefaultPageSize(50);
    setAutoRefreshSeconds(0);
    setReducedMotion(false);
    setTheme("system");
    toast.success("Preferences restored to defaults");
  };

  return (
    <div
      data-testid="settings-view"
      className="flex-1 flex flex-col h-full overflow-hidden select-none"
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto modern-scrollbar">
        <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
          <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                Settings &amp; Preferences
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)]">
                Personalize KubeView for this device. Changes save
                automatically.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--muted)] shadow-2xs">
                <ShieldCheck
                  className="h-3.5 w-3.5 text-emerald-500"
                  aria-hidden="true"
                />
                Saved locally
              </span>
              <button
                type="button"
                onClick={handleReset}
                data-testid="settings-reset"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] shadow-2xs transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset to defaults
              </button>
            </div>
          </header>

          {activeSection === "appearance" && <AppearancePanel />}
          {activeSection === "data-refresh" && <DataRefreshPanel />}
          {activeSection === "learning" && <LearningSettingsPanel />}
          {activeSection === "shortcuts" && <ShortcutsPanel />}
        </div>
      </div>
    </div>
  );
}

function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize, reducedMotion, setReducedMotion } =
    useSettingsStore();
  const activeTheme: ThemePreference =
    theme === "light" || theme === "dark" ? theme : "system";

  return (
    <SettingsSectionCard
      id="settings-appearance"
      icon={Monitor}
      title="Appearance"
      description="Choose the palette, text scale, and motion level that feel right on this display."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <SettingsHeading
            label="Theme"
            description="Match your environment or keep a fixed light or dark palette."
          />
          <div
            className="mt-3 grid grid-cols-3 gap-2"
            role="group"
            aria-label="Theme"
          >
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = activeTheme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  data-testid={`settings-theme-${option.value}`}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "relative flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-[11px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                    isActive
                      ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--foreground)] shadow-2xs"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]/35 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
                  )}
                >
                  {isActive && (
                    <Check
                      className="absolute right-2 top-2 h-3 w-3 text-[var(--accent)]"
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <SettingsHeading
            label="Font size"
            description="Scales text and interface spacing across every view."
          />
          <div
            className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="group"
            aria-label="Font size"
          >
            {FONT_SIZE_OPTIONS.map((option) => {
              const isActive = fontSize === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`${option.label} font size, ${option.hint}`}
                  data-testid={`settings-font-${option.value}`}
                  onClick={() => setFontSize(option.value)}
                  className={cn(
                    "relative flex min-h-[78px] flex-col items-center justify-center rounded-xl border px-1 py-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                    isActive
                      ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--foreground)] shadow-2xs"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]/35 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
                  )}
                >
                  {isActive && (
                    <Check
                      className="absolute right-2 top-2 h-3 w-3 text-[var(--accent)]"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className="font-semibold leading-none text-[var(--foreground)]"
                    style={{ fontSize: option.previewPx }}
                    aria-hidden="true"
                  >
                    Aa
                  </span>
                  <span className="mt-1 text-[10px] font-medium">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-black/[0.02] p-3.5 sm:flex-row sm:items-center sm:justify-between dark:bg-white/[0.02]">
        <div className="flex min-w-0 items-start gap-3">
          <Accessibility
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]"
            aria-hidden="true"
          />
          <div>
            <p className="text-[11px] font-semibold text-[var(--foreground)]">
              Reduce motion
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
              Disable animated transitions and decorative motion.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={reducedMotion}
          aria-label="Reduce motion"
          data-testid="settings-reduced-motion"
          onClick={() => setReducedMotion(!reducedMotion)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
            reducedMotion
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[var(--border)] bg-black/10 dark:bg-white/10",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
              reducedMotion ? "translate-x-[22px]" : "translate-x-[3px]",
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    </SettingsSectionCard>
  );
}

function DataRefreshPanel() {
  const {
    autoRefreshSeconds,
    setAutoRefreshSeconds,
    defaultPageSize,
    setDefaultPageSize,
  } = useSettingsStore();

  return (
    <SettingsSectionCard
      id="settings-data-refresh"
      icon={Timer}
      title="Data & Refresh"
      description="Control how often cluster data is fetched and how many rows tables start with."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <SettingsHeading
            label="Auto-refresh"
            description="Refresh the active workload, pod, or overview view on a timer. Off disables background polling."
          />
          <div
            className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5"
            role="group"
            aria-label="Auto-refresh interval"
          >
            {REFRESH_OPTIONS.map((option) => {
              const isActive = autoRefreshSeconds === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  data-testid={`settings-refresh-${option.value}`}
                  onClick={() => setAutoRefreshSeconds(option.value)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-[11px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                    isActive
                      ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--foreground)] shadow-2xs"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]/35 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <SettingsHeading
            label="Default page size"
            description="Starting number of rows in workload and pod tables. You can still override it in each table footer."
          />
          <div
            className="mt-3 grid grid-cols-3 gap-2"
            role="group"
            aria-label="Default page size"
          >
            {PAGE_SIZE_OPTIONS.map((option) => {
              const isActive = defaultPageSize === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  data-testid={`settings-page-size-${option.value}`}
                  onClick={() => setDefaultPageSize(option.value)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-[11px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                    isActive
                      ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--foreground)] shadow-2xs"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]/35 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="rounded-xl border border-[var(--border)]/70 bg-black/[0.02] px-3 py-2.5 text-[10px] leading-relaxed text-[var(--muted)] dark:bg-white/[0.02]">
        Auto-refresh applies to the active view. Manual refresh and live
        connection diagnostics remain available in the header.
      </p>
    </SettingsSectionCard>
  );
}

function ShortcutsPanel() {
  return (
    <SettingsSectionCard
      id="settings-shortcuts"
      icon={Keyboard}
      title="Keyboard shortcuts"
      description="Useful shortcuts for moving around KubeView."
    >
      <div className="grid grid-cols-1 divide-y divide-[var(--border)]/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <ShortcutRow keys={["⌘", "K"]} label="Command palette" />
        <ShortcutRow keys={["⌘", ","]} label="Settings" />
        <ShortcutRow keys={["Esc"]} label="Dismiss overlay" />
      </div>
    </SettingsSectionCard>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-[11px] first:pt-0 last:pb-0 sm:px-5">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="flex shrink-0 items-center gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="inline-flex min-w-5 items-center justify-center rounded border border-[var(--border)] bg-black/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground)] dark:bg-white/[0.06]"
          >
            {key}
          </kbd>
        ))}
      </span>
    </div>
  );
}
