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
