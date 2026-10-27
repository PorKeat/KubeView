export interface ConfigMapSummary {
  name: string;
  namespace: string;
  keys: string[];
  dataKeyCount: number;
  binaryKeyCount: number;
  sizeBytes: number;
  immutable: boolean;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListConfigMapsResult {
  items: ConfigMapSummary[];
  totalCount: number;
}

export interface SecretSummary {
  name: string;
  namespace: string;
  type: string;
  keys: string[];
  dataKeyCount: number;
  sizeBytes: number;
  immutable: boolean;
  metadataOnly?: boolean;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListSecretsResult {
  items: SecretSummary[];
  totalCount: number;
}

export interface PersistentVolumeSummary {
  name: string;
  capacity: string;
  accessModes: string[];
  reclaimPolicy: string;
  status: string;
  claim?: string;
  storageClass?: string;
  volumeMode?: string;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListPersistentVolumesResult {
  items: PersistentVolumeSummary[];
  totalCount: number;
}

export interface StorageClassSummary {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  allowVolumeExpansion: boolean;
  default: boolean;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ListStorageClassesResult {
  items: StorageClassSummary[];
  totalCount: number;
}

export interface ConfigMapEditData {
  name: string;
  namespace: string;
  resourceVersion: string;
  immutable: boolean;
  data: Record<string, string>;
  binaryData?: Record<string, string>;
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface SecretEditEntry {
  key: string;
  value: string;
  binary: boolean;
}

export interface SecretEditData {
  name: string;
  namespace: string;
  resourceVersion: string;
  immutable: boolean;
  type: string;
  entries: SecretEditEntry[];
  age: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ConfigMapUpdateParams {
  contextName?: string;
  namespace: string;
  name: string;
  resourceVersion: string;
  data: Record<string, string>;
  binaryData?: Record<string, string>;
}

export interface SecretUpdateParams {
  contextName?: string;
  namespace: string;
  name: string;
  resourceVersion: string;
  entries: SecretEditEntry[];
}

export interface ConfigStorageUpdateResult {
  resourceVersion: string;
}
