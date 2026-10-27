import type { StateCreator } from "zustand";

import type { ClusterState } from "../types/cluster";
import type { ModalsSlice } from "../types/modals";

export const createModalsSlice: StateCreator<
  ClusterState,
  [],
  [],
  ModalsSlice
> = (set) => ({
  logsModalPod: null,
  execModalPod: null,
  deleteConfirmPod: null,
  restartConfirmPod: null,
  bulkDeleteConfirmPods: null,
  bulkRestartConfirmPods: null,
  openLogsModal: (pod) => set({ logsModalPod: pod }),
  closeLogsModal: () => set({ logsModalPod: null }),
  openExecModal: (pod) => set({ execModalPod: pod }),
  closeExecModal: () => set({ execModalPod: null }),
  openDeleteConfirm: (pod) => set({ deleteConfirmPod: pod }),
  closeDeleteConfirm: () => set({ deleteConfirmPod: null }),
  openRestartConfirm: (pod) => set({ restartConfirmPod: pod }),
  closeRestartConfirm: () => set({ restartConfirmPod: null }),
  openBulkDeleteConfirm: (pods) => set({ bulkDeleteConfirmPods: pods }),
  closeBulkDeleteConfirm: () => set({ bulkDeleteConfirmPods: null }),
  openBulkRestartConfirm: (pods) => set({ bulkRestartConfirmPods: pods }),
  closeBulkRestartConfirm: () => set({ bulkRestartConfirmPods: null }),
});
