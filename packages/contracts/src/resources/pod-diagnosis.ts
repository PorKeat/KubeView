import type {
  ContainerResourceItem,
  PodConditionItem,
  PodEventItem,
} from "./pods.js";

export type PodDiagnosisSeverity = "healthy" | "info" | "warning" | "critical";
export type PodDiagnosisStatus = "pass" | "warning" | "fail" | "skipped";

export interface DiagnosePodParams {
  contextName?: string;
  namespace: string;
  podName: string;
}

export interface PodProbeDiagnosis {
  kind: "readiness" | "liveness" | "startup";
  configured: boolean;
  handler?: string;
  initialDelaySeconds?: number;
  timeoutSeconds?: number;
  periodSeconds?: number;
  failureThreshold?: number;
  successThreshold?: number;
  status: PodDiagnosisStatus;
  message?: string;
}

export interface PodContainerDiagnosis {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  state: string;
  stateReason?: string;
  stateMessage?: string;
  exitCode?: number;
  lastTerminatedReason?: string;
  lastTerminatedMessage?: string;
  requests?: ContainerResourceItem;
  limits?: ContainerResourceItem;
  cpuUsageMillicores?: number;
  memoryUsageBytes?: number;
  metricsAvailable: boolean;
  probes: PodProbeDiagnosis[];
  logExcerpt?: string;
  logSource?: "current" | "previous";
  logError?: string;
}

export interface PodDiagnosisEvidence {
  id: string;
  label: string;
  status: PodDiagnosisStatus;
  summary: string;
  details?: string[];
}

export interface PodDiagnosisCommand {
  label: string;
  command: string;
  description?: string;
}

export interface PodDiagnosisFix {
  id: string;
  title: string;
  description: string;
  severity: PodDiagnosisSeverity;
}

export interface PodDiagnosisResult {
  contextName: string;
  namespace: string;
  podName: string;
  generatedAt: string;
  severity: PodDiagnosisSeverity;
  issueType: string;
  healthy: boolean;
  title: string;
  summary: string;
  rootCause: string;
  ownerKind?: string;
  ownerName?: string;
  nodeName?: string;
  conditions: PodConditionItem[];
  containers: PodContainerDiagnosis[];
  events: PodEventItem[];
  evidence: PodDiagnosisEvidence[];
  suggestedCommands: PodDiagnosisCommand[];
  suggestedFixes: PodDiagnosisFix[];
}
