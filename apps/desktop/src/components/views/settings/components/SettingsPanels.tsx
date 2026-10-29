"use client";

import * as React from "react";
import {
  Bell,
  Copy,
  Home,
  Plug,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useClusterStore } from "@/stores/clusterStore";
import { useHelmStore } from "@/stores/helmStore";
import {
  useSettingsStore,
  DEFAULT_PREFERENCES,
  type SettingsPreferences,
} from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import {
  SettingsHeading,
  SettingsSectionCard,
  SettingsToggleRow,
} from "./SettingsSectionCard";

export function ChoiceGroup<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange,
  testIdPrefix,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  testIdPrefix: string;
}) {
  return (
    <div>
      <SettingsHeading label={label} description={description ?? ""} />
      <div
        role="group"
        aria-label={label}
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={active}
              data-testid={`${testIdPrefix}-${option.value}`}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-xl border px-2 py-2 text-[11px] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-hidden",
                active
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
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-[var(--border)]/70 bg-black/[0.02] px-3 py-2.5 text-[10px] leading-relaxed text-[var(--muted)] dark:bg-white/[0.02]">
      {children}
    </p>
  );
}

function TextField({
  label,
  value,
  placeholder,
  testId,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  testId: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-medium text-[var(--muted)]">
        {label}
      </span>
      <input
        type="text"
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border)] bg-black/[0.03] px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] outline-hidden placeholder:text-[var(--muted)] focus:border-[var(--accent)] dark:bg-black/30"
      />
    </label>
  );
}

export function GeneralSettingsPanel() {
  const {
    startupPage,
    showClusterRail,
    sidebarDefaultCollapsed,
    updatePreferences,
  } = useSettingsStore();

  return (
    <SettingsSectionCard
      id="settings-general"
      icon={Home}
      title="General"
      description="Choose what opens first and how the workspace is laid out."
    >
      <ChoiceGroup
        label="Startup page"
        description="The first workspace opened when KubeView starts."
        value={startupPage}
        options={[
          { value: "overview", label: "Overview" },
          { value: "fleet", label: "All Clusters" },
          { value: "learning", label: "Learning" },
        ]}
        onChange={(value) => updatePreferences({ startupPage: value })}
        testIdPrefix="settings-startup"
      />
      <SettingsToggleRow
        icon={Home}
        title="Show cluster rail"
        description="Keep the far-left cluster rail visible on desktop."
        checked={showClusterRail}
        onToggle={() =>
          updatePreferences({ showClusterRail: !showClusterRail })
        }
        testId="settings-show-rail"
      />
      <SettingsToggleRow
        icon={SlidersHorizontal}
        title="Collapse sidebar on launch"
        description="Start with the resource/catalog sidebar collapsed."
        checked={sidebarDefaultCollapsed}
        onToggle={() =>
          updatePreferences({
            sidebarDefaultCollapsed: !sidebarDefaultCollapsed,
          })
        }
        testId="settings-sidebar-collapsed"
      />
      <Note>
        Startup preferences are applied once per app launch. Existing tabs stay
        open when you switch pages.
      </Note>
    </SettingsSectionCard>
  );
}

export function SafetySettingsPanel() {
  const {
    readOnlyMode,
    disableExec,
    protectProduction,
    protectedContexts,
    updatePreferences,
    toggleProtectedContext,
  } = useSettingsStore();
  const contexts = useClusterStore((state) => state.availableContexts);

  return (
    <SettingsSectionCard
      id="settings-safety"
      icon={ShieldCheck}
      title="Safety & Guardrails"
      description="Prevent accidental changes when working against sensitive clusters."
    >
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-[11px] leading-relaxed text-[var(--foreground)]">
        Guardrails apply to the next mutating request. They do not modify
        Kubernetes RBAC.
      </div>
      <SettingsToggleRow
        icon={ShieldCheck}
        title="Global read-only mode"
        description="Block apply, delete, scale, restart, suspend, and exec mutations for every context."
        checked={readOnlyMode}
        onToggle={() => updatePreferences({ readOnlyMode: !readOnlyMode })}
        testId="settings-read-only"
      />
      <SettingsToggleRow
        icon={Terminal}
        title="Disable pod exec"
        description="Keep logs and diagnostics available while blocking interactive shells."
        checked={disableExec}
        onToggle={() => updatePreferences({ disableExec: !disableExec })}
        testId="settings-disable-exec"
      />
      <SettingsToggleRow
        icon={ShieldCheck}
        title="Protect production contexts"
        description="Contexts containing prod in their name are treated as protected."
        checked={protectProduction}
        onToggle={() =>
          updatePreferences({ protectProduction: !protectProduction })
        }
        testId="settings-protect-production"
      />
      <div>
        <SettingsHeading
          label="Protected contexts"
          description="Mutations are blocked for the selected kubeconfig contexts."
        />
        <div className="mt-3 space-y-1.5">
          {contexts.length === 0 ? (
            <p className="text-[10px] text-[var(--muted)]">
              No kubeconfig contexts are loaded.
            </p>
          ) : (
            contexts.map((context) => {
              const checked = protectedContexts.includes(context.name);
              return (
                <button
                  key={context.name}
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  data-testid={`settings-protect-${context.name}`}
                  onClick={() => toggleProtectedContext(context.name)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[11px] text-[var(--foreground)]">
                      {context.name}
                    </span>
                    <span className="block truncate font-mono text-[9px] text-[var(--muted)]">
                      {context.cluster}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
                      checked
                        ? "border-[var(--accent)] bg-[var(--accent)]"
                        : "border-[var(--border)] bg-black/10 dark:bg-white/10",
                    )}
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
                        checked ? "translate-x-[19px]" : "translate-x-[2px]",
                      )}
                    />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </SettingsSectionCard>
  );
}

export function NotificationsSettingsPanel() {
  const {
    desktopNotifications,
    notifyWarningsOnly,
    notificationSound,
    updatePreferences,
  } = useSettingsStore();
  const toggleDesktop = async () => {
    const next = !desktopNotifications;
    if (next && typeof Notification !== "undefined") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Desktop notification permission was not granted.");
        return;
      }
    }
    updatePreferences({ desktopNotifications: next });
  };

  const sendTest = () => {
    if (typeof Notification === "undefined") {
      toast.error("Desktop notifications are not available here.");
      return;
    }
    if (Notification.permission !== "granted") {
      toast.error("Enable desktop notifications first.");
      return;
    }
    new Notification("KubeView", {
      body: "Desktop notifications are working.",
    });
  };

  return (
    <SettingsSectionCard
      id="settings-notifications"
      icon={Bell}
      title="Notifications"
      description="Choose which cluster events deserve your attention."
    >
      <SettingsToggleRow
        icon={Bell}
        title="Desktop notifications"
        description="Show native notifications for cluster events while KubeView is open."
        checked={desktopNotifications}
        onToggle={() => void toggleDesktop()}
        testId="settings-desktop-notifications"
      />
      <SettingsToggleRow
        icon={Bell}
        title="Warnings only"
        description="Suppress informational notices and surface warning events."
        checked={notifyWarningsOnly}
        onToggle={() =>
          updatePreferences({ notifyWarningsOnly: !notifyWarningsOnly })
        }
        testId="settings-warning-only"
      />
      <SettingsToggleRow
        icon={Bell}
        title="Notification sound"
        description="Play a short sound when a desktop notification arrives."
        checked={notificationSound}
        onToggle={() =>
          updatePreferences({ notificationSound: !notificationSound })
        }
        testId="settings-notification-sound"
      />
      <div className="flex items-center justify-between gap-3">
        <Note>
          Notification permissions are managed by your operating system.
        </Note>
        <button
          type="button"
          onClick={sendTest}
          data-testid="settings-notification-test"
          className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
        >
          Send test
        </button>
      </div>
    </SettingsSectionCard>
  );
}

export function TerminalSettingsPanel() {
  const {
    defaultShell,
    logTailLines,
    logFontSize,
    logTimestamps,
    logWrap,
    copyOnSelect,
    confirmExec,
    updatePreferences,
  } = useSettingsStore();

  return (
    <SettingsSectionCard
      id="settings-terminal"
      icon={Terminal}
      title="Terminal & Logs"
      description="Defaults for interactive shells and log viewers."
    >
      <ChoiceGroup
        label="Default shell"
        description="Used when a pod exec terminal opens."
        value={defaultShell}
        options={[
          { value: "auto", label: "Auto" },
          { value: "bash", label: "Bash" },
          { value: "sh", label: "Shell" },
          { value: "zsh", label: "Zsh" },
        ]}
        onChange={(value) => updatePreferences({ defaultShell: value })}
        testIdPrefix="settings-shell"
      />
      <ChoiceGroup
        label="Log tail"
        description="Initial number of log lines to request."
        value={logTailLines}
        options={[
          { value: 100, label: "100" },
          { value: 500, label: "500" },
          { value: 1000, label: "1,000" },
        ]}
        onChange={(value) => updatePreferences({ logTailLines: value })}
        testIdPrefix="settings-log-tail"
      />
      <ChoiceGroup
        label="Log font size"
        description="Display size for log output."
        value={logFontSize}
        options={[
          { value: "sm", label: "Small" },
          { value: "md", label: "Default" },
          { value: "lg", label: "Large" },
        ]}
        onChange={(value) => updatePreferences({ logFontSize: value })}
        testIdPrefix="settings-log-font"
      />
      <div className="grid gap-2 md:grid-cols-2">
        <SettingsToggleRow
          icon={Terminal}
          title="Show timestamps"
          description="Prefix each log line with its time."
          checked={logTimestamps}
          onToggle={() => updatePreferences({ logTimestamps: !logTimestamps })}
          testId="settings-log-timestamps"
        />
        <SettingsToggleRow
          icon={Terminal}
          title="Wrap long lines"
          description="Wrap log output instead of horizontal scrolling."
          checked={logWrap}
          onToggle={() => updatePreferences({ logWrap: !logWrap })}
          testId="settings-log-wrap"
        />
        <SettingsToggleRow
          icon={Terminal}
          title="Copy on select"
          description="Copy selected terminal text automatically."
          checked={copyOnSelect}
          onToggle={() => updatePreferences({ copyOnSelect: !copyOnSelect })}
          testId="settings-copy-on-select"
        />
        <SettingsToggleRow
          icon={Terminal}
          title="Confirm exec sessions"
          description="Ask before opening a shell in a Pod."
          checked={confirmExec}
          onToggle={() => updatePreferences({ confirmExec: !confirmExec })}
          testId="settings-confirm-exec"
        />
      </div>
      <Note>
        Shell defaults apply to newly opened terminal sessions. Existing
        sessions keep their current shell.
      </Note>
    </SettingsSectionCard>
  );
}

export function IntegrationsSettingsPanel() {
  const repositories = useHelmStore((state) => state.repositories);
  const addRepository = useHelmStore((state) => state.addRepository);
  const removeRepository = useHelmStore((state) => state.removeRepository);
  const { defaultGitOpsPath, externalEditorCommand, updatePreferences } =
    useSettingsStore();
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");

  const addHelmRepository = () => {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        throw new Error();
    } catch {
      toast.error("Enter a valid http:// or https:// Helm repository URL.");
      return;
    }
    if (!name.trim()) {
      toast.error("Give the Helm repository a name.");
      return;
    }
    addRepository(name, url);
    setName("");
    setUrl("");
    toast.success("Helm repository added");
  };

  return (
    <SettingsSectionCard
      id="settings-integrations"
      icon={Plug}
      title="Integrations"
      description="Defaults for Helm, GitOps, and external tools."
    >
      <div>
        <SettingsHeading
          label="Helm repositories"
          description="Used by the Charts page. URLs are fetched only when you browse."
        />
        <div className="mt-3 space-y-1.5">
          {repositories.length === 0 ? (
            <p className="text-[10px] text-[var(--muted)]">
              No repositories configured.
            </p>
          ) : (
            repositories.map((repository) => (
              <div
                key={repository.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-[var(--foreground)]">
                    {repository.name}
                  </span>
                  <span className="block truncate font-mono text-[9px] text-[var(--muted)]">
                    {repository.url}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${repository.name}`}
                  onClick={() => removeRepository(repository.id)}
                  className="rounded-md p-1.5 text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            aria-label="Helm repository name"
            className="rounded-lg border border-[var(--border)] bg-black/[0.03] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-hidden focus:border-[var(--accent)] dark:bg-black/30"
          />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://charts.example.com"
            aria-label="Helm repository URL"
            className="rounded-lg border border-[var(--border)] bg-black/[0.03] px-2.5 py-1.5 font-mono text-xs text-[var(--foreground)] outline-hidden focus:border-[var(--accent)] dark:bg-black/30"
          />
          <button
            type="button"
            onClick={addHelmRepository}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <Plus className="h-3 w-3 text-[var(--accent)]" /> Add
          </button>
        </div>
      </div>
      <TextField
        label="Default GitOps repository"
        value={defaultGitOpsPath}
        placeholder="~/git/platform/manifests"
        testId="settings-gitops-path"
        onChange={(value) => updatePreferences({ defaultGitOpsPath: value })}
      />
      <TextField
        label="External editor command"
        value={externalEditorCommand}
        placeholder="code --goto {file}:{line}"
        testId="settings-editor-command"
        onChange={(value) =>
          updatePreferences({ externalEditorCommand: value })
        }
      />
      <Note>
        GitOps and editor values are stored locally. Shell placeholders are not
        executed by KubeView.
      </Note>
    </SettingsSectionCard>
  );
}

export function AdvancedSettingsPanel() {
  const { requestTimeoutSeconds, experimentalFeatures, updatePreferences } =
    useSettingsStore();
  const importRef = React.useRef<HTMLInputElement>(null);

  const exportSettings = async () => {
    const state = useSettingsStore.getState();
    const payload = Object.fromEntries(
      Object.keys(DEFAULT_PREFERENCES).map((key) => [
        key,
        (state as unknown as Record<string, unknown>)[key],
      ]),
    );
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success("Settings JSON copied to clipboard");
    } catch {
      toast.error("Could not copy settings JSON");
    }
  };

  const importSettings = async (file: File) => {
    try {
      const parsed = JSON.parse(
        await file.text(),
      ) as Partial<SettingsPreferences>;
      updatePreferences(parsed);
      toast.success("Settings imported");
    } catch {
      toast.error("Invalid settings JSON");
    }
  };

  return (
    <SettingsSectionCard
      id="settings-advanced"
      icon={SlidersHorizontal}
      title="Advanced"
      description="Timeouts, portability, and experimental controls."
    >
      <ChoiceGroup
        label="RPC timeout"
        description="How long a cluster request may wait before timing out."
        value={requestTimeoutSeconds}
        options={[
          { value: 15, label: "15 sec" },
          { value: 30, label: "30 sec" },
          { value: 60, label: "60 sec" },
        ]}
        onChange={(value) =>
          updatePreferences({ requestTimeoutSeconds: value })
        }
        testIdPrefix="settings-timeout"
      />
      <SettingsToggleRow
        icon={SlidersHorizontal}
        title="Experimental features"
        description="Enable unfinished interface experiments."
        checked={experimentalFeatures}
        onToggle={() =>
          updatePreferences({ experimentalFeatures: !experimentalFeatures })
        }
        testId="settings-experimental"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void exportSettings()}
          data-testid="settings-export"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
        >
          <Copy className="h-3 w-3" /> Copy settings JSON
        </button>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          data-testid="settings-import"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] cursor-pointer"
        >
          <Upload className="h-3 w-3" /> Import settings
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importSettings(file);
            event.target.value = "";
          }}
        />
      </div>
      <Note>
        Settings are local to this device. Importing replaces matching
        preferences with the file values.
      </Note>
    </SettingsSectionCard>
  );
}
