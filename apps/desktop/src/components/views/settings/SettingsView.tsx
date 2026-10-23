"use client";

import * as React from "react";
import {
  Accessibility,
  Check,
  Keyboard,
  Monitor,
  Moon,
  RotateCcw,
  Rows3,
  Settings,
  ShieldCheck,
  Sun,
  Timer,
  Type,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClusterStore } from "@/stores/clusterStore";
import {
  useSettingsStore,
  type FontSizePreference,
  type PageSizePreference,
} from "@/stores/settingsStore";

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
  const { theme, setTheme } = useTheme();
  const {
    fontSize,
    setFontSize,
    defaultPageSize,
    setDefaultPageSize,
    autoRefreshSeconds,
    setAutoRefreshSeconds,
    reducedMotion,
    setReducedMotion,
  } = useSettingsStore();
  const { currentContext, currentNamespace, connectionStatus } =
    useClusterStore();

  const activeTheme: ThemePreference =
    theme === "light" || theme === "dark" ? theme : "system";
  const namespaceLabel =
    currentNamespace === "all" ? "All namespaces" : currentNamespace;
  const statusLabel =
    connectionStatus === "connected"
      ? "Connected"
      : connectionStatus === "degraded"
        ? "Degraded"
        : connectionStatus === "checking"
          ? "Checking"
          : "Offline";

  const scrollToSection = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      <div className="flex-1 overflow-y-auto modern-scrollbar">
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)] shadow-2xs">
                <Settings className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Workspace preferences
                </p>
                <h1 className="mt-0.5 text-lg font-bold tracking-tight text-[var(--foreground)]">
                  Settings &amp; Preferences
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)]">
                  Tune the interface, data refresh behavior, and table defaults
                  for this device.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              Saved locally
            </span>
          </header>

          <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-start">
            <aside className="space-y-3 xl:sticky xl:top-6">
              <nav
                aria-label="Settings sections"
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xs"
              >
                <p className="px-2 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  On this page
                </p>
                <SettingsNavButton
                  icon={Monitor}
                  label="Appearance"
                  description="Theme, text, motion"
                  onClick={() => scrollToSection("settings-appearance")}
                />
                <SettingsNavButton
                  icon={Timer}
                  label="Data & Refresh"
                  description="Polling and table rows"
                  onClick={() => scrollToSection("settings-data-refresh")}
                />
                <SettingsNavButton
                  icon={Keyboard}
                  label="Shortcuts"
                  description="Keyboard reference"
                  onClick={() => scrollToSection("settings-shortcuts")}
                />
              </nav>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-2xs">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Current workspace
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      connectionStatus === "connected" && "bg-emerald-500",
                      connectionStatus === "degraded" && "bg-amber-500",
                      connectionStatus === "checking" && "bg-sky-500 animate-pulse",
                      connectionStatus === "offline" && "bg-rose-500",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate font-mono text-[11px] font-medium text-[var(--foreground)]">
                    {currentContext || "No context selected"}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
                  <span>Namespace</span>
                  <span className="truncate font-mono text-[var(--foreground)]">
                    {namespaceLabel}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
                  <span>Connection</span>
                  <span className="font-mono text-[var(--foreground)]">
                    {statusLabel}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                data-testid="settings-reset"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[11px] font-medium text-[var(--muted)] shadow-2xs transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset to defaults
              </button>
            </aside>

            <div className="min-w-0 space-y-5">
              <SettingsSectionCard
                id="settings-appearance"
                icon={Monitor}
                title="Appearance"
                description="Choose the palette, text scale, and motion level that feel right on this display."
              >
                <div>
                  <SettingsHeading
                    icon={Sun}
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
                    icon={Type}
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

                <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-black/[0.02] p-3.5 sm:flex-row sm:items-center sm:justify-between dark:bg-white/[0.02]">
                  <div className="flex min-w-0 items-start gap-3">
                    <Accessibility className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
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

              <SettingsSectionCard
                id="settings-data-refresh"
                icon={Timer}
                title="Data & Refresh"
                description="Control how often cluster data is fetched and how many rows tables start with."
              >
                <div>
                  <SettingsHeading
                    icon={Timer}
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
                    icon={Rows3}
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

                <p className="rounded-xl border border-[var(--border)]/70 bg-black/[0.02] px-3 py-2.5 text-[10px] leading-relaxed text-[var(--muted)] dark:bg-white/[0.02]">
                  Auto-refresh applies to the active view. Manual refresh and
                  live connection diagnostics remain available in the header.
                </p>
              </SettingsSectionCard>

              <section
                id="settings-shortcuts"
                className="scroll-mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs"
              >
                <div className="flex items-start gap-2.5 border-b border-[var(--border)] px-4 py-4 sm:px-5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-black/[0.03] text-[var(--muted)] dark:bg-white/[0.04]">
                    <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-xs font-semibold text-[var(--foreground)]">
                      Keyboard shortcuts
                    </h2>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
                      Useful shortcuts for moving around KubeView.
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-[var(--border)]/60">
                  <ShortcutRow keys={["⌘", "K"]} label="Open command palette" />
                  <ShortcutRow keys={["⌘", ","]} label="Open settings" />
                  <ShortcutRow keys={["Esc"]} label="Dismiss the topmost overlay" />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsNavButton({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-hover)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden"
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-[11px] font-medium text-[var(--foreground)]">
          {label}
        </span>
        <span className="block text-[9px] text-[var(--muted)]">{description}</span>
      </span>
    </button>
  );
}

function SettingsSectionCard({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs"
    >
      <div className="flex items-start gap-2.5 border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-black/[0.03] text-[var(--muted)] dark:bg-white/[0.04]">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xs font-semibold text-[var(--foreground)]">{title}</h2>
          <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        </div>
      </div>
      <div className="space-y-5 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function SettingsHeading({
  icon: Icon,
  label,
  description,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
      <div>
        <p className="text-[11px] font-semibold text-[var(--foreground)]">{label}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[11px] sm:px-5">
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
