export interface PodModalTarget {
  name: string;
  namespace: string;
  container?: string;
}

export interface MovePodTarget {
  name: string;
  namespace: string;
  nodeName?: string;
  controlledBy?: string;
}

export interface ModalsSlice {
  // Action modals for Pods
  logsModalPod: PodModalTarget | null;
  execModalPod: PodModalTarget | null;
  deleteConfirmPod: { name: string; namespace: string } | null;
  restartConfirmPod: { name: string; namespace: string } | null;
  movePodTarget: MovePodTarget | null;
  bulkDeleteConfirmPods: { name: string; namespace: string }[] | null;
  bulkRestartConfirmPods: { name: string; namespace: string }[] | null;

  openLogsModal: (pod: PodModalTarget) => void;
  closeLogsModal: () => void;
  openExecModal: (pod: PodModalTarget) => void;
  closeExecModal: () => void;
  openDeleteConfirm: (pod: { name: string; namespace: string }) => void;
  closeDeleteConfirm: () => void;
  openRestartConfirm: (pod: { name: string; namespace: string }) => void;
  closeRestartConfirm: () => void;
  openMovePod: (pod: MovePodTarget) => void;
  closeMovePod: () => void;
  openBulkDeleteConfirm: (pods: { name: string; namespace: string }[]) => void;
  closeBulkDeleteConfirm: () => void;
  openBulkRestartConfirm: (pods: { name: string; namespace: string }[]) => void;
  closeBulkRestartConfirm: () => void;
}
