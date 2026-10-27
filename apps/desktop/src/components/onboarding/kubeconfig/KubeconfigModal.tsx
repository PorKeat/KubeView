"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";

import { AutoDetectTab } from "./tabs/AutoDetectTab";
import { BrowseFilesTab } from "./tabs/BrowseFilesTab";
import { PasteYamlTab } from "./tabs/PasteYamlTab";
import { ManageClustersTab } from "./tabs/ManageClustersTab";
import { KubeconfigModalFooter } from "./components/KubeconfigModalFooter";
import { KubeconfigModalHeader } from "./components/KubeconfigModalHeader";
import { KubeconfigModalTabs } from "./components/KubeconfigModalTabs";
import { useKubeconfigImport } from "./hooks/useKubeconfigImport";

export function KubeconfigModal() {
  const {
    isKubeconfigModalOpen,
    closeKubeconfigModal,
    availableContexts,
    currentContext,
    switchContext,
    deleteContext,
    clearAllContexts,
    detectedSystemConfigs,
    isDetectingConfigs,
    detectSystemConfigs,
    openEndpointModal,
  } = useClusterStore();

  const {
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
  } = useKubeconfigImport();

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
          <KubeconfigModalHeader />

          <KubeconfigModalTabs
            activeTab={activeTab}
            onSelectTab={selectTab}
            detectedCount={detectedSystemConfigs.length}
            discoveredCount={discoveredFiles.length}
            availableContextsCount={availableContexts.length}
          />

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
