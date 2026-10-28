export type PermissionSubjectKind = "User" | "Group" | "ServiceAccount";

export interface PermissionSubject {
  kind: PermissionSubjectKind;
  name: string;
  namespace?: string;
  groups?: string[];
}

export interface PermissionRule {
  verbs: string[];
  apiGroups: string[];
  resources: string[];
  resourceNames: string[];
  nonResourceURLs: string[];
}

export interface PermissionBindingSubject {
  kind: string;
  name: string;
  namespace?: string;
}

export interface PermissionBindingEvidence {
  kind: string;
  name: string;
  namespace?: string;
  roleKind: string;
  roleName: string;
  subjects: PermissionBindingSubject[];
}

export interface PermissionRuleEvidence extends PermissionRule {
  scope: "cluster" | "namespace";
  namespace?: string;
  bindingKind: string;
  bindingName: string;
  roleKind: string;
  roleName: string;
  ruleIndex: number;
}

export interface PermissionNamespaceAccess {
  namespace: string;
  clusterWide: boolean;
  ruleCount: number;
  verbs: string[];
}

export interface PermissionEffectiveResult {
  subject: PermissionSubject;
  clusterRules: PermissionRuleEvidence[];
  namespaceRules: PermissionRuleEvidence[];
  namespaces: PermissionNamespaceAccess[];
  bindings: PermissionBindingEvidence[];
  warnings: string[];
  generatedAt: string;
}

export interface PermissionOperation {
  namespace?: string;
  verb: string;
  apiGroup?: string;
  resource?: string;
  subresource?: string;
  resourceName?: string;
  nonResourceURL?: string;
  clusterScoped?: boolean;
}

export interface PermissionAccessReview {
  allowed: boolean;
  authoritative: boolean;
  reason?: string;
  evaluationError?: string;
}

export interface PermissionDecision {
  allowed: boolean;
  reason: string;
  summary: string;
  matchedRules: PermissionRuleEvidence[];
  matchedBindings: PermissionBindingEvidence[];
  sar?: PermissionAccessReview;
  warnings: string[];
}

export interface PermissionEffectiveParams {
  contextName?: string;
  subject: PermissionSubject;
}

export interface PermissionExplainParams {
  contextName?: string;
  subject: PermissionSubject;
  operation: PermissionOperation;
}
