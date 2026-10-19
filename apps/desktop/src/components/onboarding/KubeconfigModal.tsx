"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  UploadCloud,
  FileCode,
  Layers,
  X,
  Check,
  AlertCircle,
  Plus,
  Server,
  FolderOpen,
  ArrowRight,
  Shield,
  Loader2,
  Trash2,
  Folder,
  FileCheck,
  CheckSquare,
  Square,
  Info,
  Sparkles,
  RotateCw,
  Compass,
} from "lucide-react";
import { useClusterStore, ClusterContextInfo } from "@/stores/clusterStore";
import type { DetectedContextInfo } from "@kubeview/contracts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DiscoveredConfigFile {
  id: string;
  name: string;
  relativePath: string;
  sizeBytes: number;
  rawYaml: string;
  contexts: string[];
  isValid: boolean;
  selected: boolean;
}

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
  } = useClusterStore();

  const [activeTab, setActiveTab] = React.useState<"auto" | "browse" | "paste" | "manage">(
    kubeconfigModalTab || "browse"
  );
  const [selectedDetected, setSelectedDetected] = React.useState<Set<string>>(new Set());

  // Auto detect system configs when modal opens
  React.useEffect(() => {
    if (isKubeconfigModalOpen) {
      detectSystemConfigs().then((detected) => {
        if (detected && detected.length > 0 && availableContexts.length === 0 && (!kubeconfigModalTab || kubeconfigModalTab === "browse")) {
          setActiveTab("auto");
        }
      });
    }
  }, [isKubeconfigModalOpen, detectSystemConfigs, availableContexts.length, kubeconfigModalTab]);

  // Sync tab with store state when opened
  React.useEffect(() => {
    if (kubeconfigModalTab) {
      setActiveTab(kubeconfigModalTab);
    }
  }, [kubeconfigModalTab]);

  // Form states for Browse & Folder
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);
  const [discoveredFiles, setDiscoveredFiles] = React.useState<DiscoveredConfigFile[]>([]);
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

  // Extract contexts from YAML text helper
  const extractContexts = (yamlText: string): string[] => {
    if (!yamlText) return [];
    try {
      const contextsBlock = yamlText.split(/contexts:/)[1];
      if (!contextsBlock) return [];
      const blockContent = contextsBlock.split(/^[a-zA-Z0-9_-]+:/m)[0];
      const matches = blockContent.match(/-\s*name:\s*([^\s\n\r]+)/g);
      if (!matches) return [];
      return matches.map((m) =>
        m
          .replace(/-\s*name:\s*/, "")
          .replace(/['"]/g, "")
          .trim()
      );
    } catch {
      return [];
    }
  };

  const detectedPasteContexts = React.useMemo(() => extractContexts(rawYaml), [rawYaml]);

  // Recursive directory scanner for Drag & Drop
  const scanFilesFromDrop = async (dataTransfer: DataTransfer): Promise<{ file: File; path: string }[]> => {
    const results: { file: File; path: string }[] = [];
    const items = Array.from(dataTransfer.items || []);

    async function traverseEntry(entry: any, currentPath = ""): Promise<void> {
      if (!entry) return;
      if (entry.isFile) {
        const file: File = await new Promise((resolve, reject) => {
          entry.file(resolve, reject);
        });
        results.push({ file, path: currentPath ? `${currentPath}/${file.name}` : file.name });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries: any[] = await new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
        for (const child of entries) {
          await traverseEntry(child, currentPath ? `${currentPath}/${entry.name}` : entry.name);
        }
      }
    }

    const entries = items
      .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
      .filter(Boolean);

    if (entries.length > 0) {
      for (const entry of entries) {
        await traverseEntry(entry);
      }
    } else if (dataTransfer.files) {
      for (const f of Array.from(dataTransfer.files)) {
        results.push({ file: f, path: f.name });
      }
    }

    return results;
  };

  // Process list of candidate files into DiscoveredConfigFile items
  const processCandidateFiles = async (
    fileItems: { file: File; path?: string }[],
    detectedFolderName = ""
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
          // In a folder scan, silently skip files that are clearly not kubeconfigs
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
      setErrorMsg("No valid Kubeconfig files were found in the selected location.");
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
      // Extract folder name from first relative path if possible
      const firstPath = (files[0] as any).webkitRelativePath || files[0].name;
      const folder = firstPath.split("/")[0] || "Selected Folder";
      processCandidateFiles(
        files.map((f) => ({
          file: f,
          path: (f as any).webkitRelativePath || f.name,
        })),
        folder
      );
    }
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const scanned = await scanFilesFromDrop(e.dataTransfer);
    if (scanned.length > 0) {
      const folderCandidate = scanned[0].path.includes("/") ? scanned[0].path.split("/")[0] : "";
      processCandidateFiles(scanned, folderCandidate);
    }
  };

  // Toggle selection for a file card
  const toggleFileSelection = (id: string) => {
    setDiscoveredFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f))
    );
  };

  // Toggle select all
  const toggleSelectAll = (select: boolean) => {
    setDiscoveredFiles((prev) => prev.map((f) => ({ ...f, selected: select && f.isValid })));
  };

  const removeDiscoveredFile = (id: string) => {
    setDiscoveredFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Computed summary
  const selectedValidFiles = discoveredFiles.filter((f) => f.selected && f.isValid);
  const totalSelectedContexts = selectedValidFiles.reduce(
    (sum, f) => sum + Math.max(f.contexts.length, 1),
    0
  );

  // Submit from Browse / Folder Tab
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
          `Imported ${res.importedContexts.length} context(s)! Active: '${res.activeContext}'`
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
          `Batch imported ${payloadFiles.length} configs (${res.importedContexts.length} contexts)! Active: '${res.activeContext}'`
        );
      }

      // Reset
      setDiscoveredFiles([]);
      setFolderName("");
      setSingleAliasName("");
    } catch (err: any) {
      console.error("Import error:", err);
      setErrorMsg(err.message || "Failed to import kubeconfig");
      toast.error("Import failed: " + (err.message || "Invalid configuration"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit from Paste Tab
  const handleImportFromPaste = async () => {
    if (!rawYaml.trim()) {
      setErrorMsg("Please paste your kubeconfig YAML before importing.");
      return;
    }

    if (!rawYaml.includes("clusters") || !rawYaml.includes("contexts")) {
      setErrorMsg(
        "Pasted YAML does not appear to be a valid kubeconfig (missing 'clusters' or 'contexts' section)."
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
        `Successfully imported ${res.importedContexts.length} cluster context(s)! Connected to '${res.activeContext}'`
      );
      setRawYaml("");
      setClusterName("");
    } catch (err: any) {
      console.error("Import error:", err);
      setErrorMsg(err.message || "Failed to import kubeconfig");
      toast.error("Import failed: " + (err.message || "Invalid configuration"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectAllDetected = () => {
    const nonImported = detectedSystemConfigs.filter((c) => !c.isImported);
    if (selectedDetected.size === nonImported.length && nonImported.length > 0) {
      setSelectedDetected(new Set());
    } else {
      setSelectedDetected(new Set(nonImported.map((c) => c.contextName)));
    }
  };

  const handleImportDetected = async (specificContext?: DetectedContextInfo) => {
    const toImport = specificContext
      ? [{ contextName: specificContext.contextName, filePath: specificContext.filePath }]
      : detectedSystemConfigs
          .filter((c) => selectedDetected.has(c.contextName))
          .map((c) => ({ contextName: c.contextName, filePath: c.filePath }));

    if (toImport.length === 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await importDetectedContexts(toImport);
      toast.success(
        `Successfully imported ${res.importedContexts.length} cluster context(s)! Connected to '${res.activeContext}'`
      );
      setSelectedDetected(new Set());
    } catch (err: any) {
      console.error("Import error:", err);
      setErrorMsg(err.message || "Failed to import detected cluster");
      toast.error(`Import failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProviderBadge = (provider: ClusterContextInfo["provider"]) => {
    switch (provider) {
      case "kind":
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">Kind</span>;
      case "eks":
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">AWS EKS</span>;
      case "gke":
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">GCP GKE</span>;
      case "aks":
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">Azure AKS</span>;
      case "minikube":
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">Minikube</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-[var(--surface-active)] text-[var(--foreground)] border border-[var(--border)]">K8s</span>;
    }
  };

  return (
    <Dialog.Root open={isKubeconfigModalOpen} onOpenChange={(open) => !open && closeKubeconfigModal()}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 animate-in fade-in duration-200" />

        {/* Modal Dialog Content */}
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl lg:max-w-5xl h-[84vh] max-h-[820px] min-h-[580px] bg-[var(--surface-elevated)] border border-[var(--border)] rounded-3xl shadow-2xl z-50 outline-hidden flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-[var(--border)] select-none">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F08A42]/15 border border-[#F08A42]/30 flex items-center justify-center text-[#F08A42] shrink-0 shadow-[0_0_15px_rgba(240,138,66,0.15)]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-[var(--foreground)] tracking-tight">
                  Kubeconfig & Cluster Management
                </Dialog.Title>
                <Dialog.Description className="text-xs text-[var(--muted)] mt-0.5">
                  Scan system directories (~/.kube), import files, select folders, or paste YAML configurations
                </Dialog.Description>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block px-2.5 py-1 text-[11px] font-mono text-[var(--muted)] rounded-lg border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02]">
                Esc to close
              </span>
              <Dialog.Close asChild>
                <button
                  className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 px-6 md:px-8 pt-3 border-b border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] select-none overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab("auto");
                setErrorMsg(null);
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-xl transition-all cursor-pointer shrink-0",
                activeTab === "auto"
                  ? "border-[#F08A42] text-[#F08A42] bg-[#F08A42]/5"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
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
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              )}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Pick Files or Folder</span>
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
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              )}
            >
              <FileCode className="w-4 h-4" />
              <span>Paste YAML</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("manage");
                setErrorMsg(null);
              }}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 rounded-t-xl transition-all cursor-pointer ml-auto shrink-0",
                activeTab === "manage"
                  ? "border-[#F08A42] text-[#F08A42] bg-[#F08A42]/5"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              )}
            >
              <Layers className="w-4 h-4" />
              <span>Active Clusters</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-black/10 dark:bg-white/10 font-mono">
                {availableContexts.length}
              </span>
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5">
            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* TAB 0: AUTO-DETECTED OS KUBECONFIGS */}
            {activeTab === "auto" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)]">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#F08A42]" />
                      <span>Auto-Detected System Clusters</span>
                    </h4>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Scanned standard OS paths: <code>~/.kube/config</code>, <code>~/.kube/kubeconfig</code>, <code>$KUBECONFIG</code>. Select which clusters to add.
                    </p>
                  </div>
                  <button
                    onClick={() => detectSystemConfigs()}
                    disabled={isDetectingConfigs}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                  >
                    <RotateCw className={cn("w-3.5 h-3.5", isDetectingConfigs && "animate-spin text-[#F08A42]")} />
                    <span>Re-Scan</span>
                  </button>
                </div>

                {isDetectingConfigs ? (
                  <div className="py-16 flex flex-col items-center justify-center text-[var(--muted)] gap-3">
                    <RotateCw className="w-6 h-6 animate-spin text-[#F08A42]" />
                    <span className="text-xs font-medium">Scanning OS directories for Kubernetes configurations...</span>
                  </div>
                ) : detectedSystemConfigs.length === 0 ? (
                  <div className="py-16 border-2 border-dashed border-[var(--border)] rounded-3xl flex flex-col items-center justify-center text-center p-8 text-[var(--muted)]">
                    <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3">
                      <Info className="w-6 h-6 opacity-40 text-[var(--foreground)]" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--foreground)]">No Kubeconfigs Found in ~/.kube</span>
                    <p className="text-xs max-w-md mt-1.5 leading-relaxed">
                      We scanned standard OS paths but didn't find any kubeconfig files. You can manually pick files, select a folder, or paste YAML using the other tabs.
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => setActiveTab("browse")}
                        className="px-4 py-2 rounded-xl bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-all cursor-pointer"
                      >
                        Pick Files or Folder
                      </button>
                      <button
                        onClick={() => setActiveTab("paste")}
                        className="px-4 py-2 rounded-xl bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-all cursor-pointer"
                      >
                        Paste YAML
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Bulk Selection Header */}
                    <div className="flex items-center justify-between px-2 py-1 text-xs">
                      <button
                        onClick={toggleSelectAllDetected}
                        className="flex items-center gap-2.5 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer font-medium"
                      >
                        {selectedDetected.size > 0 && selectedDetected.size === detectedSystemConfigs.filter((c) => !c.isImported).length ? (
                          <CheckSquare className="w-4 h-4 text-[#F08A42]" />
                        ) : selectedDetected.size > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#F08A42] opacity-70" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        <span>
                          Select All ({detectedSystemConfigs.filter((c) => !c.isImported).length} Available)
                        </span>
                      </button>

                      {selectedDetected.size > 0 && (
                        <button
                          onClick={() => handleImportDetected()}
                          disabled={isSubmitting}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F08A42] hover:bg-[#E07931] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Import Selected ({selectedDetected.size})</span>
                        </button>
                      )}
                    </div>

                    {/* Cards List */}
                    <div className="space-y-2.5">
                      {detectedSystemConfigs.map((c) => {
                        const isSelected = selectedDetected.has(c.contextName);
                        return (
                          <div
                            key={`${c.filePath}-${c.contextName}`}
                            onClick={() => {
                              if (!c.isImported) {
                                const next = new Set(selectedDetected);
                                if (next.has(c.contextName)) {
                                  next.delete(c.contextName);
                                } else {
                                  next.add(c.contextName);
                                }
                                setSelectedDetected(next);
                              }
                            }}
                            className={cn(
                              "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5",
                              c.isImported
                                ? "bg-slate-50/50 dark:bg-white/[0.02] border-[var(--border)] opacity-85"
                                : isSelected
                                ? "bg-[#F08A42]/10 border-[#F08A42] shadow-sm cursor-pointer"
                                : "bg-slate-50 dark:bg-black/30 border border-[var(--border)] hover:border-slate-300 dark:hover:border-white/20 cursor-pointer"
                            )}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                {c.isImported ? (
                                  <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      const next = new Set(selectedDetected);
                                      if (next.has(c.contextName)) {
                                        next.delete(c.contextName);
                                      } else {
                                        next.add(c.contextName);
                                      }
                                      setSelectedDetected(next);
                                    }}
                                    className="w-4 h-4 rounded accent-[#F08A42] cursor-pointer"
                                  />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-sm text-[var(--foreground)] truncate">
                                    {c.contextName}
                                  </span>
                                  {getProviderBadge(c.provider)}
                                  {c.authType && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-black/5 dark:bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                                      auth: {c.authType}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[var(--muted)] font-mono mt-1 flex-wrap">
                                  <span className="text-[var(--foreground)] font-medium">{c.server || "local server"}</span>
                                  <span>•</span>
                                  <span className="truncate max-w-sm text-[11px]" title={c.filePath}>
                                    {c.filePath}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                              {c.isImported ? (
                                <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Added</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleImportDetected(c)}
                                  disabled={isSubmitting}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F08A42] hover:bg-[#E07931] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                                >
                                  <span>Add to KubeView</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: PICK FILES OR FOLDER */}
            {activeTab === "browse" && (
              <div className="space-y-4">
                {/* Auto-detected banner hint */}
                {detectedSystemConfigs.some((c) => !c.isImported) && (
                  <div className="p-3.5 rounded-xl bg-[#F08A42]/10 border border-[#F08A42]/25 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-[#F08A42] shrink-0" />
                      <div>
                        <span className="font-semibold text-[var(--foreground)] block">
                          Auto-Detected System Cluster Configs Found!
                        </span>
                        <span className="text-[11px] text-[var(--muted)]">
                          Found {detectedSystemConfigs.filter((c) => !c.isImported).length} cluster context(s) in your standard OS paths (e.g. <code>~/.kube/kubeconfig</code>).
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("auto")}
                      className="px-3 py-1.5 rounded-lg bg-[#F08A42] hover:bg-[#E07931] text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-all"
                    >
                      View & Select
                    </button>
                  </div>
                )}

                {/* Hidden Native File & Folder Inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFilesSelect}
                  multiple
                  className="hidden"
                />
                <input
                  type="file"
                  ref={folderInputRef}
                  onChange={handleFolderSelect}
                  multiple
                  {...({ webkitdirectory: "", directory: "" } as any)}
                  className="hidden"
                />

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all relative overflow-hidden",
                    isDragging
                      ? "border-[#F08A42] bg-[#F08A42]/8 scale-[0.99]"
                      : "border-[var(--border)] hover:border-[#F08A42]/60 hover:bg-black/[0.015] dark:hover:bg-white/[0.015]"
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#F08A42]/10 border border-[#F08A42]/20 flex items-center justify-center text-[#F08A42] mb-3">
                    <FolderOpen className="w-6 h-6" />
                  </div>

                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                    Drag & Drop Kubeconfigs or Pick from Disk
                  </h4>
                  <p className="text-xs text-[var(--muted)] max-w-md mb-4">
                    Drop individual files or an entire folder containing multiple kubeconfig files.
                    All valid configurations are auto-discovered and indexed.
                  </p>

                  {/* Dual Action Selection Buttons */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-lg bg-[var(--surface-active)] text-xs font-semibold text-[var(--foreground)] border border-[var(--border)] hover:border-[#F08A42] hover:text-[#F08A42] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FileCode className="w-3.5 h-3.5 text-[#F08A42]" />
                      <span>Choose File(s)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-lg bg-[#F08A42]/10 text-xs font-semibold text-[#F08A42] border border-[#F08A42]/30 hover:bg-[#F08A42]/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>Choose Entire Folder</span>
                    </button>
                  </div>
                </div>

                {/* Loading indicator while parsing files */}
                {isReadingFiles && (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#F08A42]" />
                    <span>Scanning and parsing Kubeconfig files...</span>
                  </div>
                )}

                {/* SINGLE FILE PREVIEW */}
                {discoveredFiles.length === 1 && !isReadingFiles && (
                  <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileCheck className="w-4 h-4 text-[#F08A42] shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-semibold text-[var(--foreground)] truncate block">
                            {discoveredFiles[0].name}
                          </span>
                          <span className="text-[10px] text-[var(--muted)] font-mono">
                            {(discoveredFiles[0].sizeBytes / 1024).toFixed(1)} KB •{" "}
                            {discoveredFiles[0].contexts.length > 0
                              ? `${discoveredFiles[0].contexts.length} context(s) found`
                              : "Validating syntax..."}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setDiscoveredFiles([])}
                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
                        title="Remove selection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Context Pills */}
                    {discoveredFiles[0].contexts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {discoveredFiles[0].contexts.map((ctx) => (
                          <span
                            key={ctx}
                            className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-[#F08A42]/10 text-[#F08A42] border border-[#F08A42]/20"
                          >
                            ctx: {ctx}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Optional Custom Alias */}
                    <div className="pt-2 border-t border-[var(--border)]">
                      <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                        Cluster Profile Alias (Optional)
                      </label>
                      <input
                        type="text"
                        value={singleAliasName}
                        onChange={(e) => setSingleAliasName(e.target.value)}
                        placeholder="e.g. production-cluster"
                        className="w-full px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] outline-hidden focus:border-[#F08A42]"
                      />
                    </div>
                  </div>
                )}

                {/* MULTI-FILE / FOLDER DISCOVERY LIST */}
                {discoveredFiles.length > 1 && !isReadingFiles && (
                  <div className="space-y-3">
                    {/* Discovery Header Banner */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-[var(--border)] text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder className="w-4 h-4 text-[#F08A42] shrink-0" />
                        <span className="font-semibold text-[var(--foreground)] truncate">
                          {folderName ? `Folder: ${folderName}` : "Multi-File Selection"}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F08A42]/15 text-[#F08A42]">
                          {selectedValidFiles.length} of {discoveredFiles.length} selected
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSelectAll(selectedValidFiles.length !== discoveredFiles.length)}
                          className="text-[11px] text-[#F08A42] hover:underline font-medium cursor-pointer"
                        >
                          {selectedValidFiles.length === discoveredFiles.length ? "Deselect All" : "Select All"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscoveredFiles([])}
                          className="text-[11px] text-[var(--muted)] hover:text-rose-500 cursor-pointer ml-2"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Discovered Items List */}
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {discoveredFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => file.isValid && toggleFileSelection(file.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group text-xs",
                            !file.isValid
                              ? "opacity-50 bg-black/[0.01] border-[var(--border)] cursor-not-allowed"
                              : file.selected
                              ? "bg-[#F08A42]/8 border-[#F08A42]/40"
                              : "bg-black/[0.02] dark:bg-white/[0.02] border-[var(--border)] hover:border-[#F08A42]/30"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            {/* Checkbox */}
                            <div className="text-[var(--muted)] group-hover:text-[#F08A42] transition-colors shrink-0">
                              {file.selected ? (
                                <CheckSquare className="w-4 h-4 text-[#F08A42]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[var(--foreground)] truncate">
                                  {file.relativePath}
                                </span>
                                <span className="text-[10px] text-[var(--muted)] font-mono shrink-0">
                                  ({(file.sizeBytes / 1024).toFixed(1)} KB)
                                </span>
                              </div>

                              {/* Context tags in file */}
                              {file.contexts.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {file.contexts.slice(0, 3).map((c) => (
                                    <span
                                      key={c}
                                      className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-black/5 dark:bg-white/5 border border-[var(--border)] text-[var(--muted)]"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                  {file.contexts.length > 3 && (
                                    <span className="text-[9px] text-[var(--muted)] font-mono self-center">
                                      +{file.contexts.length - 3} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-amber-500 font-mono mt-0.5 block">
                                  No contexts defined
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDiscoveredFile(file.id);
                            }}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-rose-500 transition-colors shrink-0 ml-2 cursor-pointer"
                            title="Exclude file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safety Guarantee Info */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-[11px] text-[var(--muted)]">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    Discovered configurations are safely copied to your isolated{" "}
                    <code className="font-mono text-[var(--foreground)]">~/.kube/kubeview_*.yaml</code>{" "}
                    storage. Your system default{" "}
                    <code className="font-mono text-[var(--foreground)]">~/.kube/config</code> is never overwritten.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: PASTE YAML */}
            {activeTab === "paste" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    Paste raw Kubeconfig YAML:
                  </label>
                  {detectedPasteContexts.length > 0 && (
                    <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" />
                      {detectedPasteContexts.length} cluster context(s) recognized
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={10}
                    value={rawYaml}
                    onChange={(e) => setRawYaml(e.target.value)}
                    placeholder={`apiVersion: v1\nclusters:\n- cluster:\n    server: https://127.0.0.1:6443\n    certificate-authority-data: ...\n  name: my-cluster\ncontexts:\n- context:\n    cluster: my-cluster\n    user: admin\n  name: my-context\ncurrent-context: my-context\nusers:\n- name: admin\n  user:\n    client-certificate-data: ...`}
                    className="w-full p-3 font-mono text-xs bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)]/50 outline-hidden focus:border-[#F08A42] leading-relaxed resize-none selection:bg-[#F08A42]/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                    Cluster Alias (Optional)
                  </label>
                  <input
                    type="text"
                    value={clusterName}
                    onChange={(e) => setClusterName(e.target.value)}
                    placeholder="e.g. production-gke or aws-dev"
                    className="w-full px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] outline-hidden focus:border-[#F08A42]"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: ACTIVE CLUSTERS & MULTI-CONFIG MANAGEMENT */}
            {activeTab === "manage" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>Available Contexts in KubeView</span>
                  <span className="font-mono text-[11px]">{availableContexts.length} total</span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {availableContexts.map((ctx) => {
                    const isSelected = ctx.name === currentContext;
                    return (
                      <div
                        key={ctx.name}
                        onClick={() => {
                          if (!isSelected) {
                            switchContext(ctx.name);
                            toast.info(`Switched active context to: ${ctx.name}`);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                          isSelected
                            ? "bg-[#F08A42]/10 border-[#F08A42]/40 shadow-xs"
                            : "bg-black/[0.02] dark:bg-white/[0.02] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)]"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                              isSelected
                                ? "bg-[#F08A42]/20 text-[#F08A42] border-[#F08A42]/40"
                                : "bg-black/5 dark:bg-white/5 text-[var(--muted)] border-[var(--border)]"
                            )}
                          >
                            <Server className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                                {ctx.name}
                              </span>
                              {getProviderBadge(ctx.provider)}
                              {isSelected && (
                                <span className="px-1.5 py-0.2 text-[9px] font-mono font-medium rounded-full bg-[#F08A42]/20 text-[#F08A42] border border-[#F08A42]/30">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[var(--muted)] font-mono truncate block mt-0.5">
                              {ctx.server}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isSelected ? (
                            <div className="flex items-center gap-1.5 text-xs text-[#F08A42] font-medium">
                              <Check className="w-4 h-4" />
                              <span>Current</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="px-2.5 py-1 text-xs rounded-lg bg-[var(--surface-active)] text-[var(--muted)] group-hover:text-[var(--foreground)] group-hover:border-[var(--accent)] border border-[var(--border)] transition-colors cursor-pointer"
                            >
                              Connect
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Remove cluster context '${ctx.name}' from KubeView?`)) {
                                deleteContext(ctx.name);
                                toast.success(`Removed context '${ctx.name}'`);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
                            title="Remove this context"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {availableContexts.length === 0 && (
                    <div className="text-center py-8 text-xs text-[var(--muted)]">
                      No cluster contexts configured yet. Import your first kubeconfig using the tabs above.
                    </div>
                  )}
                </div>

                {/* Add More Contexts Trigger Button & Reset Button */}
                <div className="pt-2 border-t border-[var(--border)] space-y-2">
                  <button
                    onClick={() => setActiveTab("browse")}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[var(--border)] hover:border-[#F08A42] hover:bg-[#F08A42]/5 text-xs text-[var(--muted)] hover:text-[#F08A42] transition-all cursor-pointer font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Import More Kubeconfigs or Select a Folder</span>
                  </button>

                  {availableContexts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Are you sure you want to remove all clusters from KubeView and start completely clean?")) {
                          clearAllContexts();
                          toast.success("All cluster configs removed. Clean slate ready.");
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-xs text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset All Clusters (Clean Slate)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 md:px-8 py-4.5 border-t border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] select-none">
            <span className="text-xs text-[var(--muted)] font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F08A42] animate-pulse" />
              <span>~/.kube multi-config engine • Isolated in ~/.kubeview/clusters</span>
            </span>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                type="button"
                onClick={closeKubeconfigModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {activeTab === "auto" && (
                <button
                  type="button"
                  onClick={() => handleImportDetected()}
                  disabled={selectedDetected.size === 0 || isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#F08A42] hover:bg-[#E07931] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {selectedDetected.size > 0
                          ? `Import ${selectedDetected.size} Selected Cluster${selectedDetected.size > 1 ? "s" : ""}`
                          : "Select Clusters to Import"}
                      </span>
                    </>
                  )}
                </button>
              )}

              {activeTab === "browse" && (
                <button
                  type="button"
                  onClick={handleImportFromFiles}
                  disabled={selectedValidFiles.length === 0 || isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#F08A42] hover:bg-[#E07931] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating & Importing...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>
                        {selectedValidFiles.length > 1
                          ? `Import ${selectedValidFiles.length} Configs (${totalSelectedContexts} Contexts)`
                          : "Import & Connect"}
                      </span>
                    </>
                  )}
                </button>
              )}

              {activeTab === "paste" && (
                <button
                  type="button"
                  onClick={handleImportFromPaste}
                  disabled={!rawYaml.trim() || isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#F08A42] hover:bg-[#E07931] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating & Importing...</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Import YAML & Connect</span>
                    </>
                  )}
                </button>
              )}

              {activeTab === "manage" && (
                <button
                  type="button"
                  onClick={closeKubeconfigModal}
                  className="px-4 py-1.5 rounded-lg bg-[var(--surface-active)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-all cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
