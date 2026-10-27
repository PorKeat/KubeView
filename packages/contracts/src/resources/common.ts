export interface ResourceRef {
  clusterId: string;
  apiVersion: string;
  resource: string;
  namespace?: string;
  name: string;
}

export interface ListResourcesRequest {
  clusterId: string;
  apiVersion: string;
  resource: string;
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
  limit?: number;
  continueToken?: string;
}

export interface ResourceList<T = GenericResource> {
  items: T[];
  continueToken?: string | null;
  resourceVersion?: string;
  totalCount?: number;
}

export interface KubeMetadata {
  name: string;
  namespace?: string;
  uid?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  ownerReferences?: Array<{
    apiVersion: string;
    kind: string;
    name: string;
    uid: string;
    controller?: boolean;
    blockOwnerDeletion?: boolean;
  }>;
}

export interface GenericResource {
  apiVersion: string;
  kind: string;
  metadata: KubeMetadata;
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
  data?: Record<string, unknown>;
  stringData?: Record<string, string>;
  [key: string]: unknown;
}

export interface DiffChange {
  path: string;
  type: "added" | "removed" | "modified";
  oldValue?: unknown;
  newValue?: unknown;
  destructive?: boolean;
}

export interface ResourceDiffResult {
  diff: string;
  live: Record<string, unknown>;
  proposed: Record<string, unknown>;
  changes: DiffChange[];
  hasDestructiveChanges: boolean;
}

export interface PatchResourceRequest {
  ref: ResourceRef;
  patch: Record<string, unknown> | unknown[];
  patchType: "strategic" | "merge" | "json";
}
