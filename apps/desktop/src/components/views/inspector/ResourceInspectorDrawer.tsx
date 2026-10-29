"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { useClusterStore } from "@/stores/clusterStore";
import { cn } from "@/lib/utils";
import { resourceTarget } from "@/lib/resourceKinds";

import { InspectorHeader } from "./components/InspectorHeader";
import { InspectorTabBar } from "./components/InspectorTabBar";
import { InspectorTabContent } from "./components/InspectorTabContent";
import { getInspectorTabs, type InspectorTabId } from "./lib/inspectorTabs";
import { useInspectorResourceState } from "./hooks/useInspectorResourceState";
import { useInspectorSlideTransition } from "./hooks/useInspectorSlideTransition";
import { useInspectorYaml } from "./hooks/useInspectorYaml";
import { useInspectorEvents } from "./hooks/useInspectorEvents";
import { useInspectorActions } from "./hooks/useInspectorActions";
import { useInspectorEscapeClose } from "./hooks/useInspectorEscapeClose";

export function ResourceInspectorDrawer() {
  const {
    isInspectorOpen,
    closeInspector,
    isInspectorEditDirty,
    setInspectorEditDirty,
    openLogsModal,
    openExecModal,
    openRestartConfirm,
    openDeleteConfirm,
    loadConfigMaps,
    loadSecrets,
    openInspector,
  } = useClusterStore();

  const [activeTab, setActiveTab] = React.useState<InspectorTabId>("overview");
  const [isEditorMaximized, setIsEditorMaximized] = React.useState(false);
  const [pendingGuard, setPendingGuard] = React.useState<
    InspectorTabId | "close" | null
  >(null);

  const requestClose = React.useCallback(() => {
    if (isInspectorEditDirty) {
      setPendingGuard("close");
      return;
    }
    closeInspector();
  }, [closeInspector, isInspectorEditDirty]);

  const requestTab = React.useCallback(
    (tab: InspectorTabId) => {
      if (activeTab === "edit" && tab !== "edit" && isInspectorEditDirty) {
        setPendingGuard(tab);
        return;
      }
      setActiveTab(tab);
    },
    [activeTab, isInspectorEditDirty],
  );

  const continueAfterDiscard = () => {
    const next = pendingGuard;
    setPendingGuard(null);
    setInspectorEditDirty(false);
    if (next === "close") {
      closeInspector();
    } else if (next) {
      setActiveTab(next);
    }
  };

  const { isRendered, isMounted } =
    useInspectorSlideTransition(isInspectorOpen);

  const {
    currentResource,
    isNode,
    isDeployment,
    isReplicaSet,
    isStatefulSet,
    isDaemonSet,
    isJob,
    isCronJob,
    isConfigMap,
    isConfigStorageResource,
    canEditConfigStorage,
    isServiceAccount,
    isRBACResource,
    isCRD,
    isAccessResource,
    isWorkload,
    isNetworkingResource,
    podData,
    networkingData,
    configStorageData,
    editableConfigStorageData,
    accessData,
    nodeData,
    podNodeCIDR,
    deploymentData,
    replicaSetData,
    statefulSetData,
    daemonSetData,
    jobData,
    cronJobData,
    workloadConditions,
    nodePods,
    pods,
  } = useInspectorResourceState(isInspectorOpen);

  const yaml = useInspectorYaml({
    isInspectorOpen,
    activeTab,
    currentResource,
    isNode,
    isDeployment,
    isReplicaSet,
    isStatefulSet,
    isDaemonSet,
    isJob,
    isCronJob,
    isNetworkingResource,
    isAccessResource,
    isServiceAccount,
    isRBACResource,
    isConfigStorageResource,
    podData,
    pods,
  });

  const { liveEvents, isLoadingEvents } = useInspectorEvents({
    isInspectorOpen,
    activeTab,
    currentResource,
    isNode,
    isWorkload,
    isNetworkingResource,
    isConfigStorageResource,
    isAccessResource,
  });

  const inspectedResourceKey = currentResource
    ? `${currentResource.kind}/${currentResource.namespace}/${currentResource.name}`
    : "";

  React.useEffect(() => {
    setIsEditorMaximized(false);
  }, [inspectedResourceKey]);

  React.useEffect(() => {
    if (!isInspectorOpen || activeTab !== "edit") {
      setIsEditorMaximized(false);
    }
  }, [isInspectorOpen, activeTab]);

  const actions = useInspectorActions({
    currentResource,
    isDeployment,
    isReplicaSet,
    isStatefulSet,
    isDaemonSet,
    isJob,
    isCronJob,
    isWorkload,
    deploymentData,
    replicaSetData,
    statefulSetData,
    daemonSetData,
    jobData,
    cronJobData,
  });

  const editTarget = currentResource
    ? resourceTarget(
        currentResource.kind,
        currentResource.name,
        currentResource.namespace,
      )
    : null;
  const canEditGenericResource = Boolean(editTarget) && !canEditConfigStorage;
  const canEditResource = canEditConfigStorage || canEditGenericResource;

  // Reset to the overview tab whenever a different resource is inspected.
  React.useEffect(() => {
    setActiveTab(
      currentResource?.initialTab === "edit" && canEditResource
        ? "edit"
        : "overview",
    );
  }, [
    currentResource?.kind,
    currentResource?.name,
    currentResource?.initialTab,
    canEditResource,
  ]);

  useInspectorEscapeClose(isInspectorOpen, requestClose);

  if (!isRendered || !currentResource) return null;

  const hasWorkloadConditions =
    isDeployment || isReplicaSet || isStatefulSet || isDaemonSet || isJob;
  const inspectorTabs = getInspectorTabs({
    isConfigStorageResource,
    canEditConfigStorage,
    canEditGenericResource,
    isAccessResource,
    isCRD,
    isWorkload,
    isNetworkingResource,
    hasWorkloadConditions,
    workloadConditionsCount: workloadConditions.length,
    podData,
    liveEventsCount: liveEvents.length,
  });

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 overflow-hidden transition-all duration-200 motion-reduce:transition-none",
        isMounted ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {/* Modal Backdrop / Dim Overlay */}
      <div
        data-testid="resource-inspector-backdrop"
        onClick={requestClose}
        className={cn(
          "fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity motion-reduce:transition-none cursor-pointer",
          isMounted
            ? "opacity-100 duration-250 ease-out"
            : "opacity-0 duration-200 ease-in",
        )}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer */}
      <div
        data-testid="resource-inspector-drawer"
        className={cn(
          "inspector-drawer fixed inset-y-0 right-0 z-40 w-full glass-panel border-l border-[var(--border)] shadow-2xl flex flex-col select-none backdrop-blur-xl transform motion-reduce:transform-none",
          activeTab === "edit"
            ? isEditorMaximized
              ? "max-w-[100vw]"
              : "max-w-3xl md:max-w-4xl"
            : "max-w-xl md:max-w-2xl",
          isMounted ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Top Header */}
        <InspectorHeader
          currentResource={currentResource}
          isNode={isNode}
          isNetworkingResource={isNetworkingResource}
          isConfigStorageResource={isConfigStorageResource}
          isAccessResource={isAccessResource}
          isDeployment={isDeployment}
          isReplicaSet={isReplicaSet}
          isStatefulSet={isStatefulSet}
          isDaemonSet={isDaemonSet}
          isJob={isJob}
          isCronJob={isCronJob}
          nodeData={nodeData}
          podData={podData}
          onViewPods={isCronJob ? undefined : actions.handleViewPodsForWorkload}
          onViewJobs={isCronJob ? actions.handleViewJobsForCronJob : undefined}
          onScaleWorkload={
            isDeployment || isReplicaSet || isStatefulSet
              ? actions.handleScaleWorkload
              : undefined
          }
          onRestartWorkload={
            isDeployment || isStatefulSet || isDaemonSet
              ? actions.handleRestartWorkload
              : undefined
          }
          onDeleteWorkload={actions.handleDeleteWorkload}
          onToggleCronJobSuspend={
            isCronJob ? actions.handleToggleCronJobSuspend : undefined
          }
          onTriggerCronJob={
            isCronJob ? actions.handleTriggerCronJob : undefined
          }
          cronJobSuspended={cronJobData?.suspend ?? false}
          onClose={requestClose}
          onOpenLogsModal={openLogsModal}
          onOpenExecModal={openExecModal}
          onOpenRestartConfirm={openRestartConfirm}
          onOpenDeleteConfirm={openDeleteConfirm}
          onEditYaml={canEditResource ? () => setActiveTab("edit") : undefined}
        />

        {/* Segmented Tabs Bar (Pods and Workloads) */}
        {!isNode && (
          <InspectorTabBar
            tabs={inspectorTabs}
            activeTab={activeTab}
            onSelectTab={requestTab}
          />
        )}

        {/* Drawer Content */}
        <InspectorTabContent
          activeTab={activeTab}
          currentResource={currentResource}
          isNode={isNode}
          isAccessResource={isAccessResource}
          isConfigStorageResource={isConfigStorageResource}
          isNetworkingResource={isNetworkingResource}
          isWorkload={isWorkload}
          isCRD={isCRD}
          isConfigMap={isConfigMap}
          isDeployment={isDeployment}
          isReplicaSet={isReplicaSet}
          isStatefulSet={isStatefulSet}
          isDaemonSet={isDaemonSet}
          isJob={isJob}
          isCronJob={isCronJob}
          hasWorkloadConditions={hasWorkloadConditions}
          nodeData={nodeData}
          nodePods={nodePods}
          accessData={accessData}
          configStorageData={configStorageData}
          editableConfigStorageData={editableConfigStorageData}
          networkingData={networkingData}
          deploymentData={deploymentData}
          replicaSetData={replicaSetData}
          statefulSetData={statefulSetData}
          daemonSetData={daemonSetData}
          jobData={jobData}
          cronJobData={cronJobData}
          workloadConditions={workloadConditions}
          podData={podData}
          podNodeCIDR={podNodeCIDR}
          liveEvents={liveEvents}
          liveYaml={yaml.liveYaml}
          isLoadingYaml={yaml.isLoadingYaml}
          isLoadingEvents={isLoadingEvents}
          copiedYaml={yaml.copiedYaml}
          isEditorMaximized={isEditorMaximized}
          onToggleEditorMaximized={() =>
            setIsEditorMaximized((previous) => !previous)
          }
          onFilterPodsForNode={actions.handleFilterPodsForNode}
          onInspectPod={openInspector}
          onViewAllPods={actions.handleViewAllPods}
          onEditResource={() => setActiveTab("edit")}
          onViewPods={actions.handleViewPodsForWorkload}
          onScale={actions.handleScaleWorkload}
          onRestart={actions.handleRestartWorkload}
          onDelete={actions.handleDeleteWorkload}
          onViewJobs={actions.handleViewJobsForCronJob}
          onTriggerCronJob={actions.handleTriggerCronJob}
          onToggleCronJobSuspend={actions.handleToggleCronJobSuspend}
          onCopyYaml={yaml.copyYaml}
          onDownloadYaml={yaml.downloadYaml}
          onReloadYaml={yaml.handleReloadYaml}
          onClose={requestClose}
          loadConfigMaps={loadConfigMaps}
          loadSecrets={loadSecrets}
          onOpenLogsModal={openLogsModal}
          onOpenExecModal={openExecModal}
        />
      </div>

      {pendingGuard && (
        <div
          data-testid="inspector-discard-guard"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Discard unsaved changes?
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                  The YAML changes for{" "}
                  <span className="font-mono">{currentResource.name}</span> have
                  not been applied. Leaving the Edit tab will discard them.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                data-testid="inspector-keep-editing"
                onClick={() => setPendingGuard(null)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              >
                Keep editing
              </button>
              <button
                type="button"
                data-testid="inspector-discard-changes"
                onClick={continueAfterDiscard}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700"
              >
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
