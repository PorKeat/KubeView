import type {
  ServiceAccountSummary,
  RBACResourceSummary,
  CRDSummary,
} from "@kubeview/contracts";

export interface AccessSlice {
  // Service Accounts
  serviceAccounts: ServiceAccountSummary[];
  totalServiceAccountsCount: number;
  isServiceAccountsLoading: boolean;
  hasLoadedServiceAccountsOnce: boolean;

  // RBAC
  rbacResources: RBACResourceSummary[];
  totalRBACResourcesCount: number;
  isRBACResourcesLoading: boolean;
  hasLoadedRBACResourcesOnce: boolean;

  // Custom Resource Definitions
  crds: CRDSummary[];
  totalCRDsCount: number;
  isCRDsLoading: boolean;
  hasLoadedCRDsOnce: boolean;

  loadServiceAccounts: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  loadRBACResources: (
    namespace?: string,
    contextName?: string,
  ) => Promise<void>;
  loadCRDs: (contextName?: string) => Promise<void>;
}
