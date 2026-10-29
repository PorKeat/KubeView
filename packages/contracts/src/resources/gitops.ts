export type GitOpsDriftStatus = "clean" | "changed" | "missing" | "error";

export interface GitOpsScanParams {
  contextName?: string;
  path: string;
}

export interface GitOpsResourceDrift {
  apiVersion: string;
  kind: string;
  resource: string;
  name: string;
  namespace?: string;
  sourceFile: string;
  status: GitOpsDriftStatus;
  desiredYaml: string;
  liveYaml?: string;
  message?: string;
}

export interface GitOpsDriftReport {
  contextName: string;
  path: string;
  scannedAt: string;
  total: number;
  clean: number;
  changed: number;
  missing: number;
  errors: number;
  resources: GitOpsResourceDrift[];
}
