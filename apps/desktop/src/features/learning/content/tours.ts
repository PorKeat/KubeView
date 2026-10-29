import type { PageTour } from "../types";

const overviewTour: PageTour = {
  id: "overview-tour",
  pageId: "overview",
  title: "Cluster overview tour",
  description:
    "A three-step walkthrough of the health signals that matter first.",
  steps: [
    {
      target: '[data-tour="overview-header"]',
      title: "Check which cluster you are viewing",
      body: "The header shows the current context, API version, and latency. Confirm that the cluster and namespace are the ones you intend to inspect before reading any numbers.",
    },
    {
      target: '[data-tour="overview-metrics"]',
      title: "Read the health cards",
      body: "These cards summarize Nodes, workloads, Pods, and resource pressure. Look for warning colors and surprising counts before opening individual resources.",
    },
    {
      target: '[data-tour="overview-nodes"]',
      title: "Inspect the Nodes",
      body: "A workload cannot stay healthy when its Nodes are under pressure or not ready. Select a Node to see its capacity and the Pods running on it.",
    },
  ],
};

const podsTour: PageTour = {
  id: "pods-tour",
  pageId: "pods",
  title: "Pods page tour",
  description: "Find a Pod, narrow the list, and open the right evidence.",
  steps: [
    {
      target: '[data-tour="pods-search"]',
      title: "Find the Pod you need",
      body: "Search by Pod name, namespace, Node, or IP. On a busy cluster, choose a namespace in the top bar first to reduce the list.",
    },
    {
      target: '[data-tour="pods-filters"]',
      title: "Filter by what is going wrong",
      body: "All, Running, Pending, and Failing change which rows you see. A Pod can be Running but still not Ready, so open it before assuming it is healthy.",
    },
    {
      target: '[data-tour="pods-table"]',
      title: "Open a row to inspect it",
      body: "Clicking a row opens the inspector with status, conditions, events, and logs. Use events for Kubernetes actions and logs for the application's own output.",
    },
  ],
};

const deploymentsTour: PageTour = {
  id: "deployments-tour",
  pageId: "deployments",
  title: "Deployments page tour",
  description: "Understand desired replicas, rollout state, and Pod ownership.",
  steps: [
    {
      target: '[data-tour="deployments-search"]',
      title: "Find a Deployment",
      body: "Search by name, image, selector, or namespace. This is usually the right object to inspect when an application is missing or rolling out badly.",
    },
    {
      target: '[data-tour="deployments-filters"]',
      title: "Read the rollout state",
      body: "Healthy and Progressing are not the same state. Filter to Degraded or Progressing when a new version is not available, then inspect the Pods it created.",
    },
    {
      target: '[data-tour="deployments-table"]',
      title: "Compare ready and desired",
      body: "READY shows ready replicas versus desired replicas. Click a row to inspect the Deployment or use its row action to view the Pods it owns.",
    },
  ],
};

const servicesTour: PageTour = {
  id: "services-tour",
  pageId: "services",
  title: "Services page tour",
  description: "Follow a Service from its selector to its ready endpoints.",
  steps: [
    {
      target: '[data-testid="services-search"]',
      title: "Find a Service",
      body: "Search by name, namespace, IP, port, or selector. A Service is the stable address other workloads use to reach your Pods.",
    },
    {
      target: '[data-tour="services-filters"]',
      title: "Filter by exposure type",
      body: "ClusterIP is internal, NodePort exposes a Node port, and LoadBalancer asks the platform for an external address. Filter here to narrow the list.",
    },
    {
      target: '[data-tour="services-table"]',
      title: "Check ready endpoints",
      body: "The endpoints column tells you whether the Service has ready Pods behind it. No ready endpoints means traffic has nowhere to go, even if the Service exists.",
    },
  ],
};

const configMapsTour: PageTour = {
  id: "configmaps-tour",
  pageId: "configmaps",
  title: "ConfigMaps page tour",
  description:
    "Inspect non-secret configuration without changing Pods by accident.",
  steps: [
    {
      target: '[data-testid="configmaps-search"]',
      title: "Find configuration",
      body: "Search by name, namespace, or key. ConfigMaps hold ordinary settings, not credentials.",
    },
    {
      target: '[data-tour="configmaps-filters"]',
      title: "Check immutability",
      body: "An immutable ConfigMap cannot be changed in place. Filter to immutable or mutable before planning an update.",
    },
    {
      target: '[data-tour="configmaps-table"]',
      title: "Open a ConfigMap",
      body: "Click a row to review keys and values in the inspector. Editing a ConfigMap does not restart Pods already using it.",
    },
  ],
};

const permissionsTour: PageTour = {
  id: "permissions-tour",
  pageId: "permissions",
  title: "Permissions page tour",
  description: "Turn an RBAC denial into a precise, minimal access request.",
  steps: [
    {
      target: '[data-testid="permissions-view"] header',
      title: "Confirm the cluster identity",
      body: "The header names the cluster. Every permission check uses the identity from your current kubeconfig context.",
    },
    {
      target: '[data-testid="permission-subject-form"]',
      title: "Choose who is being checked",
      body: "Pick a User, Group, or ServiceAccount, then load its effective access. Use my identity to test the same user KubeView is acting as.",
    },
    {
      target: '[data-testid="permission-check-form"]',
      title: "Ask one precise question",
      body: "Choose a verb, resource, and namespace, then check access. The answer tells you what is allowed without changing the cluster.",
    },
  ],
};

const TOURS: PageTour[] = [
  overviewTour,
  podsTour,
  deploymentsTour,
  servicesTour,
  configMapsTour,
  permissionsTour,
];

export const PAGE_TOURS: Record<string, PageTour> = Object.fromEntries(
  TOURS.map((tour) => [tour.pageId, tour]),
);

export function getPageTour(pageId: string): PageTour | undefined {
  return PAGE_TOURS[pageId];
}

export function getPageTourById(tourId: string): PageTour | undefined {
  return TOURS.find((tour) => tour.id === tourId);
}
