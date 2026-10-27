import type {
  DiagnosticResult,
  ProviderType,
  DetectedContextInfo,
} from "@kubeview/contracts";

export interface ClusterContextInfo {
  name: string;
  cluster: string;
  server: string;
  provider: ProviderType;
  status: "connected" | "degraded" | "offline" | "checking";
  latencyMs: number;
  namespace?: string;
  authType?: string;
}

export interface ContextsSlice {
  availableContexts: ClusterContextInfo[];
  availableNamespaces: string[];
  configPath: string;
  diagnosticResult: DiagnosticResult | null;

  // OS Auto-Detected Kubeconfig Contexts
  detectedSystemConfigs: DetectedContextInfo[];
  isDetectingConfigs: boolean;

  // Actions
  loadContexts: () => Promise<void>;
  diagnoseContext: (contextName?: string) => Promise<DiagnosticResult | null>;
  loadNamespaces: (contextName?: string) => Promise<void>;
}
