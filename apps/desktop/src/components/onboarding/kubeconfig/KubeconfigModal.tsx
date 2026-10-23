"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Server,
  X,
  Sparkles,
  FolderOpen,
  FileCode,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import type { DetectedContextInfo } from "@kubeview/contracts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

import type { DiscoveredConfigFile } from "./types";
import { extractContexts, scanFilesFromDrop } from "./types";
import { AutoDetectTab } from "./tabs/AutoDetectTab";
import { BrowseFilesTab } from "./tabs/BrowseFilesTab";
import { PasteYamlTab } from "./tabs/PasteYamlTab";
import { ManageClustersTab } from "./tabs/ManageClustersTab";
import { KubeconfigModalFooter } from "./components/KubeconfigModalFooter";

export function KubeconfigModal() {
  const {
    isKubeconfigModalOpen,
    kubeconfigModalTab,
    closeKubeconfigModal,
    importKubeconfig,
    availableContexts,
    currentContext,
    switchContext,
    deleteContext,
    clearAllContexts,
    detectedSystemConfigs,
    isDetectingConfigs,
    detectSystemConfigs,
    importDetectedContexts,
    openEndpointModal,
  } = useClusterStore();

  const [activeTab, setActiveTab] = React.useState<
    "auto" | "browse" | "paste" | "manage"
  >(kubeconfigModalTab || "browse");
  const [selectedDetected, setSelectedDetected] = React.useState<Set<string>>(
    new Set(),
  );
  const [overrideEndpoints, setOverrideEndpoints] = React.useState<
    Record<string, string>
  >({});

  // Suggest reachable IPs from already configured clusters
  const suggestedIps = React.useMemo(() => {
    const ips: { ip: string; source: string }[] = [];
    for (const ctx of availableContexts) {
      if (ctx.server) {
        try {
          const u = ctx.server.includes("://")
            ? new URL(ctx.server)
            : new URL(`https://${ctx.server}`);
          if (
            /^(\d{1,3}\.){3}\d{1,3}$/.test(u.hostname) &&
            !u.hostname.startsWith("127.")
          ) {
            if (!ips.some((item) => item.ip === u.hostname)) {
              ips.push({ ip: u.hostname, source: ctx.name });
            }
          }
        } catch {}
      }
    }
    return ips;
  }, [availableContexts]);

  // Auto detect system configs when modal opens
  React.useEffect(() => {
    if (isKubeconfigModalOpen) {
      detectSystemConfigs().then((detected) => {
        if (
          detected &&
          detected.length > 0 &&
          availableContexts.length === 0 &&
          (!kubeconfigModalTab || kubeconfigModalTab === "browse")
        ) {
          setActiveTab("auto");
        }
      });
    }
  }, [
    isKubeconfigModalOpen,
    detectSystemConfigs,
    availableContexts.length,
    kubeconfigModalTab,
  ]);

  // Sync tab with store state when opened
  React.useEffect(() => {
    if (kubeconfigModalTab) {
      setActiveTab(kubeconfigModalTab);
    }
  }, [kubeconfigModalTab]);

  // Form states for Browse & Folder
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);
  const [discoveredFiles, setDiscoveredFiles] = React.useState<
    DiscoveredConfigFile[]
  >([]);
  const [folderName, setFolderName] = React.useState<string>("");
  const [singleAliasName, setSingleAliasName] = React.useState<string>("");
  const [isDragging, setIsDragging] = React.useState(false);
  const [isReadingFiles, setIsReadingFiles] = React.useState(false);

  // Form states for Paste
  const [rawYaml, setRawYaml] = React.useState<string>("");
  const [clusterName, setClusterName] = React.useState<string>("");

  // Common submission states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const detectedPasteContexts = React.useMemo(
    () => extractContexts(rawYaml),
    [rawYaml],
  );

  // Process list of candidate files into DiscoveredConfigFile items
  const processCandidateFiles = async (
    fileItems: { file: File; path?: string }[],
    detectedFolderName = "",
  ) => {
    setIsReadingFiles(true);
    setErrorMsg(null);

    const configs: DiscoveredConfigFile[] = [];
    let nonConfigCount = 0;

    for (let i = 0; i < fileItems.length; i++) {
      const { file, path } = fileItems[i];
      const nameLower = file.name.toLowerCase();

      // Only skip known binary formats and hidden system files; allow files with NO extension or ANY extension
      if (
        nameLower.startsWith(".") ||
        nameLower.endsWith(".png") ||
        nameLower.endsWith(".jpg") ||
        nameLower.endsWith(".jpeg") ||
        nameLower.endsWith(".gif") ||
        nameLower.endsWith(".zip") ||
        nameLower.endsWith(".tar") ||
        nameLower.endsWith(".gz") ||
        nameLower.endsWith(".exe") ||
        nameLower.endsWith(".bin")
      ) {
        nonConfigCount++;
        continue;
      }

      try {
        const text: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });

        const contexts = extractContexts(text);
        const hasK8sStructure =
          (text.includes("clusters:") && text.includes("contexts:")) ||
          (text.includes("apiVersion:") && text.includes("kind:")) ||
          (text.includes("clusters:") && text.includes("server:"));

        const isValid = contexts.length > 0 || hasK8sStructure;

        if (!isValid && fileItems.length > 1) {
          nonConfigCount++;
          continue;
        }

        configs.push({
          id: `${file.name}-${i}-${Date.now()}`,
          name: file.name,
          relativePath: path || file.name,
          sizeBytes: file.size,
          rawYaml: text,
          contexts,
          isValid,
          selected: isValid,
        });
      } catch (err) {
        console.warn(`Could not read file ${file.name}:`, err);
      }
    }

    setIsReadingFiles(false);

    if (configs.length === 0) {
      setErrorMsg(
        "No valid Kubeconfig files were found in the selected location.",
      );
      setDiscoveredFiles([]);
      return;
    }

    setDiscoveredFiles(configs);
    setFolderName(detectedFolderName);

    if (configs.length === 1) {
      setSingleAliasName(configs[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processCandidateFiles(files.map((f) => ({ file: f, path: f.name })));
    }
    e.target.value = "";
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const firstFile = files[0] as File & { webkitRelativePath?: string };
      const firstPath = firstFile.webkitRelativePath || firstFile.name;
      const folder = firstPath.split("/")[0] || "Selected Folder";
      processCandidateFiles(
        files.map((file) => ({
          file,
          path:
            (file as File & { webkitRelativePath?: string })
              .webkitRelativePath || file.name,
        })),
        folder,
      );
    }
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const scanned = await scanFilesFromDrop(e.dataTransfer);
    if (scanned.length > 0) {
      const folderCandidate = scanned[0].path.includes("/")
        ? scanned[0].path.split("/")[0]
        : "";
      processCandidateFiles(scanned, folderCandidate);
    }
  };

  const toggleFileSelection = (id: string) => {
    setDiscoveredFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f)),
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setDiscoveredFiles((prev) =>
      prev.map((f) => ({ ...f, selected: select && f.isValid })),
    );
  };

  const removeDiscoveredFile = (id: string) => {
    setDiscoveredFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const selectedValidFiles = discoveredFiles.filter(
    (f) => f.selected && f.isValid,
  );
  const totalSelectedContexts = selectedValidFiles.reduce(
    (sum, f) => sum + Math.max(f.contexts.length, 1),
    0,
  );

  const handleImportFromFiles = async () => {
    if (selectedValidFiles.length === 0) {
      setErrorMsg("Please select at least one valid kubeconfig to import.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (selectedValidFiles.length === 1) {
        const single = selectedValidFiles[0];
        const res = await importKubeconfig({
          rawYaml: single.rawYaml,
          name: singleAliasName.trim() || single.name.replace(/\.[^/.]+$/, ""),
        });
        toast.success(
          `Imported ${res.importedContexts.length} context(s)! Active: '${res.activeContext}'`,
        );
      } else {
        const payloadFiles = selectedValidFiles.map((f) => ({
          rawYaml: f.rawYaml,
          name: f.name.replace(/\.[^/.]+$/, ""),
        }));

        const res = await importKubeconfig({
          files: payloadFiles,
        });

        toast.success(
          `Batch imported ${payloadFiles.length} configs (${res.importedContexts.length} contexts)! Active: '${res.activeContext}'`,
        );
      }

      setDiscoveredFiles([]);
      setFolderName("");
      setSingleAliasName("");
    } catch (err: unknown) {
      console.error("Import error:", err);
      const message =
        err instanceof Error ? err.message : "Invalid configuration";
      setErrorMsg(message);
      toast.error(`Import failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportFromPaste = async () => {
    if (!rawYaml.trim()) {
      setErrorMsg("Please paste your kubeconfig YAML before importing.");
      return;
    }

    if (!rawYaml.includes("clusters") || !rawYaml.includes("contexts")) {
      setErrorMsg(
        "Pasted YAML does not appear to be a valid kubeconfig (missing 'clusters' or 'contexts' section).",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await importKubeconfig({
        rawYaml: rawYaml.trim(),
        name: clusterName.trim() || undefined,
      });

      toast.success(
        `Successfully imported ${res.importedContexts.length} cluster context(s)! Connected to '${res.activeContext}'`,
      );
      setRawYaml("");
      setClusterName("");
    } catch (err: unknown) {
      console.error("Import error:", err);
      const message =
        err instanceof Error ? err.message : "Invalid configuration";
      setErrorMsg(message);
      toast.error(`Import failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportDetected = async (
    specificContext?: DetectedContextInfo,
  ) => {
    const toImport = specificContext
      ? [
          {
            contextName: specificContext.contextName,
            filePath: specificContext.filePath,
            overrideServer:
              overrideEndpoints[
                `${specificContext.filePath}::${specificContext.contextName}`
              ],
          },
        ]
      : detectedSystemConfigs
          .filter((c) =>
            selectedDetected.has(`${c.filePath}::${c.contextName}`),
          )
          .map((c) => ({
            contextName: c.contextName,
            filePath: c.filePath,
            overrideServer:
              overrideEndpoints[`${c.filePath}::${c.contextName}`],
          }));

    if (toImport.length === 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await importDetectedContexts(toImport);
      toast.success(
        `Successfully imported ${res.importedContexts.length} cluster context(s)! Connected to '${res.activeContext}'`,
      );
      setSelectedDetected(new Set());
    } catch (err: unknown) {
      console.error("Import error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(message);
      toast.error(`Import failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={isKubeconfigModalOpen}
      onOpenChange={(open) => !open && closeKubeconfigModal()}
    >
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 animate-in fade-in duration-200" />

        {/* Modal Dialog Content */}
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] sm:w-[95vw] max-w-4xl lg:max-w-5xl h-[100dvh] sm:h-[84vh] max-h-none sm:max-h-[820px] min-h-0 sm:min-h-[580px] bg-[var(--surface-elevated)] border border-[var(--border)] rounded-none sm:rounded-3xl shadow-2xl z-50 outline-hidden flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-[var(--border)] select-none">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F08A42]/15 border border-[#F08A42]/30 flex items-center justify-center text-[#F08A42] shrink-0 shadow-[0_0_15px_rgba(240,138,66,0.15)]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-sm sm:text-base font-bold text-[var(--foreground)] tracking-tight">
                  Kubeconfig & Cluster Management
                </Dialog.Title>
                <Dialog.Description className="hidden sm:block text-xs text-[var(--muted)] mt-0.5">
                  Scan system directories (~/.kube), import files, select
                  folders, or paste YAML configurations
                </Dialog.Description>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block px-2.5 py-1 text-[11px] font-mono text-[var(--muted)] rounded-lg border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02]">
                Esc to close
              </span>
              <Tooltip content="Close dialog" shortcut="Esc">
                <Dialog.Close asChild>
                  <button
                    className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    aria-label="Close dialog"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </Tooltip>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 md:px-8 pt-3 border-b border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] select-none overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                setActiveTab("auto");
                setErrorMsg(null);
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-xl transition-all cursor-pointer shrink-0",
                activeTab === "auto"
                  ? "border-[#F08A42] text-[#F08A42] bg-[#F08A42]/5"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>Auto-Detected (~/.kube)</span>
              {detectedSystemConfigs.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[#F08A42]/20 text-[#F08A42] font-mono font-medium">
                  {detectedSystemConfigs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("browse");
                setErrorMsg(null);
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-xl transition-all cursor-pointer shrink-0",
                activeTab === "browse"
                  ? "border-[#F08A42] text-[#F08A42] bg-[#F08A42]/5"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
              )}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Add via File / Folder</span>
              {discoveredFiles.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[#F08A42]/20 text-[#F08A42] font-mono font-medium">
                  {discoveredFiles.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("paste");
                setErrorMsg(null);
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-xl transition-all cursor-pointer shrink-0",
                activeTab === "paste"
                  ? "border-[#F08A42] text-[#F08A42] bg-[#F08A42]/5"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
              )}
            >
              <FileCode className="w-4 h-4" />
              <span>Paste Raw YAML</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("manage");
                setErrorMsg(null);
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-xl transition-all cursor-pointer shrink-0",
                activeTab === "manage"
                  ? "border-[#F08A42] text-[#F08A42] bg-[#F08A42]/5"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Manage Clusters</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/10 dark:bg-white/10 text-[var(--foreground)] font-mono font-medium">
                {availableContexts.length}
              </span>
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
            {/* Inline Error Notice */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  onClick={() => setErrorMsg(null)}
                  className="p-1 hover:bg-rose-500/15 rounded text-rose-500 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {activeTab === "auto" && (
              <AutoDetectTab
                detectedSystemConfigs={detectedSystemConfigs}
                isDetectingConfigs={isDetectingConfigs}
                selectedDetected={selectedDetected}
                setSelectedDetected={setSelectedDetected}
                overrideEndpoints={overrideEndpoints}
                setOverrideEndpoints={setOverrideEndpoints}
                suggestedIps={suggestedIps}
                detectSystemConfigs={detectSystemConfigs}
                handleImportDetected={handleImportDetected}
                isSubmitting={isSubmitting}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "browse" && (
              <BrowseFilesTab
                detectedSystemConfigs={detectedSystemConfigs}
                discoveredFiles={discoveredFiles}
                setDiscoveredFiles={setDiscoveredFiles}
                singleAliasName={singleAliasName}
                setSingleAliasName={setSingleAliasName}
                folderName={folderName}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                isReadingFiles={isReadingFiles}
                fileInputRef={fileInputRef}
                folderInputRef={folderInputRef}
                handleFilesSelect={handleFilesSelect}
                handleFolderSelect={handleFolderSelect}
                handleDrop={handleDrop}
                toggleFileSelection={toggleFileSelection}
                toggleSelectAll={toggleSelectAll}
                removeDiscoveredFile={removeDiscoveredFile}
                selectedValidFiles={selectedValidFiles}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "paste" && (
              <PasteYamlTab
                rawYaml={rawYaml}
                setRawYaml={setRawYaml}
                clusterName={clusterName}
                setClusterName={setClusterName}
                detectedPasteContexts={detectedPasteContexts}
              />
            )}

            {activeTab === "manage" && (
              <ManageClustersTab
                availableContexts={availableContexts}
                currentContext={currentContext}
                switchContext={switchContext}
                deleteContext={deleteContext}
                clearAllContexts={clearAllContexts}
                openEndpointModal={openEndpointModal}
                setActiveTab={setActiveTab}
              />
            )}
          </div>

          {/* Footer Controls */}
          <KubeconfigModalFooter
            activeTab={activeTab}
            closeKubeconfigModal={closeKubeconfigModal}
            selectedDetectedCount={selectedDetected.size}
            isSubmitting={isSubmitting}
            handleImportDetected={handleImportDetected}
            handleImportFromFiles={handleImportFromFiles}
            handleImportFromPaste={handleImportFromPaste}
            selectedValidFiles={selectedValidFiles}
            totalSelectedContexts={totalSelectedContexts}
            rawYaml={rawYaml}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
