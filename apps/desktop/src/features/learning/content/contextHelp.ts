import type { PageGuide } from "../types";

export const PAGE_GUIDES: Record<string, PageGuide> = {
  mutatingwebhookconfigurations: {
    title: "Mutating Webhook Configs",
    beginner:
      "Mutating webhooks can rewrite objects during admission. A broken webhook with a Fail policy can block matching writes.",
    intermediate:
      "Check the failure policy and side effects. A webhook can be healthy but still add latency to every applicable request.",
    advanced:
      "Mutating webhooks run before validation. Rules, selectors, and reinvocation policy determine how many times a request can be changed.",
    pathId: "first-steps",
    lessonId: "everything-is-a-resource",
  },
  validatingwebhookconfigurations: {
    title: "Validating Webhook Configs",
    beginner:
      "Validating webhooks reject requests that break a policy. If the webhook is unavailable, Fail policies reject the request too.",
    intermediate:
      "Inspect failure policy, side effects, and the rules that select requests. A single broad webhook can affect the whole cluster.",
    advanced:
      "Admission webhooks receive API server requests and must be highly available. Use narrow match rules and budget latency.",
    pathId: "first-steps",
    lessonId: "everything-is-a-resource",
  },
  validatingadmissionpolicies: {
    title: "Validating Admission Policies",
    beginner:
      "ValidatingAdmissionPolicy uses CEL expressions evaluated inside the API server. A policy needs a binding before it enforces anything.",
    intermediate:
      "Compare the expression set, failure policy, and parameter kind. Invalid CEL or missing parameters can make a policy unusable.",
    advanced:
      "Policies run in admission order with webhooks. Match constraints and parameter references decide which requests pay the cost.",
    pathId: "first-steps",
    lessonId: "everything-is-a-resource",
  },
  validatingadmissionpolicybindings: {
    title: "Admission Policy Bindings",
    beginner:
      "A binding activates a policy and chooses whether matching requests are denied, warned, or audited.",
    intermediate:
      "Check the policy reference and validation actions. A binding can target only part of the cluster with match resources.",
    advanced:
      "Bindings can supply parameters for policy evaluation. Missing parameters or a stale policy name silently weaken enforcement.",
    pathId: "first-steps",
    lessonId: "everything-is-a-resource",
  },
  horizontalpodautoscalers: {
    title: "Horizontal Pod Autoscalers",
    beginner:
      "An HPA changes a workload's replica count based on metrics. Min and max bound how far it can scale.",
    intermediate:
      "Compare current and desired replicas. An AbleToScale warning means the metrics pipeline or target is failing.",
    advanced:
      "Metrics availability and target readiness both gate scaling. A converged HPA can still show a warning while it waits for metrics.",
    pathId: "first-steps",
    lessonId: "deployments-keep-pods-alive",
  },
  poddisruptionbudgets: {
    title: "Pod Disruption Budgets",
    beginner:
      "A PDB limits how many Pods can be voluntarily evicted during drains or upgrades.",
    intermediate:
      "Allowed disruptions can be zero while the workload is healthy; this blocks node drains without making the Pods unhealthy.",
    advanced:
      "MinAvailable and MaxUnavailable are alternatives. PDBs do not protect against crashes, only voluntary disruption.",
    pathId: "first-steps",
    lessonId: "deployments-keep-pods-alive",
  },
  resourcequotas: {
    title: "Resource Quotas",
    beginner:
      "A ResourceQuota sets hard limits for a namespace, such as total CPU, memory, or object counts.",
    intermediate:
      "Compare hard limits with used values. A workload can be rejected even when nodes have free capacity.",
    advanced:
      "Quota admission happens before scheduling. Pods may remain Pending if their requests exceed the remaining quota.",
    pathId: "first-steps",
    lessonId: "contexts-and-namespaces",
  },
  limitranges: {
    title: "Limit Ranges",
    beginner:
      "A LimitRange supplies default requests and limits and can enforce maximum or minimum values per Pod or container.",
    intermediate:
      "Defaults are applied only when a manifest omits the field. Explicit values that exceed the range are rejected.",
    advanced:
      "LimitRange admission applies per namespace. It can prevent unschedulable workloads but does not reserve capacity.",
    pathId: "first-steps",
    lessonId: "contexts-and-namespaces",
  },
  priorityclasses: {
    title: "Priority Classes",
    beginner:
      "Priority classes tell the scheduler which Pods matter most when the cluster is full.",
    intermediate:
      "Higher values win scheduling. With preemption enabled, a Pod can evict lower-priority Pods to make room.",
    advanced:
      "Preemption is best-effort and can still fail on topology or resource constraints. Use it deliberately in shared clusters.",
    pathId: "first-steps",
    lessonId: "pods-run-containers",
  },
  runtimeclasses: {
    title: "Runtime Classes",
    beginner:
      "RuntimeClass selects an alternate container runtime or isolation profile for a Pod.",
    intermediate:
      "The handler must be installed on the node. Pod overhead is charged against node capacity when configured.",
    advanced:
      "RuntimeClass can combine handlers with node selectors and tolerations. Missing handlers leave Pods unschedulable.",
    pathId: "first-steps",
    lessonId: "pods-run-containers",
  },
  leases: {
    title: "Leases",
    beginner:
      "A Lease is a short-lived coordination record used for leader election and component heartbeats.",
    intermediate:
      "Check the holder, renew time, and duration. An expired lease often means the controller stopped renewing it.",
    advanced:
      "Lease clocks come from the API server. Clock skew or a paused controller can make a live holder appear stale.",
    pathId: "first-steps",
    lessonId: "contexts-and-namespaces",
  },
  namespaces: {
    title: "Namespaces",
    beginner:
      "Namespaces split one cluster into named scopes. Most workload pages can be filtered to a single namespace.",
    intermediate:
      "Watch for Terminating namespaces; a finalizer can keep a namespace stuck even after its workloads are gone.",
    advanced:
      "Namespace deletion is asynchronous. Inspect remaining resources and finalizers before forcing a cleanup.",
    pathId: "first-steps",
    lessonId: "contexts-and-namespaces",
  },
  events: {
    title: "Events",
    beginner:
      "Events are short-lived messages from the cluster. Warning events usually explain why a Pod is pending or restarting.",
    intermediate:
      "Read the reason, involved object, and count together. A repeated BackOff is different from a single scheduling failure.",
    advanced:
      "Events are namespaced and expire quickly. Correlate them with Pod conditions and controller status for a durable diagnosis.",
    pathId: "first-steps",
    lessonId: "contexts-and-namespaces",
  },
  replicationcontrollers: {
    title: "Replication Controllers",
    beginner:
      "A ReplicationController is the older way to keep a fixed number of Pods running. Prefer Deployments for new work.",
    intermediate:
      "Compare desired and ready replicas. A controller can exist with zero ready Pods if its selector no longer matches.",
    advanced:
      "ReplicationControllers do not provide rollout history or revisions. Their selectors are equality-based maps.",
    pathId: "first-steps",
    lessonId: "deployments-keep-pods-alive",
  },
  endpointslices: {
    title: "Endpoint Slices",
    beginner:
      "EndpointSlices are the address lists behind a Service. An empty slice means the Service has no ready Pods.",
    intermediate:
      "Check the service-name label, address type, endpoints, and ports. A slice can be healthy while the Service selector is wrong.",
    advanced:
      "EndpointSlices replace the single Endpoints object for scale. The EndpointSlice controller owns them; manual edits may be overwritten.",
    pathId: "first-steps",
    lessonId: "services-route-traffic",
  },
  ingressclasses: {
    title: "Ingress Classes",
    beginner:
      "An IngressClass names the controller that should handle an Ingress. The default class is used when an Ingress does not set one.",
    intermediate:
      "If an Ingress never gets an address, verify its class exists and points at an installed controller.",
    advanced:
      "IngressClasses are cluster-scoped. Controllers can watch only their class, so a typo silently leaves an Ingress unhandled.",
    pathId: "first-steps",
    lessonId: "services-route-traffic",
  },
  persistentvolumeclaims: {
    title: "Persistent Volume Claims",
    beginner:
      "A PVC asks for storage. Bound means it found a volume; Pending usually means no matching volume or StorageClass.",
    intermediate:
      "Compare requested capacity, access modes, and storage class. A claim can be Bound but still unusable if the volume is on the wrong node.",
    advanced:
      "Retention policy belongs to the PersistentVolume. Deleting a claim can retain, delete, or orphan its volume depending on that policy.",
    pathId: "first-steps",
    lessonId: "contexts-and-namespaces",
  },
  overview: {
    title: "Cluster Overview",
    beginner:
      "This is the health dashboard for the selected cluster. Start with warnings and unhealthy Pods, then look at Nodes only if workloads cannot be scheduled.",
    intermediate:
      "Read warning events, workload counts, and Node pressure together. A healthy Node count does not mean every workload is ready.",
    advanced:
      "These summaries come from the cluster API and Node telemetry. Use the fleet view when you need to compare control planes rather than inspect one cluster.",
    command: "kubectl get nodes && kubectl get pods -A",
    pathId: "first-steps",
    lessonId: "what-is-a-cluster",
  },
  "fleet-catalog": {
    title: "Catalog",
    beginner:
      "The Catalog lists every kubeconfig context you have added. Selecting a cluster makes it active and opens its overview; the resource sidebar returns with it.",
    intermediate:
      "Use the catalog to compare source, endpoint, version, distro, and connection state in one place. Switch to Fleet Health when you need capacity and workload detail.",
    advanced:
      "Each row maps to a kubeconfig context. Deleting or re-pointing an endpoint affects that context only; other contexts keep their own credentials and scopes.",
    pathId: "first-steps",
    lessonId: "contexts-and-namespaces",
  },
  "fleet-kubeconfigs": {
    title: "Kubeconfigs",
    beginner:
      "A kubeconfig file holds one or more contexts. Each row here is a context from that file, with the endpoint and credentials it uses.",
    intermediate:
      "Open a context to make it active, diagnose its connection, or re-point the API server. Removing a context only affects this kubeconfig, not the cluster itself.",
    advanced:
      "Contexts bind a cluster, user, and default namespace. If authentication uses exec or OIDC, the plugin runs locally when the connection is opened.",
    pathId: "first-steps",
    lessonId: "contexts-and-namespaces",
  },
  "fleet-links": {
    title: "Web Links",
    beginner:
      "Save the dashboards you open often, such as Argo CD or Grafana, so they are one click from your cluster catalog.",
    intermediate:
      "A link can target one context or all of them. Links open in your browser and are stored only on this machine.",
    advanced:
      "Use cluster-specific links when each context has its own observability stack. Shared links cover tools that span the whole fleet.",
    pathId: "first-steps",
    lessonId: "contexts-and-namespaces",
  },
  fleet: {
    title: "Fleet Health",
    beginner:
      "This page compares every kubeconfig context you have added. Each card is a separate cluster, so a problem on one card does not affect the others.",
    intermediate:
      "Compare version skew, Node capacity, failing workloads, and latency. A cluster can show Connected while individual resources still fail.",
    advanced:
      "Fleet data is gathered per context. Authentication failures are isolated to that context and do not imply the whole fleet is offline.",
    pathId: "first-steps",
    lessonId: "contexts-and-namespaces",
  },
  gitops: {
    title: "GitOps Drift",
    beginner:
      "Drift means the live cluster differs from the manifests in a local folder. It is a comparison, not an automatic deployment.",
    intermediate:
      "Scan a folder, review each resource state, then inspect the line diff before applying anything. Secrets are intentionally excluded.",
    advanced:
      "Comparison uses desired-subset matching. Extra live fields such as defaulted values are not treated as drift unless the manifest defines them.",
    pathId: "first-steps",
    lessonId: "everything-is-a-resource",
  },
  pods: {
    title: "Pods",
    beginner:
      "A Pod wraps one or more containers. Open a Pod to see its status, conditions, logs, and events. A Running Pod can still be failing its readiness check.",
    intermediate:
      "Compare readiness, restart count, and status reason. Events explain Kubernetes actions; logs explain application behavior.",
    advanced:
      "Container statuses carry waiting, running, and terminated detail. Previous logs and exit codes are often more useful than the Pod phase.",
    command: "kubectl get pods -A -o wide",
    pathId: "workloads",
    lessonId: "pods-run-containers",
  },
  deployments: {
    title: "Deployments",
    beginner:
      "A Deployment asks Kubernetes to keep a certain number of Pods running. You normally edit the Deployment, not the Pods it creates.",
    intermediate:
      "Watch ready versus desired replicas, generation, and rollout conditions. A stalled rollout usually means new Pods never become ready.",
    advanced:
      "Deployments manage ReplicaSets per revision. Revision history supports rollback, while maxSurge and maxUnavailable shape rollout behavior.",
    command: "kubectl get deployments -A",
    pathId: "workloads",
    lessonId: "deployments-keep-pods-alive",
  },
  replicasets: {
    title: "ReplicaSets",
    beginner:
      "A ReplicaSet makes sure a certain number of matching Pods exist. Deployments create them, so you rarely edit one directly.",
    intermediate:
      "A ReplicaSet with zero desired replicas is often an old rollout revision, not necessarily a failure.",
    advanced:
      "ReplicaSets own Pods through selectors and owner references. Manual Pods that match the selector can affect replica accounting.",
    pathId: "workloads",
    lessonId: "deployments-keep-pods-alive",
  },
  statefulsets: {
    title: "StatefulSets",
    beginner:
      "StatefulSets are for applications that need stable names and storage, such as databases. Each replica keeps its own identity.",
    intermediate:
      "Rollouts are ordered. A stuck Pod can hold up the rest of the StatefulSet.",
    advanced:
      "Each replica receives a stable ordinal, DNS name, and usually its own PersistentVolumeClaim via volumeClaimTemplates.",
    pathId: "config-storage",
    lessonId: "persistent-storage",
  },
  daemonsets: {
    title: "DaemonSets",
    beginner:
      "A DaemonSet runs one copy of a Pod on every eligible Node, usually for agents such as log or network collectors.",
    intermediate:
      "If desired and ready counts differ, check Node conditions, taints, and whether new Nodes are blocked by selectors.",
    advanced:
      "DaemonSets tolerate common Node taints by design, but custom taints can still prevent scheduling unless tolerated.",
    pathId: "workloads",
    lessonId: "deployments-keep-pods-alive",
  },
  jobs: {
    title: "Jobs and CronJobs",
    beginner:
      "A Job runs until its task finishes. A CronJob creates Jobs on a schedule. Completed is often a healthy state here.",
    intermediate:
      "Check completions, active Pods, failed attempts, and the last schedule time. A suspended CronJob will not create new Jobs.",
    advanced:
      "Backoff limits, parallelism, completion mode, and history retention determine retry and cleanup behavior.",
    pathId: "workloads",
    lessonId: "read-logs-and-events",
  },
  services: {
    title: "Services",
    beginner:
      "A Service gives a changing group of Pods one stable address. If no selected Pods are ready, nothing can receive its traffic.",
    intermediate:
      "Check the selector, port mapping, and ready endpoint count. A Service can look fine while selecting no Pods.",
    advanced:
      "ClusterIP, NodePort, and LoadBalancer expose the Service differently. Headless Services publish addresses without a virtual IP.",
    command: "kubectl get services -A",
    pathId: "networking",
    lessonId: "services-give-one-address",
  },
  endpoints: {
    title: "Endpoints",
    beginner:
      "Endpoints are the real Pod addresses behind a Service. An empty list means no selected Pod is ready.",
    intermediate:
      "Compare Service selectors with Pod labels and readiness. Endpoints change as Pods become ready or disappear.",
    advanced:
      "EndpointSlices back this data at scale. Readiness gates can remove a healthy-looking Pod from serving traffic.",
    command: "kubectl get endpoints -A",
    pathId: "networking",
    lessonId: "endpoints-show-who-is-behind",
  },
  ingresses: {
    title: "Ingresses and Gateways",
    beginner:
      "Ingress sends HTTP traffic from outside the cluster to a Service. It only works if an ingress controller is installed.",
    intermediate:
      "Check host, path, backend Service, and TLS status. An Ingress can be accepted while its backend or controller is broken.",
    advanced:
      "Ingress class selects the controller. Gateway API separates infrastructure and routes with Gateway and HTTPRoute resources.",
    command: "kubectl get ingress -A",
    pathId: "networking",
    lessonId: "ingress-and-gateway",
  },
  networkpolicies: {
    title: "Network Policies",
    beginner:
      "NetworkPolicy limits which Pods can talk to each other. It only works if your CNI plugin enforces policy.",
    intermediate:
      "An empty policy can deny broadly. Check selectors, ingress and egress directions, and namespace selectors.",
    advanced:
      "Policy is additive allow. Enforcement and default-deny behavior depend on the CNI implementation.",
    pathId: "networking",
    lessonId: "services-give-one-address",
  },
  portforwards: {
    title: "Port Forwards",
    beginner:
      "This creates a private tunnel from your computer to a Pod or Service. Nothing is exposed to the internet.",
    intermediate:
      "Choose a namespace and target, verify the remote port, then connect to 127.0.0.1 on the assigned local port.",
    advanced:
      "A Service target resolves a ready endpoint Pod. RBAC can block port-forward even when you can read the resource.",
    command: "kubectl port-forward service/<name> 8080:80 -n <namespace>",
    pathId: "networking",
    lessonId: "port-forward-private-tunnel",
  },
  cilium: {
    title: "Network Observability",
    beginner:
      "This page summarizes network behavior from the CNI installed in your cluster. Available tabs depend on the provider.",
    intermediate:
      "Use policy and endpoint views for configuration, then flows for observed traffic. Provider capabilities are not identical.",
    advanced:
      "Cilium can expose Hubble flows and endpoint identity. Other CNIs expose a different subset, so absent data does not always mean an outage.",
    pathId: "networking",
    lessonId: "services-give-one-address",
  },
  configmaps: {
    title: "ConfigMaps",
    beginner:
      "ConfigMaps hold non-secret settings for applications. Editing one does not automatically restart Pods already using it.",
    intermediate:
      "Check keys, consumers, and whether values are mounted or injected as environment variables.",
    advanced:
      "Mounted values can update eventually, but environment variables are fixed at container start. Roll out consumers after changes.",
    command: "kubectl get configmaps -A",
    pathId: "config-storage",
    lessonId: "configmaps-are-settings",
  },
  secrets: {
    title: "Secrets",
    beginner:
      "Secrets hold credentials. KubeView redacts values so they are not accidentally copied into logs or screenshots.",
    intermediate:
      "RBAC controls who can read a Secret. Base64 encoding does not encrypt the value.",
    advanced:
      "Encryption at rest is a cluster configuration concern. Secret manifests are excluded from GitOps drift until redaction is safe.",
    command: "kubectl get secrets -A",
    pathId: "config-storage",
    lessonId: "secrets-are-sensitive",
  },
  persistentvolumes: {
    title: "Persistent Volumes",
    beginner:
      "Persistent storage keeps data after a Pod is replaced. A claim requests storage and binds to a volume.",
    intermediate:
      "Check claim status, access mode, capacity, and the bound volume. Pending claims usually indicate provisioning problems.",
    advanced:
      "ReadWriteOnce is a Node-level mount constraint. Reclaim policy determines what happens to backing storage after a claim is deleted.",
    command: "kubectl get pv,pvc -A",
    pathId: "config-storage",
    lessonId: "persistent-storage",
  },
  storageclasses: {
    title: "Storage Classes",
    beginner:
      "A StorageClass tells the cluster how to create storage automatically when an application asks for it.",
    intermediate:
      "Check the provisioner and default class. A claim can stay Pending when no class can satisfy it.",
    advanced:
      "Volume binding mode, reclaim policy, and allowed topologies affect where and when provisioning can succeed.",
    command: "kubectl get storageclasses",
    pathId: "config-storage",
    lessonId: "persistent-storage",
  },
  serviceaccounts: {
    title: "Service Accounts",
    beginner:
      "A ServiceAccount is the identity a Pod uses when it talks to the Kubernetes API. It is separate from your kubeconfig user.",
    intermediate:
      "Check which workloads use the account and whether a binding grants the required verbs.",
    advanced:
      "Token projection and automount settings determine whether a Pod receives credentials. Least privilege applies here too.",
    command: "kubectl get serviceaccounts -A",
    pathId: "access",
    lessonId: "know-your-identity",
  },
  rbac: {
    title: "Roles and Bindings",
    beginner:
      "A Role lists allowed actions. A binding attaches that Role to a user, group, or ServiceAccount. Without a binding, a Role does nothing.",
    intermediate:
      "Read rules as verbs on resources. Roles are namespaced; ClusterRoles can be used cluster-wide.",
    advanced:
      "RBAC is additive allow with no deny rules. Aggregated ClusterRoles and bindings can grant more than one document suggests.",
    command: "kubectl get roles,rolebindings -A",
    pathId: "access",
    lessonId: "roles-and-bindings",
  },
  permissions: {
    title: "Permissions Checker",
    beginner:
      "Use this page to test whether an identity can perform one action. It explains a denial without changing the cluster.",
    intermediate:
      "Pick the subject, verb, resource, and namespace. The result is an access review, not a simulated API write.",
    advanced:
      "The checker uses SelfSubjectAccessReview for the current identity. A forbidden operation can still be allowed for another subject.",
    command: "kubectl auth can-i <verb> <resource> -n <namespace>",
    pathId: "access",
    lessonId: "debug-a-denial",
  },
  crds: {
    title: "Custom Resources",
    beginner:
      "Custom resources extend Kubernetes with new object kinds installed by an operator or platform team.",
    intermediate:
      "A CRD defines the schema. Individual custom resources are instances, and an operator usually acts on them.",
    advanced:
      "Generic editing depends on discovery and the resource schema. Validation may be handled by the CRD or by an admission webhook.",
    pathId: "first-steps",
    lessonId: "everything-is-a-resource",
  },
};

export function getPageGuide(tabId: string): PageGuide | undefined {
  return PAGE_GUIDES[tabId];
}
