import type {
  JobSummary,
  CronJobSummary,
  JobActionParams,
  CronJobActionParams,
  JobCloneParams,
  JobCloneResult,
} from "@kubeview/contracts";

export interface JobsSlice {
  // Job workloads
  jobs: JobSummary[];
  totalJobsCount: number;
  isJobsLoading: boolean;
  hasLoadedJobsOnce: boolean;
  jobOwnerFilter: string | null;
  setJobOwnerFilter: (owner: string | null) => void;
  jobsViewMode: "jobs" | "cronjobs";
  setJobsViewMode: (mode: "jobs" | "cronjobs") => void;

  // CronJob workloads
  cronJobs: CronJobSummary[];
  totalCronJobsCount: number;
  isCronJobsLoading: boolean;
  hasLoadedCronJobsOnce: boolean;

  loadJobs: (namespace?: string, contextName?: string) => Promise<void>;
  loadCronJobs: (namespace?: string, contextName?: string) => Promise<void>;

  deleteJob: (params: JobActionParams) => Promise<void>;
  retryJob: (params: JobCloneParams) => Promise<JobCloneResult>;
  cloneJob: (params: JobCloneParams) => Promise<JobCloneResult>;
  deleteCronJob: (params: CronJobActionParams) => Promise<void>;
  suspendCronJob: (params: CronJobActionParams) => Promise<void>;
  resumeCronJob: (params: CronJobActionParams) => Promise<void>;
  triggerCronJob: (params: CronJobActionParams) => Promise<string>;
}
