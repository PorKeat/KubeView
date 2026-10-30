import type {
  PodSummary,
  PodLogsParams,
  PodLogsResult,
  DeletePodParams,
  RestartPodParams,
  MovePodParams,
  MovePodResult,
  ExecPodParams,
  ExecPodResult,
} from "@kubeview/contracts";

export interface PodsSlice {
  pods: PodSummary[];
  totalPodsCount: number;
  isPodsLoading: boolean;
  hasLoadedPodsOnce: boolean;
  podNodeFilter: string | null;
  setPodNodeFilter: (nodeName: string | null) => void;
  podLabelFilter: string | null;
  podLabelFilterSource: string | null;
  setPodLabelFilter: (selector: string | null, source?: string | null) => void;

  loadPods: (namespace?: string, contextName?: string) => Promise<void>;
  getPodLogs: (params: PodLogsParams) => Promise<PodLogsResult>;
  deletePod: (params: DeletePodParams) => Promise<void>;
  restartPod: (params: RestartPodParams) => Promise<void>;
  movePod: (params: MovePodParams) => Promise<MovePodResult>;
  bulkDeletePods: (
    pods: { name: string; namespace: string }[],
    force?: boolean,
  ) => Promise<{ succeeded: number; failed: number }>;
  bulkRestartPods: (
    pods: { name: string; namespace: string }[],
  ) => Promise<{ succeeded: number; failed: number }>;
  execPod: (params: ExecPodParams) => Promise<ExecPodResult>;
}
