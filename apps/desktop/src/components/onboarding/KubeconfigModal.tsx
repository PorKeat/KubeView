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
  ExternalLink,
} from "lucide-react";
import { useClusterStore, ClusterContextInfo } from "@/stores/clusterStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface KubeconfigModalProps {
  // props if any
}

export function KubeconfigModal() {
  const {
    isKubeconfigModalOpen,
    kubeconfigModalTab,
    closeKubeconfigModal,
    openKubeconfigModal,
    importKubeconfig,
    availableContexts,
    currentContext,
    switchContext,
    configPath,
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

  // Form states for Browse
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileContent, setFileContent] = React.useState<string>("");
  const [filePathName, setFilePathName] = React.useState<string>("");
  const [isDragging, setIsDragging] = React.useState(false);

  // Form states for Paste
  const [rawYaml, setRawYaml] = React.useState<string>("");
  const [clusterName, setClusterName] = React.useState<string>("");

  // Common submission states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Parse contexts count helper
  const detectContextsCount = (yamlText: string): number => {
    if (!yamlText) return 0;
    try {
      // Basic count of "- name:" under contexts:
      const contextsBlock = yamlText.split(/contexts:/)[1];
      if (!contextsBlock) return 0;
      const matches = contextsBlock.match(/-\s*name:\s*([^\s\n]+)/g);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  };

  const detectedBrowseCount = React.useMemo(() => detectContextsCount(fileContent), [fileContent]);
  const detectedPasteCount = React.useMemo(() => detectContextsCount(rawYaml), [rawYaml]);

  // Handle file selection
  const processFile = (file: File) => {
    setSelectedFile(file);
    setFilePathName(file.name.replace(/\.[^/.]+$/, ""));
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text || "");
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read the selected file");
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Submit from Browse Tab
  const handleImportFromFile = async () => {
    if (!fileContent.trim()) {
      setErrorMsg("Please select a valid kubeconfig file first.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await importKubeconfig({
        rawYaml: fileContent,
        name: filePathName || selectedFile?.name || "imported",
      });

      toast.success(
        `Successfully imported ${res.importedContexts.length} cluster context(s)! Connected to '${res.activeContext}'`
      );
      // Reset form
      setSelectedFile(null);
      setFileContent("");
      setFilePathName("");
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
      setErrorMsg("Pasted YAML does not appear to be a valid kubeconfig (missing 'clusters' or 'contexts' section).");
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
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" />

        {/* Modal Dialog Content */}
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 outline-hidden flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                  Import, paste, or manage your Kubernetes cluster configurations
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
              <span>Browse Local File</span>
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
            {/* Error Banner if any */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: BROWSE LOCAL FILE */}
            {activeTab === "browse" && (
              <div className="space-y-4">
                {/* Drag and Drop Zone */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".yaml,.yml,.config,.kubeconfig,text/*"
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                    isDragging
                      ? "border-[#F08A42] bg-[#F08A42]/5 scale-[0.99]"
                      : "border-[var(--border)] hover:border-[#F08A42]/60 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#F08A42]/10 border border-[#F08A42]/20 flex items-center justify-center text-[#F08A42] mb-3">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                    Choose a Kubeconfig file or drag it here
                  </h4>
                  <p className="text-xs text-[var(--muted)] max-w-sm mb-3">
                    Supports <code className="font-mono text-[var(--foreground)]">.yaml</code>,{" "}
                    <code className="font-mono text-[var(--foreground)]">.yml</code>, or standard{" "}
                    <code className="font-mono text-[var(--foreground)]">kubeconfig</code> format
                  </p>
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--surface-active)] text-xs font-medium text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--accent)] transition-all shadow-xs"
                  >
                    Select File From Disk
                  </button>
                </div>

                {/* Selected File Details */}
                {selectedFile && (
                  <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileCode className="w-4 h-4 text-[#F08A42] shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-semibold text-[var(--foreground)] truncate block">
                            {selectedFile.name}
                          </span>
                          <span className="text-[10px] text-[var(--muted)] font-mono">
                            {(selectedFile.size / 1024).toFixed(1)} KB •{" "}
                            {detectedBrowseCount > 0
                              ? `${detectedBrowseCount} context(s) found`
                              : "Validating syntax..."}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setFileContent("");
                        }}
                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--muted)] hover:text-rose-500 transition-colors"
                        title="Remove selection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Optional Custom Alias */}
                    <div className="pt-2 border-t border-[var(--border)]">
                      <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                        Cluster Alias / Profile Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={filePathName}
                        onChange={(e) => setFilePathName(e.target.value)}
                        placeholder="e.g. staging-cluster"
                        className="w-full px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] outline-hidden focus:border-[#F08A42]"
                      />
                    </div>
                  </div>
                )}

                {/* Safety Guarantee Info */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-[11px] text-[var(--muted)]">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    Imported files are safely saved to your isolated{" "}
                    <code className="font-mono text-[var(--foreground)]">~/.kube/kubeview_*.yaml</code> directory.
                    Your existing <code className="font-mono text-[var(--foreground)]">~/.kube/config</code> is never overwritten.
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
                  {detectedPasteCount > 0 && (
                    <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" />
                      {detectedPasteCount} cluster context(s) recognized
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
                    <span>Import Another Kubeconfig File</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] select-none">
            <span className="text-[11px] text-[var(--muted)] font-mono">
              ~/.kube auto-merge enabled
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
                  onClick={handleImportFromFile}
                  disabled={!fileContent.trim() || isSubmitting}
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
                      <span>Import & Connect</span>
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
