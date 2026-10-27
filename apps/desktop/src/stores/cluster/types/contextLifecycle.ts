import type {
  ImportKubeconfigParams,
  ImportKubeconfigResult,
  DetectedContextInfo,
  ImportDetectedContextItem,
} from "@kubeview/contracts";

export interface ContextLifecycleSlice {
  switchContext: (contextName: string) => Promise<void>;
  importKubeconfig: (
    params: ImportKubeconfigParams,
  ) => Promise<ImportKubeconfigResult>;
  detectSystemConfigs: () => Promise<DetectedContextInfo[]>;
  importDetectedContexts: (
    contexts: ImportDetectedContextItem[],
  ) => Promise<ImportKubeconfigResult>;
  deleteContext: (contextName: string) => Promise<void>;
  updateEndpoint: (
    contextName: string,
    newServer: string,
    insecure?: boolean,
  ) => Promise<void>;
  clearAllContexts: () => Promise<void>;
}
