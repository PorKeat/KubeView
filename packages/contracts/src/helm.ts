export interface HelmChartSummary {
  name: string;
  version: string;
  appVersion?: string;
  description?: string;
}

export interface HelmChartsResult {
  repositoryUrl: string;
  charts: HelmChartSummary[];
  totalCount: number;
}

export interface HelmRepository {
  id: string;
  name: string;
  url: string;
}

export interface HelmReleaseActionResult {
  name: string;
  namespace: string;
  chart: string;
  chartVersion: string;
  appVersion?: string;
  revision: number;
  status: string;
  description?: string;
}

export interface HelmInstallParams {
  contextName?: string;
  releaseName: string;
  namespace: string;
  repositoryUrl: string;
  chartName: string;
  version?: string;
  values?: string;
  createNamespace?: boolean;
  wait?: boolean;
  timeoutSeconds?: number;
}

export interface HelmUpgradeParams {
  contextName?: string;
  releaseName: string;
  namespace: string;
  repositoryUrl: string;
  chartName: string;
  version?: string;
  values?: string;
  reuseValues?: boolean;
  resetValues?: boolean;
  wait?: boolean;
  timeoutSeconds?: number;
}

export interface HelmRollbackParams {
  contextName?: string;
  releaseName: string;
  namespace: string;
  revision: number;
  wait?: boolean;
  timeoutSeconds?: number;
}

export interface HelmUninstallParams {
  contextName?: string;
  releaseName: string;
  namespace: string;
  keepHistory?: boolean;
  wait?: boolean;
}

export interface HelmReleaseRevision {
  revision: number;
  status: string;
  chart: string;
  chartVersion: string;
  appVersion?: string;
  description?: string;
  updated: string;
}

export interface HelmHistoryResult {
  items: HelmReleaseRevision[];
  totalCount: number;
}

export interface HelmValuesResult {
  values: string;
}
