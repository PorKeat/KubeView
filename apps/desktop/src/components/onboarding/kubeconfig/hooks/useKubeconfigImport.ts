"use client";

import * as React from "react";
import { toast } from "sonner";
import type { DetectedContextInfo } from "@kubeview/contracts";
import { useClusterStore } from "@/stores/clusterStore";
import type { DiscoveredConfigFile } from "../types";
import { extractContexts, scanFilesFromDrop } from "../types";

export type KubeconfigModalTab = "auto" | "browse" | "paste" | "manage";

export function useKubeconfigImport() {
  const {
    isKubeconfigModalOpen,
    kubeconfigModalTab,
    importKubeconfig,
    availableContexts,
    detectSystemConfigs,
    detectedSystemConfigs,
    importDetectedContexts,
  } = useClusterStore();

  const [activeTab, setActiveTab] = React.useState<KubeconfigModalTab>(
    kubeconfigModalTab || "browse",
  );
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

  const selectTab = (tab: KubeconfigModalTab) => {
    setActiveTab(tab);
    setErrorMsg(null);
  };

  return {
    activeTab,
    setActiveTab,
    selectTab,
    selectedDetected,
    setSelectedDetected,
    overrideEndpoints,
    setOverrideEndpoints,
    suggestedIps,
    fileInputRef,
    folderInputRef,
    discoveredFiles,
    setDiscoveredFiles,
    folderName,
    singleAliasName,
    setSingleAliasName,
    isDragging,
    setIsDragging,
    isReadingFiles,
    rawYaml,
    setRawYaml,
    clusterName,
    setClusterName,
    isSubmitting,
    errorMsg,
    setErrorMsg,
    detectedPasteContexts,
    handleFilesSelect,
    handleFolderSelect,
    handleDrop,
    toggleFileSelection,
    toggleSelectAll,
    removeDiscoveredFile,
    selectedValidFiles,
    totalSelectedContexts,
    handleImportFromFiles,
    handleImportFromPaste,
    handleImportDetected,
  };
}
