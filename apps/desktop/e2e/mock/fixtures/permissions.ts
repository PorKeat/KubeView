import { now } from "./shared";

export const permissionSubject = {
  kind: "User",
  name: "kubernetes-admin",
  groups: ["system:authenticated", "kubeview:developers"],
};

export const permissionNamespaceRule = {
  scope: "namespace",
  namespace: "production",
  bindingKind: "RoleBinding",
  bindingName: "read-pods",
  roleKind: "Role",
  roleName: "pod-reader",
  ruleIndex: 0,
  verbs: ["get", "list"],
  apiGroups: [""],
  resources: ["pods"],
  resourceNames: [],
  nonResourceURLs: [],
};

export const permissionClusterRule = {
  scope: "cluster",
  bindingKind: "ClusterRoleBinding",
  bindingName: "default-view",
  roleKind: "ClusterRole",
  roleName: "view",
  ruleIndex: 0,
  verbs: ["get", "list", "watch"],
  apiGroups: [""],
  resources: ["pods", "services"],
  resourceNames: [],
  nonResourceURLs: [],
};

export const permissionRoleBinding = {
  kind: "RoleBinding",
  name: "read-pods",
  namespace: "production",
  roleKind: "Role",
  roleName: "pod-reader",
  subjects: [{ kind: "User", name: "kubernetes-admin" }],
};

export const permissionClusterBinding = {
  kind: "ClusterRoleBinding",
  name: "default-view",
  roleKind: "ClusterRole",
  roleName: "view",
  subjects: [{ kind: "Group", name: "kubeview:developers" }],
};

export const permissionEffective = {
  subject: permissionSubject,
  clusterRules: [permissionClusterRule],
  namespaceRules: [permissionNamespaceRule],
  namespaces: [
    {
      namespace: "production",
      clusterWide: true,
      ruleCount: 2,
      verbs: ["get", "list", "watch"],
    },
  ],
  bindings: [permissionRoleBinding, permissionClusterBinding],
  warnings: [],
  generatedAt: now,
};

export const permissionDecision = {
  allowed: true,
  reason: "sar_allowed",
  summary:
    "RoleBinding production/read-pods grants get on pods to User kubernetes-admin.",
  matchedRules: [permissionNamespaceRule],
  matchedBindings: [permissionRoleBinding],
  sar: {
    allowed: true,
    authoritative: true,
    reason: "RBAC: allowed by RoleBinding production/read-pods",
  },
  warnings: [],
};
