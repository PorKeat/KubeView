"use client";

import type { SelectedResource } from "@/stores/clusterStore";
import type {
  PodSummary,
  PodEventItem,
  NodeSummary,
  DeploymentSummary,
  ReplicaSetSummary,
  StatefulSetSummary,
  DaemonSetSummary,
  JobSummary,
  CronJobSummary,
  ServiceSummary,
  EndpointsSummary,
  IngressSummary,
  GatewayResourceSummary,
  NetworkPolicySummary,
  ConfigMapSummary,
  SecretSummary,
  CRDSummary,
} from "@kubeview/contracts";
import { PodTroubleshootingAssistant } from "@/components/views/troubleshooting";
import { ConfigStorageEditView } from "../tabs/ConfigStorageEditView";
import { InspectorResourceEditor } from "../tabs/InspectorResourceEditor";

import { InspectorNodeOverview } from "../tabs/InspectorNodeOverview";
import { InspectorPodOverview } from "../tabs/InspectorPodOverview";
import { InspectorContainersTab } from "../tabs/InspectorContainersTab";
import { InspectorConditionsTab } from "../tabs/InspectorConditionsTab";
import { InspectorEventsTab } from "../tabs/InspectorEventsTab";
import { InspectorYamlTab } from "../tabs/InspectorYamlTab";
import { InspectorWorkloadOverview } from "../tabs/InspectorWorkloadOverview";
import { InspectorDaemonSetOverview } from "../tabs/InspectorDaemonSetOverview";
import { InspectorJobOverview } from "../tabs/InspectorJobOverview";
import { InspectorCronJobOverview } from "../tabs/InspectorCronJobOverview";
import { InspectorNetworkingOverview } from "../tabs/InspectorNetworkingOverview";
import {
  InspectorConfigStorageOverview,
  type ConfigStorageData,
} from "../tabs/InspectorConfigStorageOverview";
import {
  InspectorAccessOverview,
  type AccessResourceData,
} from "../tabs/InspectorAccessOverview";
import { InspectorCRDInstances } from "../tabs/InspectorCRDInstances";
import {
  InspectorWorkloadConditionsTab,
  type WorkloadConditionLike,
} from "../tabs/InspectorWorkloadConditionsTab";
import type { InspectorTabId } from "../lib/inspectorTabs";

export interface InspectorTabContentProps {
  activeTab: InspectorTabId;
  currentResource: SelectedResource;
  isNode: boolean;
  isAccessResource: boolean;
  isConfigStorageResource: boolean;
  isNetworkingResource: boolean;
  isWorkload: boolean;
  isCRD: boolean;
  isConfigMap: boolean;
  isDeployment: boolean;
  isReplicaSet: boolean;
  isStatefulSet: boolean;
  isDaemonSet: boolean;
  isJob: boolean;
  isCronJob: boolean;
  hasWorkloadConditions: boolean;
  nodeData?: NodeSummary;
  nodePods: PodSummary[];
  accessData?: AccessResourceData;
  configStorageData?: ConfigStorageData;
  editableConfigStorageData?: ConfigMapSummary | SecretSummary;
  networkingData?:
    | ServiceSummary
    | EndpointsSummary
    | IngressSummary
    | GatewayResourceSummary
    | NetworkPolicySummary;
  deploymentData?: DeploymentSummary;
  replicaSetData?: ReplicaSetSummary;
  statefulSetData?: StatefulSetSummary;
  daemonSetData?: DaemonSetSummary;
  jobData?: JobSummary;
  cronJobData?: CronJobSummary;
  workloadConditions: WorkloadConditionLike[];
  podData?: PodSummary;
  podNodeCIDR?: string;
  liveEvents: PodEventItem[];
  liveYaml: string;
  isLoadingYaml: boolean;
  isLoadingEvents: boolean;
  copiedYaml: boolean;
  isEditorMaximized: boolean;
  onToggleEditorMaximized: () => void;
  onFilterPodsForNode: (nodeName: string) => void;
  onInspectPod: (resource: SelectedResource) => void;
  onViewAllPods: () => void;
  onEditResource: () => void;
  onViewPods: () => void;
  onScale: () => void;
  onRestart: () => void;
  onDelete: () => void;
  onViewJobs: () => void;
  onTriggerCronJob: () => void;
  onToggleCronJobSuspend: () => void;
  onCopyYaml: () => void;
  onDownloadYaml: () => void;
  onReloadYaml: () => void;
  onClose: () => void;
  loadConfigMaps: (namespace?: string, contextName?: string) => Promise<void>;
  loadSecrets: (namespace?: string, contextName?: string) => Promise<void>;
  onOpenLogsModal: (pod: {
    name: string;
    namespace: string;
    container?: string;
  }) => void;
  onOpenExecModal: (pod: {
    name: string;
    namespace: string;
    container?: string;
  }) => void;
}

export function InspectorTabContent({
  activeTab,
  currentResource,
  isNode,
  isAccessResource,
  isConfigStorageResource,
  isNetworkingResource,
  isWorkload,
  isCRD,
  isConfigMap,
  isDeployment,
  isReplicaSet,
  isStatefulSet,
  isDaemonSet,
  isJob,
  isCronJob,
  hasWorkloadConditions,
  nodeData,
  nodePods,
  accessData,
  configStorageData,
  editableConfigStorageData,
  networkingData,
  deploymentData,
  replicaSetData,
  statefulSetData,
  daemonSetData,
  jobData,
  cronJobData,
  workloadConditions,
  podData,
  podNodeCIDR,
  liveEvents,
  liveYaml,
  isLoadingYaml,
  isLoadingEvents,
  copiedYaml,
  isEditorMaximized,
  onToggleEditorMaximized,
  onFilterPodsForNode,
  onInspectPod,
  onViewAllPods,
  onEditResource,
  onViewPods,
  onScale,
  onRestart,
  onDelete,
  onViewJobs,
  onTriggerCronJob,
  onToggleCronJobSuspend,
  onCopyYaml,
  onDownloadYaml,
  onReloadYaml,
  onClose,
  loadConfigMaps,
  loadSecrets,
  onOpenLogsModal,
  onOpenExecModal,
}: InspectorTabContentProps) {
  if (activeTab === "edit" && !editableConfigStorageData) {
    return (
      <div className="flex-1 min-h-0 overflow-hidden">
        <InspectorResourceEditor
          currentResource={currentResource}
          isMaximized={isEditorMaximized}
          onToggleMaximize={onToggleEditorMaximized}
        />
      </div>
    );
  }

  if (activeTab === "edit" && editableConfigStorageData) {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ConfigStorageEditView
          currentResource={currentResource}
          data={editableConfigStorageData}
          isEditorMaximized={isEditorMaximized}
          onToggleEditorMaximized={onToggleEditorMaximized}
          onClose={onClose}
          onSaved={() => {
            if (isConfigMap) {
              void loadConfigMaps(currentResource.namespace);
            } else {
              void loadSecrets(currentResource.namespace);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
      {isNode && nodeData ? (
        <InspectorNodeOverview
          nodeData={nodeData}
          nodePods={nodePods}
          onFilterPodsForNode={onFilterPodsForNode}
          onInspectPod={onInspectPod}
          onViewAllPods={onViewAllPods}
        />
      ) : isAccessResource ? (
        <>
          {activeTab === "overview" && accessData && (
            <InspectorAccessOverview
              currentResource={currentResource}
              data={accessData}
            />
          )}
          {isCRD && activeTab === "instances" && accessData && (
            <InspectorCRDInstances crd={accessData as CRDSummary} />
          )}
          {activeTab === "yaml" && (
            <InspectorYamlTab
              yaml={liveYaml}
              isLoading={isLoadingYaml}
              onCopy={onCopyYaml}
              onDownload={onDownloadYaml}
              onRetry={onReloadYaml}
              copiedYaml={copiedYaml}
              resourceName={currentResource?.name}
            />
          )}
        </>
      ) : isConfigStorageResource ? (
        <>
          {activeTab === "overview" && configStorageData && (
            <InspectorConfigStorageOverview
              currentResource={currentResource}
              data={configStorageData}
            />
          )}
          {activeTab === "yaml" && (
            <InspectorYamlTab
              yaml={liveYaml}
              isLoading={isLoadingYaml}
              onCopy={onCopyYaml}
              onDownload={onDownloadYaml}
              onRetry={onReloadYaml}
              copiedYaml={copiedYaml}
              resourceName={currentResource?.name}
            />
          )}
        </>
      ) : isNetworkingResource ? (
        <>
          {activeTab === "overview" && networkingData && (
            <InspectorNetworkingOverview
              currentResource={currentResource}
              data={networkingData}
              onEditResource={onEditResource}
            />
          )}

          {activeTab === "yaml" && (
            <InspectorYamlTab
              yaml={liveYaml}
              isLoading={isLoadingYaml}
              onCopy={onCopyYaml}
              onDownload={onDownloadYaml}
              onRetry={onReloadYaml}
              copiedYaml={copiedYaml}
              resourceName={currentResource?.name}
            />
          )}
        </>
      ) : (
        <>
          {isWorkload ? (
            <>
              {activeTab === "overview" &&
                (isDeployment || isReplicaSet || isStatefulSet ? (
                  <InspectorWorkloadOverview
                    currentResource={currentResource}
                    deployment={deploymentData}
                    replicaSet={replicaSetData}
                    statefulSet={statefulSetData}
                    onViewPods={onViewPods}
                    onScale={onScale}
                    onRestart={
                      isDeployment || isStatefulSet ? onRestart : undefined
                    }
                    onDelete={onDelete}
                  />
                ) : isDaemonSet && daemonSetData ? (
                  <InspectorDaemonSetOverview
                    currentResource={currentResource}
                    daemonSet={daemonSetData}
                    onViewPods={onViewPods}
                    onRestart={onRestart}
                    onDelete={onDelete}
                  />
                ) : isJob && jobData ? (
                  <InspectorJobOverview
                    currentResource={currentResource}
                    job={jobData}
                    onViewPods={onViewPods}
                    onDelete={onDelete}
                  />
                ) : isCronJob && cronJobData ? (
                  <InspectorCronJobOverview
                    currentResource={currentResource}
                    cronJob={cronJobData}
                    onViewJobs={onViewJobs}
                    onTrigger={onTriggerCronJob}
                    onToggleSuspend={onToggleCronJobSuspend}
                    onDelete={onDelete}
                  />
                ) : null)}

              {activeTab === "conditions" && hasWorkloadConditions && (
                <InspectorWorkloadConditionsTab
                  conditions={workloadConditions}
                  kind={currentResource.kind}
                />
              )}
            </>
          ) : (
            <>
              {activeTab === "overview" && (
                <InspectorPodOverview
                  currentResource={currentResource}
                  podData={podData}
                  nodePodCIDR={podNodeCIDR}
                  onOpenLogsModal={onOpenLogsModal}
                  onOpenExecModal={onOpenExecModal}
                />
              )}

              {activeTab === "diagnose" && (
                <PodTroubleshootingAssistant
                  namespace={currentResource.namespace}
                  podName={currentResource.name}
                />
              )}

              {activeTab === "containers" && (
                <InspectorContainersTab
                  currentResource={currentResource}
                  podData={podData}
                  onOpenLogsModal={onOpenLogsModal}
                  onOpenExecModal={onOpenExecModal}
                />
              )}

              {activeTab === "conditions" && (
                <InspectorConditionsTab
                  currentResource={currentResource}
                  podData={podData}
                />
              )}

              {activeTab === "events" && (
                <InspectorEventsTab
                  events={liveEvents}
                  isLoading={isLoadingEvents}
                />
              )}
            </>
          )}

          {activeTab === "yaml" && (
            <InspectorYamlTab
              yaml={liveYaml}
              isLoading={isLoadingYaml}
              onCopy={onCopyYaml}
              onDownload={onDownloadYaml}
              onRetry={onReloadYaml}
              copiedYaml={copiedYaml}
              resourceName={currentResource?.name}
            />
          )}
        </>
      )}
    </div>
  );
}
