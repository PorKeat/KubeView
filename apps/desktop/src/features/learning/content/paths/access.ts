import type { LearningPath } from "../../types";

export const accessPath: LearningPath = {
  id: "access",
  title: "Understand permissions",
  description:
    "Learn who KubeView is acting as, what RBAC allows, and how to turn a denial into a precise request.",
  icon: "shield",
  lessons: [
    {
      id: "know-your-identity",
      title: "Know who you are",
      summary:
        "Every Kubernetes request runs as an identity. A kubeconfig context chooses the cluster and usually the user.",
      minutes: 3,
      goal: "Check the current Kubernetes identity before assuming the cluster is broken.",
      steps: [
        "Open Permissions Checker to see the current identity KubeView is using.",
        "The context switcher selects the cluster and kubeconfig user.",
        "A workload inside the cluster can use a completely different identity: a ServiceAccount.",
        "Forbidden errors are about permissions, not about the resource being missing.",
      ],
      command: "kubectl auth whoami",
      commandNote:
        "If your cluster does not support SelfSubjectReview, inspect the kubeconfig user instead.",
      deepDive:
        "KubeView calls SelfSubjectReview for the active identity and uses SelfSubjectAccessReview for permission checks.",
      action: {
        label: "Open Permissions Checker",
        tabId: "permissions",
        tabTitle: "Permissions Checker",
      },
      check: {
        question: "What does a 403 Forbidden response usually mean?",
        options: [
          { id: "missing", label: "The resource does not exist" },
          { id: "permission", label: "The identity is not allowed to do it" },
          { id: "offline", label: "The cluster is offline" },
        ],
        correctOptionId: "permission",
        explanation:
          "The API server understood the request but rejected it for the current identity.",
      },
    },
    {
      id: "roles-and-bindings",
      title: "Roles say what, bindings say who",
      summary:
        "A Role or ClusterRole lists permissions. A RoleBinding or ClusterRoleBinding attaches those permissions to a subject.",
      minutes: 4,
      goal: "Read an RBAC chain from subject to verb to resource.",
      steps: [
        "A Role lives in one namespace. A ClusterRole can apply across the cluster.",
        "A binding connects a subject such as a user, group, or ServiceAccount.",
        "Rules list API groups, resources, and verbs such as get, list, or create.",
        "Having a Role without a binding grants nothing.",
      ],
      command: "kubectl get rolebinding <name> -n <namespace> -o yaml",
      commandNote:
        "KubeView lists Roles, ClusterRoles, and their bindings under Roles & Bindings.",
      deepDive:
        "RBAC is additive. There are no deny rules. A permission is allowed when at least one binding grants it.",
      action: {
        label: "Open Roles & Bindings",
        tabId: "rbac",
        tabTitle: "Roles & Bindings",
      },
      check: {
        question:
          "You created a Role but access is still denied. What is likely missing?",
        options: [
          { id: "binding", label: "A RoleBinding or ClusterRoleBinding" },
          { id: "namespace", label: "A second namespace" },
          { id: "service", label: "A Service" },
        ],
        correctOptionId: "binding",
        explanation:
          "A Role only grants when a binding attaches it to the identity making the request.",
      },
    },
    {
      id: "debug-a-denial",
      title: "Turn a denial into a precise question",
      summary:
        "Use the denied verb, resource, namespace, and identity to ask for exactly the access you need.",
      minutes: 3,
      goal: "Avoid asking for cluster-admin when one namespaced permission would solve the problem.",
      steps: [
        "Read the missing verb and resource from the error or permission check.",
        "Check whether the resource is namespaced or cluster-scoped.",
        "Use the Permissions Checker to test the operation directly.",
        "Ask for the smallest Role and binding that grants that operation.",
      ],
      command: "kubectl auth can-i <verb> <resource> -n <namespace>",
      commandNote:
        "KubeView's Why denied action opens a prefilled permission check from a forbidden error.",
      deepDive:
        "SubjectAccessReview asks about another subject. SelfSubjectAccessReview asks about the current caller and is what KubeView uses for the visible checker.",
      action: {
        label: "Test a Permission",
        tabId: "permissions",
        tabTitle: "Permissions Checker",
      },
      check: {
        question: "What is the safest access request after a denial?",
        options: [
          { id: "admin", label: "Cluster-admin for the current user" },
          {
            id: "least",
            label: "The smallest verb and resource scope needed",
          },
          { id: "secret", label: "Access to every Secret in the cluster" },
        ],
        correctOptionId: "least",
        explanation:
          "Least privilege limits the blast radius and is easier for an administrator to approve.",
      },
    },
  ],
};
