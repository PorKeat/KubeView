import type {
  ConfigMapSummary,
  SecretSummary,
  PersistentVolumeSummary,
  StorageClassSummary,
} from "@kubeview/contracts";

export interface ConfigStorageSlice {
  // ConfigMaps
  configMaps: ConfigMapSummary[];
  totalConfigMapsCount: number;
  isConfigMapsLoading: boolean;
  hasLoadedConfigMapsOnce: boolean;

  // Secrets
  secrets: SecretSummary[];
  totalSecretsCount: number;
  isSecretsLoading: boolean;
  hasLoadedSecretsOnce: boolean;

  // Persistent Volumes
  persistentVolumes: PersistentVolumeSummary[];
  totalPersistentVolumesCount: number;
  isPersistentVolumesLoading: boolean;
  hasLoadedPersistentVolumesOnce: boolean;

  // Storage Classes
  storageClasses: StorageClassSummary[];
  totalStorageClassesCount: number;
  isStorageClassesLoading: boolean;
  hasLoadedStorageClassesOnce: boolean;

  loadConfigMaps: (namespace?: string, contextName?: string) => Promise<void>;
  loadSecrets: (namespace?: string, contextName?: string) => Promise<void>;
  loadPersistentVolumes: (contextName?: string) => Promise<void>;
  loadStorageClasses: (contextName?: string) => Promise<void>;
}
