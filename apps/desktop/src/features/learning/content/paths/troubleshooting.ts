import type { LearningPath } from "../../types";

export const troubleshootingPath: LearningPath = {
  id: "troubleshooting",
  title: "Fix a broken Pod",
  description:
    "Read the evidence in a calm order: status, events, logs, and the first real error.",
  icon: "wrench",
  lessons: [
    {
      id: "read-pod-status",
      title: "Read a Pod status without panic",
      summary:
        "Pod phase, container state, readiness, and restarts answer different questions.",
      minutes: 4,
      goal: "Describe what is broken without jumping straight to a restart.",
      steps: [
        "Pending means the Pod has not started running yet.",
        "Running means the container started, but it may still be unready.",
        "Waiting reasons such as ImagePullBackOff point to startup problems.",
        "Terminated state and exit codes explain containers that already stopped.",
      ],
      command: "kubectl get pod <name> -n <namespace> -o wide",
      commandNote:
        "KubeView's Pod inspector shows status, conditions, containers, and events together.",
      deepDive:
        "Pod phase is a coarse lifecycle summary. Container statuses and conditions provide the actionable detail.",
      action: { label: "Open Pods", tabId: "pods", tabTitle: "Pods" },
      check: {
        question:
          "The Pod phase is Running. Can the application still be unavailable?",
        options: [
          { id: "no", label: "No, Running always means ready" },
          { id: "yes", label: "Yes, readiness can still be failing" },
          { id: "restart", label: "Only after a Node restart" },
        ],
        correctOptionId: "yes",
        explanation:
          "Running describes container lifecycle. Readiness describes whether it should receive traffic.",
      },
    },
    {
      id: "events-are-the-diary",
      title: "Events are the cluster's recent diary",
      summary:
        "Events record scheduling, image pulls, mounts, probes, and controller decisions.",
      minutes: 3,
      goal: "Find the first meaningful warning instead of reading the newest one by itself.",
      steps: [
        "Open Events in the Pod inspector or troubleshooting assistant.",
        "Look for Warning events before the failure time.",
        "Scheduling failures mention resources, taints, or affinity.",
        "Image and volume failures happen before application logs exist.",
      ],
      command: "kubectl get events -n <namespace> --sort-by=.lastTimestamp",
      commandNote:
        "Events expire after a retention window, often around one hour by default.",
      deepDive:
        "Event reason strings are stable enough to guide diagnosis, but the message carries the specific missing resource or constraint.",
      action: { label: "Open Pods", tabId: "pods", tabTitle: "Pods" },
      check: {
        question: "Where should you look when an image cannot be pulled?",
        options: [
          { id: "events", label: "Pod events" },
          { id: "service", label: "Service endpoints" },
          { id: "rbac", label: "RoleBindings" },
        ],
        correctOptionId: "events",
        explanation:
          "The kubelet reports image pull failures as Pod events before any application log exists.",
      },
    },
    {
      id: "logs-show-app-behavior",
      title: "Logs explain what the application saw",
      summary:
        "Read current and previous container logs, and notice when no log exists at all.",
      minutes: 4,
      goal: "Separate an application crash from an infrastructure failure.",
      steps: [
        "Check the restart count before reading logs.",
        "Use previous logs when the current container restarted.",
        "Look for the first error, not only the last line.",
        "If there are no logs, check events for pulling, config, or mount errors.",
      ],
      command: "kubectl logs <pod> -n <namespace> --previous --tail=100",
      commandNote:
        "KubeView's log viewer includes previous-container access when available.",
      deepDive:
        "A readiness probe can fail while logs look healthy if the probe path, port, or startup timing is wrong.",
      action: {
        label: "Open Troubleshooting",
        tabId: "pods",
        tabTitle: "Pods",
      },
      check: {
        question:
          "The container has restarted and the current logs are empty. What helps?",
        options: [
          { id: "previous", label: "Previous container logs" },
          { id: "ingress", label: "Ingress hostnames" },
          { id: "nodes", label: "Node OS version" },
        ],
        correctOptionId: "previous",
        explanation:
          "The crashed instance's output is kept separately, which is often where the real error appears.",
      },
    },
    {
      id: "common-pod-errors",
      title: "Recognize the common failure names",
      summary:
        "CrashLoopBackOff, ImagePullBackOff, Pending, OOMKilled, and CreateContainerConfigError each point to a different layer.",
      minutes: 5,
      goal: "Turn a scary status label into a concrete next check.",
      steps: [
        "CrashLoopBackOff: the app starts, exits, and is restarted repeatedly. Read previous logs.",
        "ImagePullBackOff: the Node cannot pull the image. Check the image name and registry credentials.",
        "Pending: the scheduler cannot place the Pod, or image/volume setup is still blocking it.",
        "OOMKilled: the container exceeded its memory limit. Review usage and the limit.",
        "CreateContainerConfigError: a referenced ConfigMap, Secret, or key is missing.",
      ],
      command: "kubectl describe pod <name> -n <namespace>",
      commandNote: "The bottom Events section usually names the failing layer.",
      deepDive:
        "Restart backoff grows to avoid hot loops. A manual delete clears the symptom, not necessarily the cause.",
      action: {
        label: "Diagnose Pods",
        tabId: "pods",
        tabTitle: "Pods",
      },
      check: {
        question: "A container repeatedly starts and exits. Which status fits?",
        options: [
          { id: "crash", label: "CrashLoopBackOff" },
          { id: "image", label: "ImagePullBackOff" },
          { id: "pending", label: "Pending" },
        ],
        correctOptionId: "crash",
        explanation:
          "The container runs and exits repeatedly. Previous logs usually show why.",
      },
    },
  ],
};
