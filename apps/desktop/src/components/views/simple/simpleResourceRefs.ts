import type { SimpleResourceKind } from "@kubeview/contracts";

export interface SimpleResourceRef {
  apiVersion: string;
  kind: string;
  resource: string;
  namespaced: boolean;
}

export const SIMPLE_RESOURCE_REFS: Partial<
  Record<SimpleResourceKind, SimpleResourceRef>
> = {
  namespaces: {
    apiVersion: "v1",
    kind: "Namespace",
    resource: "namespaces",
    namespaced: false,
  },
  events: {
    apiVersion: "v1",
    kind: "Event",
    resource: "events",
    namespaced: true,
  },
  replicationcontrollers: {
    apiVersion: "v1",
    kind: "ReplicationController",
    resource: "replicationcontrollers",
    namespaced: true,
  },
  endpointslices: {
    apiVersion: "discovery.k8s.io/v1",
    kind: "EndpointSlice",
    resource: "endpointslices",
    namespaced: true,
  },
  ingressclasses: {
    apiVersion: "networking.k8s.io/v1",
    kind: "IngressClass",
    resource: "ingressclasses",
    namespaced: false,
  },
  persistentvolumeclaims: {
    apiVersion: "v1",
    kind: "PersistentVolumeClaim",
    resource: "persistentvolumeclaims",
    namespaced: true,
  },
  horizontalpodautoscalers: {
    apiVersion: "autoscaling/v2",
    kind: "HorizontalPodAutoscaler",
    resource: "horizontalpodautoscalers",
    namespaced: true,
  },
  poddisruptionbudgets: {
    apiVersion: "policy/v1",
    kind: "PodDisruptionBudget",
    resource: "poddisruptionbudgets",
    namespaced: true,
  },
  resourcequotas: {
    apiVersion: "v1",
    kind: "ResourceQuota",
    resource: "resourcequotas",
    namespaced: true,
  },
  limitranges: {
    apiVersion: "v1",
    kind: "LimitRange",
    resource: "limitranges",
    namespaced: true,
  },
  priorityclasses: {
    apiVersion: "scheduling.k8s.io/v1",
    kind: "PriorityClass",
    resource: "priorityclasses",
    namespaced: false,
  },
  runtimeclasses: {
    apiVersion: "node.k8s.io/v1",
    kind: "RuntimeClass",
    resource: "runtimeclasses",
    namespaced: false,
  },
  leases: {
    apiVersion: "coordination.k8s.io/v1",
    kind: "Lease",
    resource: "leases",
    namespaced: true,
  },
  mutatingwebhookconfigurations: {
    apiVersion: "admissionregistration.k8s.io/v1",
    kind: "MutatingWebhookConfiguration",
    resource: "mutatingwebhookconfigurations",
    namespaced: false,
  },
  validatingwebhookconfigurations: {
    apiVersion: "admissionregistration.k8s.io/v1",
    kind: "ValidatingWebhookConfiguration",
    resource: "validatingwebhookconfigurations",
    namespaced: false,
  },
  validatingadmissionpolicies: {
    apiVersion: "admissionregistration.k8s.io/v1",
    kind: "ValidatingAdmissionPolicy",
    resource: "validatingadmissionpolicies",
    namespaced: false,
  },
  validatingadmissionpolicybindings: {
    apiVersion: "admissionregistration.k8s.io/v1",
    kind: "ValidatingAdmissionPolicyBinding",
    resource: "validatingadmissionpolicybindings",
    namespaced: false,
  },
};

export const SAFE_DELETE_KINDS = new Set<SimpleResourceKind>([
  "horizontalpodautoscalers",
  "poddisruptionbudgets",
  "leases",
]);
