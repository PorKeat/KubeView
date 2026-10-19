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
} from "lucide-react";
import { useClusterStore, ClusterContextInfo } from "@/stores/clusterStore";
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
  } = useClusterStore();

  const [activeTab, setActiveTab] = React.useState<"browse" | "paste" | "manage">(
    kubeconfigModalTab || "browse"
  );

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

      // Skip common non-config noise
      if (
        nameLower.startsWith(".") ||
        nameLower.endsWith(".png") ||
        nameLower.endsWith(".jpg") ||
        nameLower.endsWith(".md") ||
        nameLower.endsWith(".txt") && !nameLower.includes("kube") && !nameLower.includes("config")
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
          text.includes("clusters:") ||
          text.includes("apiVersion:") ||
          text.includes("kind: Config");

        const isValid = contexts.length > 0 || (hasK8sStructure && text.includes("server:"));

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
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 outline-hidden flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F08A42]/15 border border-[#F08A42]/30 flex items-center justify-center text-[#F08A42]">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                  Kubeconfig & Cluster Management
                </Dialog.Title>
                <Dialog.Description className="text-xs text-[var(--muted)]">
                  Import single files, select an entire folder, or paste YAML configurations
                </Dialog.Description>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] select-none">
            <button
              onClick={() => {
                setActiveTab("browse");
                setErrorMsg(null);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                activeTab === "browse"
                  ? "border-[#F08A42] text-[#F08A42]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Pick Files or Folder</span>
              {discoveredFiles.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[#F08A42]/20 text-[#F08A42] font-mono font-medium">
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
                "flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                activeTab === "paste"
                  ? "border-[#F08A42] text-[#F08A42]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Paste YAML</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("manage");
                setErrorMsg(null);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ml-auto",
                activeTab === "manage"
                  ? "border-[#F08A42] text-[#F08A42]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Active Clusters</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black/10 dark:bg-white/10 font-mono">
                {availableContexts.length}
              </span>
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: PICK FILES OR FOLDER */}
            {activeTab === "browse" && (
              <div className="space-y-4">
                {/* Hidden Native File & Folder Inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFilesSelect}
                  multiple
                  accept=".yaml,.yml,.config,.kubeconfig,text/*"
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
                              className="px-2.5 py-1 text-xs rounded-lg bg-[var(--surface-active)] text-[var(--muted)] group-hover:text-[var(--foreground)] group-hover:border-[var(--accent)] border border-[var(--border)] transition-colors"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {availableContexts.length === 0 && (
                    <div className="text-center py-8 text-xs text-[var(--muted)]">
                      No cluster contexts detected yet. Import your first kubeconfig using the tabs above.
                    </div>
                  )}
                </div>

                {/* Add More Contexts Trigger Button */}
                <div className="pt-2 border-t border-[var(--border)]">
                  <button
                    onClick={() => setActiveTab("browse")}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[var(--border)] hover:border-[#F08A42] hover:bg-[#F08A42]/5 text-xs text-[var(--muted)] hover:text-[#F08A42] transition-all cursor-pointer font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Import More Kubeconfigs or Select a Folder</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] select-none">
            <span className="text-[11px] text-[var(--muted)] font-mono">
              ~/.kube multi-config engine
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={closeKubeconfigModal}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                Cancel
              </button>

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
