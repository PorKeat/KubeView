export type SimpleResourceKind =
  | "namespaces"
  | "events"
  | "replicationcontrollers"
  | "endpointslices"
  | "ingressclasses"
  | "persistentvolumeclaims"
  | "horizontalpodautoscalers"
  | "poddisruptionbudgets"
  | "resourcequotas"
  | "limitranges"
  | "priorityclasses"
  | "runtimeclasses"
  | "leases"
  | "mutatingwebhookconfigurations"
  | "validatingwebhookconfigurations"
  | "validatingadmissionpolicies"
  | "validatingadmissionpolicybindings"
  | "helmreleases";

export type SimpleResourceStatusTone =
  "healthy" | "warning" | "critical" | "muted";

export interface SimpleResourceItem {
  name: string;
  namespace?: string;
  status: string;
  statusTone: SimpleResourceStatusTone;
  age: string;
  createdAt: string;
  details: Record<string, string>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface SimpleResourceListResult {
  kind: SimpleResourceKind;
  items: SimpleResourceItem[];
  totalCount: number;
  truncated?: boolean;
}

export interface SimpleResourceCountsResult {
  namespaces: number;
  events: number;
  replicationControllers: number;
  endpointSlices: number;
  ingressClasses: number;
  persistentVolumeClaims: number;
  horizontalPodAutoscalers: number;
  podDisruptionBudgets: number;
  resourceQuotas: number;
  limitRanges: number;
  priorityClasses: number;
  runtimeClasses: number;
  leases: number;
  mutatingWebhookConfigurations: number;
  validatingWebhookConfigurations: number;
  validatingAdmissionPolicies: number;
  validatingAdmissionPolicyBindings: number;
  helmReleases: number;
}
