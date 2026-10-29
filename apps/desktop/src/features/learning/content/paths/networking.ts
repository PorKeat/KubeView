import type { LearningPath } from "../../types";

export const networkingPath: LearningPath = {
  id: "networking",
  title: "Reach your application",
  description:
    "Understand how traffic moves from a Pod, through a Service, and out to users without memorizing networking terms.",
  icon: "network",
  lessons: [
    {
      id: "services-give-one-address",
      title: "A Service gives Pods one stable address",
      summary:
        "Pods come and go. A Service provides a stable name and virtual IP for a changing set of Pods.",
      minutes: 4,
      goal: "Explain why clients call a Service instead of a specific Pod IP.",
      steps: [
        "A Service selects Pods using labels.",
        "Clients use the Service name and port, not an individual Pod IP.",
        "ClusterIP is reachable inside the cluster. NodePort and LoadBalancer expose it more widely.",
        "If a Service has no ready endpoints, the problem is usually its selector or Pod readiness.",
      ],
      command: "kubectl get services -A",
      commandNote:
        "In KubeView, open Services to see type, ports, and ready endpoint counts.",
      deepDive:
        "kube-proxy or an eBPF data plane programs forwarding for the Service virtual IP. The Service object itself does not proxy packets.",
      action: {
        label: "Open Services",
        tabId: "services",
        tabTitle: "Services",
      },
      check: {
        question: "How does a Service find its Pods?",
        options: [
          { id: "labels", label: "Its label selector matches Pod labels" },
          { id: "node", label: "It uses the Node name" },
          { id: "namespace", label: "It uses the namespace only" },
        ],
        correctOptionId: "labels",
        explanation:
          "The Service selector matches Pod labels. No matching ready Pods means no endpoints.",
      },
    },
    {
      id: "endpoints-show-who-is-behind",
      title: "Endpoints show who is behind a Service",
      summary:
        "Endpoints are the actual readiness-filtered addresses a Service can send traffic to.",
      minutes: 3,
      goal: "Use endpoints to distinguish a Service configuration problem from a Pod health problem.",
      steps: [
        "Open Endpoints to see addresses mapped to a Service.",
        "An empty endpoint list usually means no selected Pod is ready.",
        "Check the Service selector and the Pod readiness conditions together.",
        "A headless Service intentionally has no ClusterIP, but still exposes endpoints.",
      ],
      command: "kubectl get endpoints -n <namespace>",
      commandNote:
        "KubeView also shows endpoint readiness in the Services page.",
      deepDive:
        "EndpointSlices replace the older monolithic Endpoints object at scale. KubeView presents the same readiness concept.",
      action: {
        label: "Open Endpoints",
        tabId: "endpoints",
        tabTitle: "Endpoints",
      },
      check: {
        question: "A Service has no endpoints. What is the most likely cause?",
        options: [
          { id: "dns", label: "The cluster has no DNS" },
          {
            id: "selector",
            label: "The selector matches no ready Pods",
          },
          { id: "ingress", label: "The Ingress is disabled" },
        ],
        correctOptionId: "selector",
        explanation:
          "A Service needs selected, ready Pods before it can produce usable endpoints.",
      },
    },
    {
      id: "ingress-and-gateway",
      title: "Ingress and Gateways expose HTTP",
      summary:
        "A Service is mostly internal. An Ingress or Gateway routes external HTTP traffic to Services.",
      minutes: 4,
      goal: "Know the extra pieces required before a public hostname reaches your app.",
      steps: [
        "An Ingress or Gateway object describes host and path routing.",
        "An ingress controller or gateway implementation must actually handle that traffic.",
        "TLS configuration also needs a valid certificate Secret.",
        "A working Service does not guarantee a working Ingress.",
      ],
      command: "kubectl get ingress -A",
      commandNote:
        "If your cluster uses Gateway API, use kubectl get gateways -A instead.",
      deepDive:
        "Ingress is a stable but limited API. Gateway API separates gateway infrastructure from route ownership and supports richer protocol routing.",
      action: {
        label: "Open Ingresses",
        tabId: "ingresses",
        tabTitle: "Ingresses & Gateways",
      },
      check: {
        question: "Which extra component is required for an Ingress to work?",
        options: [
          {
            id: "controller",
            label: "An ingress controller or gateway implementation",
          },
          { id: "nodeport", label: "A NodePort Service only" },
          { id: "cronjob", label: "A CronJob" },
        ],
        correctOptionId: "controller",
        explanation:
          "The Ingress object is a routing request. A controller must implement it.",
      },
    },
    {
      id: "port-forward-private-tunnel",
      title: "Port forwarding is a private tunnel",
      summary:
        "Port forwarding maps a port on your machine to a Pod or Service through the Kubernetes API.",
      minutes: 3,
      goal: "Use port forwarding for debugging without exposing anything to the internet.",
      steps: [
        "Choose a Service or Pod and a remote port.",
        "KubeView binds a loopback-only local port on your machine.",
        "Open 127.0.0.1:<local-port> in your browser or client.",
        "Stop the forward when you finish debugging.",
      ],
      command: "kubectl port-forward service/<name> 8080:80 -n <namespace>",
      commandNote:
        "The left side is your local port. The right side is the port inside the cluster.",
      deepDive:
        "The tunnel is carried over the API server connection. It can fail when RBAC blocks port-forward or when the target Pod is not ready.",
      action: {
        label: "Open Port Forwards",
        tabId: "portforwards",
        tabTitle: "Port Forwards",
      },
      check: {
        question: "Who can reach a KubeView port-forward by default?",
        options: [
          { id: "internet", label: "Anyone on the internet" },
          { id: "cluster", label: "Every Pod in the cluster" },
          { id: "local", label: "Only clients on your own machine" },
        ],
        correctOptionId: "local",
        explanation:
          "The listener binds to loopback, so it is a local debugging tool.",
      },
    },
  ],
};
