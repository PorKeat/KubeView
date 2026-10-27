"use client";

import * as React from "react";
import { useClusterStore } from "@/stores/clusterStore";
import { cn } from "@/lib/utils";

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
    openLogsModal,
    openExecModal,
    openRestartConfirm,
    openDeleteConfirm,
    loadConfigMaps,
    loadSecrets,
    openInspector,
  } = useClusterStore();

  const [activeTab, setActiveTab] = React.useState<InspectorTabId>("overview");

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

  // Reset to the overview tab whenever a different resource is inspected.
  React.useEffect(() => {
    setActiveTab(
      currentResource?.initialTab === "edit" && canEditConfigStorage
        ? "edit"
        : "overview",
    );
  }, [
    currentResource?.kind,
    currentResource?.name,
    currentResource?.initialTab,
    canEditConfigStorage,
  ]);

  useInspectorEscapeClose(isInspectorOpen, closeInspector);

  if (!isRendered || !currentResource) return null;

  const hasWorkloadConditions =
    isDeployment || isReplicaSet || isStatefulSet || isDaemonSet || isJob;
  const inspectorTabs = getInspectorTabs({
    isConfigStorageResource,
    canEditConfigStorage,
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
        onClick={closeInspector}
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
          "fixed inset-y-0 right-0 z-40 w-full max-w-xl md:max-w-2xl glass-panel border-l border-[var(--border)] shadow-2xl flex flex-col select-none backdrop-blur-xl",
          "transform transition-transform motion-reduce:transition-none motion-reduce:transform-none",
          isMounted
            ? "translate-x-0 duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
            : "translate-x-full duration-200 ease-in",
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
          onClose={closeInspector}
          onOpenLogsModal={openLogsModal}
          onOpenExecModal={openExecModal}
          onOpenRestartConfirm={openRestartConfirm}
          onOpenDeleteConfirm={openDeleteConfirm}
        />

        {/* Segmented Tabs Bar (Pods and Workloads) */}
        {!isNode && (
          <InspectorTabBar
            tabs={inspectorTabs}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
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
          onFilterPodsForNode={actions.handleFilterPodsForNode}
          onInspectPod={openInspector}
          onViewAllPods={actions.handleViewAllPods}
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
          onClose={closeInspector}
          loadConfigMaps={loadConfigMaps}
          loadSecrets={loadSecrets}
          onOpenLogsModal={openLogsModal}
          onOpenExecModal={openExecModal}
        />
      </div>
    </div>
  );
}
