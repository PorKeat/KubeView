"use client";

import { toast } from "sonner";
import { useClusterStore, type SelectedResource } from "@/stores/clusterStore";
import { useTabStore } from "@/stores/tabStore";
import type {
  DeploymentSummary,
  ReplicaSetSummary,
  StatefulSetSummary,
  DaemonSetSummary,
  JobSummary,
  CronJobSummary,
} from "@kubeview/contracts";
import { formatLabelSelector } from "@/lib/labelSelector";

export interface UseInspectorActionsOptions {
  currentResource: SelectedResource | null;
  isDeployment: boolean;
  isReplicaSet: boolean;
  isStatefulSet: boolean;
  isDaemonSet: boolean;
  isJob: boolean;
  isCronJob: boolean;
  isWorkload: boolean;
  deploymentData?: DeploymentSummary;
  replicaSetData?: ReplicaSetSummary;
  statefulSetData?: StatefulSetSummary;
  daemonSetData?: DaemonSetSummary;
  jobData?: JobSummary;
  cronJobData?: CronJobSummary;
}

export function useInspectorActions({
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
}: UseInspectorActionsOptions) {
  const {
    setCurrentNamespace,
    setPodNodeFilter,
    setPodLabelFilter,
    setJobOwnerFilter,
    setJobsViewMode,
    loadPods,
    loadJobs,
    openWorkloadAction,
    closeInspector,
  } = useClusterStore();
  const { openTab } = useTabStore();

  const handleFilterPodsForNode = (nodeName: string) => {
    setCurrentNamespace("all");
    setPodNodeFilter(nodeName);
    loadPods("all");
    openTab({
      id: "pods",
      title: `Pods (${nodeName})`,
      icon: "Box",
      closable: true,
    });
    toast.info(`Filtered pods view to node: ${nodeName}`);
    closeInspector();
  };

  const handleViewAllPods = () => {
    setCurrentNamespace("all");
    setPodNodeFilter(null);
    loadPods("all");
    openTab({
      id: "pods",
      title: "Pods",
      icon: "Box",
      closable: true,
    });
    closeInspector();
  };

  const handleViewPodsForWorkload = () => {
    if (!currentResource || !isWorkload || isCronJob) return;
    const selector = formatLabelSelector(
      deploymentData?.selector ??
        replicaSetData?.selector ??
        statefulSetData?.selector ??
        daemonSetData?.selector ??
        jobData?.selector,
    );
    setCurrentNamespace(currentResource.namespace);
    setPodNodeFilter(null);
    setPodLabelFilter(
      selector || null,
      `${currentResource.kind}: ${currentResource.name}`,
    );
    loadPods(currentResource.namespace);
    openTab({ id: "pods", title: "Pods", closable: true });
    toast.info(
      selector
        ? `Filtered pods by ${currentResource.kind.toLowerCase()} '${currentResource.name}'`
        : `Opened pods in namespace '${currentResource.namespace}'`,
    );
    closeInspector();
  };

  const handleScaleWorkload = () => {
    if (!currentResource) return;
    if (isDeployment) {
      openWorkloadAction({
        kind: "Deployment",
        action: "scale",
        name: currentResource.name,
        namespace: currentResource.namespace,
        replicas: deploymentData?.desiredReplicas ?? 1,
      });
      return;
    }
    if (isReplicaSet) {
      openWorkloadAction({
        kind: "ReplicaSet",
        action: "scale",
        name: currentResource.name,
        namespace: currentResource.namespace,
        replicas: replicaSetData?.desiredReplicas ?? 1,
        ownerDeployment: replicaSetData?.ownerDeployment,
      });
      return;
    }
    if (isStatefulSet) {
      openWorkloadAction({
        kind: "StatefulSet",
        action: "scale",
        name: currentResource.name,
        namespace: currentResource.namespace,
        replicas: statefulSetData?.desiredReplicas ?? 1,
        serviceName: statefulSetData?.serviceName,
        podManagementPolicy: statefulSetData?.podManagementPolicy,
        updateStrategy: statefulSetData?.updateStrategy,
        partition: statefulSetData?.partition,
        maxUnavailable: statefulSetData?.maxUnavailable,
        pvcRetentionWhenDeleted:
          statefulSetData?.persistentVolumeClaimRetentionWhenDeleted,
        pvcRetentionWhenScaled:
          statefulSetData?.persistentVolumeClaimRetentionWhenScaled,
      });
    }
  };

  const handleRestartWorkload = () => {
    if (!currentResource) return;
    if (isDeployment) {
      openWorkloadAction({
        kind: "Deployment",
        action: "restart",
        name: currentResource.name,
        namespace: currentResource.namespace,
      });
      return;
    }
    if (isStatefulSet) {
      openWorkloadAction({
        kind: "StatefulSet",
        action: "restart",
        name: currentResource.name,
        namespace: currentResource.namespace,
        serviceName: statefulSetData?.serviceName,
        podManagementPolicy: statefulSetData?.podManagementPolicy,
        updateStrategy: statefulSetData?.updateStrategy,
        partition: statefulSetData?.partition,
        maxUnavailable: statefulSetData?.maxUnavailable,
        pvcRetentionWhenDeleted:
          statefulSetData?.persistentVolumeClaimRetentionWhenDeleted,
        pvcRetentionWhenScaled:
          statefulSetData?.persistentVolumeClaimRetentionWhenScaled,
      });
      return;
    }
    if (isDaemonSet) {
      openWorkloadAction({
        kind: "DaemonSet",
        action: "restart",
        name: currentResource.name,
        namespace: currentResource.namespace,
        updateStrategy: daemonSetData?.updateStrategy,
        maxUnavailable: daemonSetData?.maxUnavailable,
        maxSurge: daemonSetData?.maxSurge,
      });
    }
  };

  const handleDeleteWorkload = () => {
    if (!currentResource) return;
    if (isDeployment) {
      openWorkloadAction({
        kind: "Deployment",
        action: "delete",
        name: currentResource.name,
        namespace: currentResource.namespace,
      });
      return;
    }
    if (isReplicaSet) {
      openWorkloadAction({
        kind: "ReplicaSet",
        action: "delete",
        name: currentResource.name,
        namespace: currentResource.namespace,
        ownerDeployment: replicaSetData?.ownerDeployment,
      });
      return;
    }
    if (isStatefulSet) {
      openWorkloadAction({
        kind: "StatefulSet",
        action: "delete",
        name: currentResource.name,
        namespace: currentResource.namespace,
        serviceName: statefulSetData?.serviceName,
        podManagementPolicy: statefulSetData?.podManagementPolicy,
        updateStrategy: statefulSetData?.updateStrategy,
        partition: statefulSetData?.partition,
        maxUnavailable: statefulSetData?.maxUnavailable,
        pvcRetentionWhenDeleted:
          statefulSetData?.persistentVolumeClaimRetentionWhenDeleted,
        pvcRetentionWhenScaled:
          statefulSetData?.persistentVolumeClaimRetentionWhenScaled,
      });
      return;
    }
    if (isDaemonSet) {
      openWorkloadAction({
        kind: "DaemonSet",
        action: "delete",
        name: currentResource.name,
        namespace: currentResource.namespace,
        updateStrategy: daemonSetData?.updateStrategy,
        maxUnavailable: daemonSetData?.maxUnavailable,
        maxSurge: daemonSetData?.maxSurge,
      });
      return;
    }
    if (isJob) {
      openWorkloadAction({
        kind: "Job",
        action: "delete",
        name: currentResource.name,
        namespace: currentResource.namespace,
        ownerCronJob: jobData?.ownerCronJob,
        active: jobData?.active,
      });
      return;
    }
    if (isCronJob) {
      openWorkloadAction({
        kind: "CronJob",
        action: "delete",
        name: currentResource.name,
        namespace: currentResource.namespace,
        schedule: cronJobData?.schedule,
        suspend: cronJobData?.suspend,
        concurrencyPolicy: cronJobData?.concurrencyPolicy,
      });
    }
  };

  const handleViewJobsForCronJob = () => {
    if (!currentResource || !isCronJob || !cronJobData) return;
    setJobOwnerFilter(cronJobData.name);
    setJobsViewMode("jobs");
    loadJobs(cronJobData.namespace);
    openTab({ id: "jobs", title: "Jobs & CronJobs", closable: true });
    toast.info(`Showing Jobs owned by CronJob '${cronJobData.name}'`);
    closeInspector();
  };

  const handleToggleCronJobSuspend = () => {
    if (!currentResource || !isCronJob || !cronJobData) return;
    openWorkloadAction({
      kind: "CronJob",
      action: cronJobData.suspend ? "resume" : "suspend",
      name: currentResource.name,
      namespace: currentResource.namespace,
      schedule: cronJobData.schedule,
      suspend: cronJobData.suspend,
      concurrencyPolicy: cronJobData.concurrencyPolicy,
    });
  };

  const handleTriggerCronJob = () => {
    if (!currentResource || !isCronJob || !cronJobData) return;
    openWorkloadAction({
      kind: "CronJob",
      action: "trigger",
      name: currentResource.name,
      namespace: currentResource.namespace,
      schedule: cronJobData.schedule,
      suspend: cronJobData.suspend,
      concurrencyPolicy: cronJobData.concurrencyPolicy,
    });
  };

  return {
    handleFilterPodsForNode,
    handleViewAllPods,
    handleViewPodsForWorkload,
    handleScaleWorkload,
    handleRestartWorkload,
    handleDeleteWorkload,
    handleViewJobsForCronJob,
    handleToggleCronJobSuspend,
    handleTriggerCronJob,
  };
}
