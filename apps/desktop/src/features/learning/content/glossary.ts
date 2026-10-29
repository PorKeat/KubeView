import type { GlossaryTerm } from "../types";

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: "cluster",
    term: "Cluster",
    category: "Core",
    plain:
      "The group of machines and control-plane services that run your Kubernetes workloads.",
    analogy:
      "Think of it as the building where your application lives, not the laptop you use to visit.",
    command: "kubectl cluster-info",
  },
  {
    id: "node",
    term: "Node",
    category: "Core",
    plain:
      "A machine in the cluster that runs Pods. It can be a physical server or a virtual machine.",
    command: "kubectl get nodes",
  },
  {
    id: "pod",
    term: "Pod",
    category: "Core",
    plain:
      "The smallest unit Kubernetes schedules. It contains one or more containers that share a network address.",
    analogy:
      "A small envelope around your container that Kubernetes can move or replace.",
    command: "kubectl get pods -A",
  },
  {
    id: "container",
    term: "Container",
    category: "Core",
    plain:
      "An isolated process packaged with its filesystem and dependencies. Containers run inside Pods.",
    command: "kubectl logs <pod> -c <container>",
  },
  {
    id: "image",
    term: "Container image",
    category: "Core",
    plain:
      "The packaged filesystem and startup command used to create a container.",
    command: "kubectl describe pod <pod>",
  },
  {
    id: "namespace",
    term: "Namespace",
    category: "Core",
    plain:
      "A named scope inside one cluster. Resource names must be unique within a namespace.",
    analogy: "Like folders on the same computer.",
    command: "kubectl get namespaces",
  },
  {
    id: "label",
    term: "Label",
    category: "Configuration",
    plain:
      "A key-value tag attached to an object. Other objects use labels to find and group resources.",
    command: "kubectl get pods -l app=web",
  },
  {
    id: "selector",
    term: "Selector",
    category: "Configuration",
    plain:
      "A rule that matches labels. Services, Deployments, and NetworkPolicies use selectors to choose Pods.",
    command: "kubectl get pods --show-labels",
  },
  {
    id: "annotation",
    term: "Annotation",
    category: "Configuration",
    plain:
      "Metadata for tools and humans. Unlike labels, annotations are not normally used for selection.",
    command: "kubectl get pod <pod> -o jsonpath='{.metadata.annotations}'",
  },
  {
    id: "deployment",
    term: "Deployment",
    category: "Workloads",
    plain:
      "A controller that keeps a requested number of Pod replicas running and handles rolling updates.",
    analogy: "A supervisor who keeps the right number of workers employed.",
    command: "kubectl get deployments -A",
  },
  {
    id: "replicaset",
    term: "ReplicaSet",
    category: "Workloads",
    plain:
      "A controller that ensures a specific number of matching Pods exist. Deployments create and manage them.",
    command: "kubectl get replicasets -A",
  },
  {
    id: "statefulset",
    term: "StatefulSet",
    category: "Workloads",
    plain:
      "A controller for Pods that need stable identity and storage, often used for databases.",
    command: "kubectl get statefulsets -A",
  },
  {
    id: "daemonset",
    term: "DaemonSet",
    category: "Workloads",
    plain:
      "A controller that runs one Pod on each eligible Node, often for agents such as log collectors.",
    command: "kubectl get daemonsets -A",
  },
  {
    id: "job",
    term: "Job",
    category: "Workloads",
    plain: "A controller that runs Pods until a task completes successfully.",
    command: "kubectl get jobs -A",
  },
  {
    id: "cronjob",
    term: "CronJob",
    category: "Workloads",
    plain: "A schedule for creating Jobs on a recurring cron expression.",
    command: "kubectl get cronjobs -A",
  },
  {
    id: "service",
    term: "Service",
    category: "Networking",
    plain:
      "A stable virtual address and DNS name that forwards to Pods selected by labels.",
    analogy:
      "A reception desk with one public number that routes calls to available staff.",
    command: "kubectl get services -A",
  },
  {
    id: "endpoint",
    term: "Endpoint",
    category: "Networking",
    plain:
      "A ready Pod address attached to a Service. No endpoints usually means no selected ready Pods.",
    command: "kubectl get endpoints -A",
  },
  {
    id: "ingress",
    term: "Ingress",
    category: "Networking",
    plain:
      "HTTP routing rules for hosts and paths. It needs an ingress controller to implement the rules.",
    command: "kubectl get ingress -A",
  },
  {
    id: "gateway-api",
    term: "Gateway API",
    category: "Networking",
    plain:
      "A newer routing API with explicit Gateway and HTTPRoute resources. It needs a compatible controller.",
    command: "kubectl get gateways,httproutes -A",
  },
  {
    id: "network-policy",
    term: "NetworkPolicy",
    category: "Networking",
    plain:
      "Rules that allow or block traffic between selected Pods. A CNI must enforce them.",
    command: "kubectl get networkpolicies -A",
  },
  {
    id: "cni",
    term: "CNI",
    category: "Networking",
    plain:
      "The network plugin that gives Pods addresses and can enforce network policy. Examples include Cilium, Calico, and Antrea.",
    command: "kubectl get pods -n kube-system",
  },
  {
    id: "configmap",
    term: "ConfigMap",
    category: "Configuration",
    plain:
      "Non-secret configuration stored as key-value pairs or small files for Pods to consume.",
    command: "kubectl get configmaps -A",
  },
  {
    id: "secret",
    term: "Secret",
    category: "Configuration",
    plain:
      "A Kubernetes object intended for credentials and other sensitive values. Base64 is not encryption.",
    command: "kubectl get secrets -A",
  },
  {
    id: "probe",
    term: "Probe",
    category: "Configuration",
    plain:
      "A health check. Liveness can restart a container, readiness controls traffic, and startup waits for initialization.",
    command: "kubectl describe pod <pod>",
  },
  {
    id: "resource-request-limit",
    term: "Request and limit",
    category: "Configuration",
    plain:
      "Requests guide scheduling. Limits cap CPU or memory usage. Exceeding a memory limit can cause OOMKilled.",
    command: "kubectl describe pod <pod>",
  },
  {
    id: "volume",
    term: "Volume",
    category: "Storage",
    plain:
      "Storage mounted into a container. Some volumes are temporary; persistent volumes outlive a Pod.",
    command: "kubectl describe pod <pod>",
  },
  {
    id: "persistent-volume",
    term: "PersistentVolume",
    category: "Storage",
    plain: "Cluster-level storage that exists independently from any one Pod.",
    command: "kubectl get pv",
  },
  {
    id: "persistent-volume-claim",
    term: "PersistentVolumeClaim",
    category: "Storage",
    plain:
      "A Pod's request for storage. Kubernetes binds it to a PersistentVolume that satisfies the request.",
    command: "kubectl get pvc -A",
  },
  {
    id: "storage-class",
    term: "StorageClass",
    category: "Storage",
    plain:
      "A template that can provision storage automatically when a claim asks for it.",
    command: "kubectl get storageclasses",
  },
  {
    id: "service-account",
    term: "ServiceAccount",
    category: "Access",
    plain:
      "An identity for workloads running inside the cluster, not for a human using kubectl.",
    command: "kubectl get serviceaccounts -A",
  },
  {
    id: "role",
    term: "Role",
    category: "Access",
    plain:
      "A namespaced list of allowed verbs and resources. It grants nothing until a RoleBinding attaches it.",
    command: "kubectl get roles -A",
  },
  {
    id: "cluster-role",
    term: "ClusterRole",
    category: "Access",
    plain:
      "A reusable permission set that can apply cluster-wide or be bound inside one namespace.",
    command: "kubectl get clusterroles",
  },
  {
    id: "role-binding",
    term: "RoleBinding",
    category: "Access",
    plain:
      "Attaches a Role or ClusterRole to a user, group, or ServiceAccount in one namespace.",
    command: "kubectl get rolebindings -A",
  },
  {
    id: "rbac",
    term: "RBAC",
    category: "Access",
    plain:
      "Role-based access control. Permissions are additive and expressed through roles and bindings.",
    command: "kubectl auth can-i get pods -n <namespace>",
  },
  {
    id: "kubeconfig",
    term: "Kubeconfig",
    category: "Access",
    plain:
      "A file that describes clusters, users, and contexts used by kubectl and KubeView.",
  },
  {
    id: "context",
    term: "Context",
    category: "Access",
    plain:
      "A named combination of cluster, user, and optional default namespace in a kubeconfig.",
    command: "kubectl config current-context",
  },
  {
    id: "condition",
    term: "Condition",
    category: "Troubleshooting",
    plain:
      "A structured status such as Ready or Available with a reason, message, and last transition time.",
    command: "kubectl get pod <pod> -o jsonpath='{.status.conditions}'",
  },
  {
    id: "event",
    term: "Event",
    category: "Troubleshooting",
    plain:
      "A recent record of something Kubernetes or the kubelet did, such as scheduling or failing to pull an image.",
    command: "kubectl get events -n <namespace> --sort-by=.lastTimestamp",
  },
  {
    id: "crashloopbackoff",
    term: "CrashLoopBackOff",
    category: "Troubleshooting",
    plain:
      "The container starts, exits, and is restarted with increasing delay. Previous logs usually explain why.",
    command: "kubectl logs <pod> --previous",
  },
  {
    id: "imagepullbackoff",
    term: "ImagePullBackOff",
    category: "Troubleshooting",
    plain:
      "The Node cannot pull the container image. Check the image reference and registry credentials.",
    command: "kubectl describe pod <pod>",
  },
  {
    id: "pending",
    term: "Pending",
    category: "Troubleshooting",
    plain:
      "The Pod is not running yet. It may be unschedulable, pulling an image, or waiting for a volume.",
    command: "kubectl describe pod <pod>",
  },
  {
    id: "oomkilled",
    term: "OOMKilled",
    category: "Troubleshooting",
    plain:
      "The container exceeded its memory limit and was terminated. Compare usage with the configured limit.",
    command: "kubectl describe pod <pod>",
  },
  {
    id: "manifest",
    term: "Manifest",
    category: "Core",
    plain:
      "A YAML or JSON document that describes one or more Kubernetes objects.",
    command: "kubectl apply -f <file>",
  },
  {
    id: "kubectl",
    term: "kubectl",
    category: "Core",
    plain:
      "The Kubernetes command-line client. KubeView shows equivalent commands so you can learn the API underneath.",
  },
  {
    id: "gitops",
    term: "GitOps",
    category: "Core",
    plain:
      "Treating a Git repository as the source of truth and continuously comparing or reconciling the cluster against it.",
  },
  {
    id: "drift",
    term: "Drift",
    category: "Core",
    plain:
      "A difference between the desired configuration in Git or manifests and the live cluster state.",
  },
];

export const GLOSSARY_CATEGORIES = [
  "All",
  "Core",
  "Workloads",
  "Networking",
  "Configuration",
  "Storage",
  "Access",
  "Troubleshooting",
] as const;
