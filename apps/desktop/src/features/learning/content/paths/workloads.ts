import type { LearningPath } from "../../types";

export const workloadsPath: LearningPath = {
  id: "workloads",
  title: "Run an application",
  description:
    "Follow the path from a container image to a healthy Deployment, then learn where to look when it is not healthy.",
  icon: "boxes",
  lessons: [
    {
      id: "pods-run-containers",
      title: "Pods run your containers",
      summary:
        "A Pod is the smallest unit Kubernetes schedules. It usually wraps one application container.",
      minutes: 3,
      goal: "Understand what you are looking at when you open the Pods page.",
      steps: [
        "A Pod gets scheduled onto one Node.",
        "The containers inside that Pod share a network address.",
        "If a Pod dies, a controller such as a Deployment normally replaces it.",
        "The Pods page shows phase, readiness, restarts, Node, and age.",
      ],
      command: "kubectl get pods -A",
      commandNote:
        "The -A flag means all namespaces. Remove it to use the current namespace only.",
      deepDive:
        "Pod phase is a summary, not the full story. A Running Pod can still be unready because its readiness probe fails.",
      action: { label: "Open Pods", tabId: "pods", tabTitle: "Pods" },
      check: {
        question: "What is the smallest thing Kubernetes schedules?",
        options: [
          { id: "container", label: "A container image" },
          { id: "pod", label: "A Pod" },
          { id: "deployment", label: "A Deployment" },
        ],
        correctOptionId: "pod",
        explanation:
          "Containers run inside Pods. The scheduler places Pods onto Nodes.",
      },
    },
    {
      id: "deployments-keep-pods-alive",
      title: "Deployments keep Pods alive",
      summary:
        "You describe the desired replica count. The Deployment creates ReplicaSets, and ReplicaSets create Pods.",
      minutes: 4,
      goal: "Know why you normally edit a Deployment instead of editing a Pod directly.",
      steps: [
        "You set a container image and a replica count on the Deployment.",
        "The Deployment creates or updates a ReplicaSet for that revision.",
        "The ReplicaSet keeps the requested number of Pods running.",
        "Replacing Pods manually is fragile because the controller will recreate them.",
      ],
      command: "kubectl get deployments -A",
      commandNote:
        "Look at READY to compare ready replicas with desired replicas.",
      deepDive:
        "A rollout creates a new ReplicaSet and gradually moves traffic while monitoring readiness. Old ReplicaSets remain for rollback history.",
      action: {
        label: "Open Deployments",
        tabId: "deployments",
        tabTitle: "Deployments",
      },
      check: {
        question: "Which object usually creates ReplicaSets?",
        options: [
          { id: "service", label: "A Service" },
          { id: "deployment", label: "A Deployment" },
          { id: "configmap", label: "A ConfigMap" },
        ],
        correctOptionId: "deployment",
        explanation:
          "A Deployment manages ReplicaSets, and a ReplicaSet manages Pods.",
      },
    },
    {
      id: "watch-a-rollout",
      title: "Watch a rollout safely",
      summary:
        "A rollout is gradual replacement. Readiness determines when a new Pod counts as usable.",
      minutes: 4,
      goal: "Know how to tell whether a new version is actually healthy.",
      steps: [
        "Compare READY replicas with the desired number.",
        "Check the Deployment conditions and recent events.",
        "A Pod can be Running while its readiness probe still fails.",
        "If rollout progress stalls, describe the Pods before changing anything else.",
      ],
      command: "kubectl rollout status deployment/<name> -n <namespace>",
      commandNote:
        "Replace <name> and <namespace> with the real values shown in KubeView.",
      deepDive:
        "maxSurge and maxUnavailable control rollout speed. A too-aggressive readiness probe can make a healthy app look unavailable.",
      action: {
        label: "Review Deployments",
        tabId: "deployments",
        tabTitle: "Deployments",
      },
      check: {
        question:
          "A new Pod is Running but not Ready. What should you check first?",
        options: [
          { id: "delete", label: "Delete the whole Deployment" },
          {
            id: "probe",
            label: "Its readiness probe, events, and application logs",
          },
          { id: "node", label: "Add more Nodes immediately" },
        ],
        correctOptionId: "probe",
        explanation:
          "Running means the container started. Ready means Kubernetes considers it able to serve traffic.",
      },
    },
    {
      id: "read-logs-and-events",
      title: "Read logs and events",
      summary:
        "Logs tell you what the application did. Events tell you what Kubernetes did to the Pod.",
      minutes: 4,
      goal: "Use the right evidence source instead of guessing why a Pod failed.",
      steps: [
        "Open a Pod and read its Events for scheduling, pulling, and probe messages.",
        "Open Logs for application errors and startup output.",
        "Restart count reveals repeated crashes that a single log view may hide.",
        "Read the previous container log when the current container has already restarted.",
      ],
      command: "kubectl logs <pod> -n <namespace> --tail=100",
      commandNote:
        "Use --previous to inspect logs from the container instance that just exited.",
      deepDive:
        "A missing log stream is not always an application bug. Image pull failures and volume mount failures happen before the container can write logs.",
      action: { label: "Open Pods", tabId: "pods", tabTitle: "Pods" },
      check: {
        question: "Where do you look for an image pull failure?",
        options: [
          { id: "applogs", label: "Application logs only" },
          { id: "events", label: "Pod events" },
          { id: "ingress", label: "Ingress rules" },
        ],
        correctOptionId: "events",
        explanation:
          "Image pulls happen before your application starts, so Pod events are the right evidence.",
      },
    },
  ],
};
