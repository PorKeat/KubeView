import type { LearningPath } from "../../types";

export const firstStepsPath: LearningPath = {
  id: "first-steps",
  title: "Kubernetes without the jargon",
  description:
    "Start with the mental model: what a cluster is, what a resource is, and where your commands are pointing.",
  icon: "compass",
  lessons: [
    {
      id: "what-is-a-cluster",
      title: "A cluster is a shared computer",
      summary:
        "The cluster is the machine you ask to run things. Your laptop only displays and controls it.",
      minutes: 3,
      goal: "Understand that Kubernetes is a control system for computers, not a programming language.",
      steps: [
        "A cluster has worker machines called Nodes. Each Node runs containers.",
        "The control plane decides which Node should run each workload.",
        "KubeView talks to the cluster API. It does not run your containers on your laptop.",
        "If the cluster is offline, KubeView can show cached data but cannot make live changes.",
      ],
      command: "kubectl cluster-info",
      commandNote:
        "This asks the current cluster where its API server and core services are.",
      deepDive:
        "The API server is the front door. Every read and write passes through it, then controllers reconcile the desired state in etcd with what is actually running.",
      action: {
        label: "Open Cluster Overview",
        tabId: "overview",
        tabTitle: "Cluster Overview",
      },
      check: {
        question: "Where do your application containers actually run?",
        options: [
          { id: "browser", label: "Inside KubeView on your laptop" },
          { id: "nodes", label: "On Nodes in the Kubernetes cluster" },
          { id: "api", label: "Inside the Kubernetes API server" },
        ],
        correctOptionId: "nodes",
        explanation:
          "KubeView is a control surface. Workloads run in containers on cluster Nodes.",
      },
    },
    {
      id: "everything-is-a-resource",
      title: "Everything is a recorded object",
      summary:
        "Pods, Services, ConfigMaps, and Roles are all API objects with a kind, a name, and a desired state.",
      minutes: 4,
      goal: "Recognize that Kubernetes works by storing objects, then making reality match them.",
      steps: [
        "Every object has a kind, such as Pod or Service.",
        "Every object has metadata, including a name and usually a namespace.",
        "The spec is what you want. The status is what Kubernetes currently observes.",
        "KubeView's resource pages are friendly views over these API objects.",
      ],
      command: "kubectl api-resources",
      commandNote:
        "This lists the resource kinds the current cluster understands.",
      deepDive:
        "Controllers continuously compare spec with status. A Deployment controller, for example, creates ReplicaSets so the observed Pod count matches the desired replica count.",
      action: {
        label: "Browse Pods",
        tabId: "pods",
        tabTitle: "Pods",
      },
      check: {
        question: "What is the difference between spec and status?",
        options: [
          { id: "same", label: "They are two names for the same thing" },
          {
            id: "desired",
            label: "Spec is desired state; status is observed state",
          },
          { id: "logs", label: "Spec holds logs; status holds events" },
        ],
        correctOptionId: "desired",
        explanation:
          "You write spec. Controllers report status after observing the real cluster.",
      },
    },
    {
      id: "contexts-and-namespaces",
      title: "Know which cluster and namespace you are using",
      summary:
        "A context points at a cluster and user. A namespace divides one cluster into named scopes.",
      minutes: 3,
      goal: "Avoid the classic beginner mistake of changing the wrong cluster or namespace.",
      steps: [
        "The context switcher in the top bar selects the cluster and identity.",
        "The namespace selector narrows the view to one namespace or all namespaces.",
        "The same resource name can exist in two different namespaces.",
        "Some objects, such as Nodes and ClusterRoles, are cluster-scoped instead of namespaced.",
      ],
      command: "kubectl config current-context",
      commandNote:
        "Use kubectl config get-contexts to see every available context.",
      deepDive:
        "A kubeconfig context bundles a cluster, a user, and an optional default namespace. KubeView uses the selected context for every RPC call.",
      action: {
        label: "Open Permissions Checker",
        tabId: "permissions",
        tabTitle: "Permissions Checker",
      },
      check: {
        question:
          "Two Pods have the same name in one cluster. How is that possible?",
        options: [
          { id: "impossible", label: "It is not possible" },
          { id: "namespaces", label: "They are in different namespaces" },
          { id: "nodes", label: "They must be on different Nodes" },
        ],
        correctOptionId: "namespaces",
        explanation:
          "Names are unique inside a namespace. Different namespaces can reuse the same name.",
      },
    },
  ],
};
