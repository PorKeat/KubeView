export interface ServiceAccountSummary {
  name: string;
  namespace: string;
  secretNames: string[];
  imagePullSecretNames: string[];
  automount?: boolean;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListServiceAccountsResult {
  items: ServiceAccountSummary[];
  totalCount: number;
}

export interface RBACRuleSummary {
  verbs: string[];
  apiGroups: string[];
  resources: string[];
  resourceNames: string[];
  nonResourceURLs: string[];
}

export interface RBACSubjectSummary {
  kind: string;
  name: string;
  namespace?: string;
}

export interface RBACResourceSummary {
  kind: string;
  name: string;
  namespace?: string;
  roleRef?: string;
  rules: RBACRuleSummary[];
  subjects: RBACSubjectSummary[];
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListRBACResourcesResult {
  items: RBACResourceSummary[];
  totalCount: number;
}

export interface CRDVersionSummary {
  name: string;
  served: boolean;
  storage: boolean;
}

export interface CRDSummary {
  name: string;
  group: string;
  kind: string;
  plural: string;
  scope: string;
  versions: CRDVersionSummary[];
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListCRDsResult {
  items: CRDSummary[];
  totalCount: number;
}

export interface CustomResourceSummary {
  name: string;
  namespace?: string;
  status?: string;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListCustomResourcesResult {
  items: CustomResourceSummary[];
  totalCount: number;
}
