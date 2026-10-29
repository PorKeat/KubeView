import type { LearningPath } from "../../types";

export const configStoragePath: LearningPath = {
  id: "config-storage",
  title: "Configuration and persistence",
  description:
    "Keep settings outside your image, handle credentials carefully, and understand what survives when a Pod restarts.",
  icon: "database",
  lessons: [
    {
      id: "configmaps-are-settings",
      title: "ConfigMaps hold ordinary settings",
      summary:
        "A ConfigMap stores non-secret configuration that Pods can read as environment variables or mounted files.",
      minutes: 4,
      goal: "Change application behavior without rebuilding its container image.",
      steps: [
        "A ConfigMap stores key-value pairs or small configuration files.",
        "A Pod can read it at startup or mount it as files.",
        "Changing the ConfigMap does not automatically restart existing Pods.",
        "A missing required key can stop a container from starting.",
      ],
      command: "kubectl get configmap <name> -n <namespace> -o yaml",
      commandNote: "KubeView shows ConfigMap keys and values in the inspector.",
      deepDive:
        "Mounted ConfigMaps update eventually, but environment variables are fixed when the container starts. Restart the workload after changing environment-based settings.",
      action: {
        label: "Open ConfigMaps",
        tabId: "configmaps",
        tabTitle: "ConfigMaps",
      },
      check: {
        question:
          "Does editing a ConfigMap automatically restart current Pods?",
        options: [
          { id: "yes", label: "Yes, Kubernetes restarts them automatically" },
          {
            id: "no",
            label: "No, the workload must be restarted or rolled out",
          },
          { id: "nodes", label: "Only if the Node restarts" },
        ],
        correctOptionId: "no",
        explanation:
          "Existing containers keep the values they already loaded. Plan a rollout when the change must take effect.",
      },
    },
    {
      id: "secrets-are-sensitive",
      title: "Secrets need care, not fear",
      summary:
        "A Secret is still an API object. Base64 hides the shape of the value, but it is not encryption.",
      minutes: 4,
      goal: "Treat Secret access as a security boundary and avoid copying credentials into unsafe places.",
      steps: [
        "Secrets are meant for credentials, tokens, and certificates.",
        "RBAC decides who can read a Secret. Kubernetes does not make every Secret public.",
        "Base64 encoding is reversible, so it is not protection by itself.",
        "KubeView redacts Secret values in normal views and excludes Secret manifests from GitOps drift.",
      ],
      command: "kubectl get secret <name> -n <namespace>",
      commandNote:
        "Avoid printing Secret values into terminals, tickets, or chat messages.",
      deepDive:
        "Encryption at rest depends on the cluster configuration. Prefer a dedicated secret manager when your security model requires rotation, audit, and centralized access control.",
      action: {
        label: "Open Secrets",
        tabId: "secrets",
        tabTitle: "Secrets",
      },
      check: {
        question: "What does base64 encoding do to a Secret value?",
        options: [
          { id: "encrypt", label: "Encrypts it with the cluster key" },
          { id: "reversible", label: "Changes its representation, reversibly" },
          { id: "delete", label: "Removes it from the cluster" },
        ],
        correctOptionId: "reversible",
        explanation:
          "Base64 is an encoding, not encryption. Anyone allowed to read the Secret can decode it.",
      },
    },
    {
      id: "persistent-storage",
      title: "Persistent storage survives Pods",
      summary:
        "A PersistentVolume is cluster storage. A PersistentVolumeClaim asks for some of it. A StorageClass can create it on demand.",
      minutes: 5,
      goal: "Explain why a Pod restart should not erase database data when storage is configured correctly.",
      steps: [
        "A PersistentVolumeClaim requests size and access mode.",
        "A StorageClass can provision a matching PersistentVolume automatically.",
        "The Pod mounts the claim, not the raw disk.",
        "A container filesystem without a mounted volume is tied to the Pod lifetime.",
      ],
      command: "kubectl get pvc -n <namespace>",
      commandNote:
        "A Pending claim often means provisioning failed or no matching volume exists.",
      deepDive:
        "ReadWriteOnce applies to a volume mount by one Node, not necessarily one Pod. StatefulSets combine stable identity with per-replica claims.",
      action: {
        label: "Open Persistent Volumes",
        tabId: "persistentvolumes",
        tabTitle: "Persistent Volumes",
      },
      check: {
        question: "Which object does a Pod usually mount for durable storage?",
        options: [
          { id: "pvc", label: "A PersistentVolumeClaim" },
          { id: "configmap", label: "A ConfigMap" },
          { id: "service", label: "A Service" },
        ],
        correctOptionId: "pvc",
        explanation:
          "The claim represents the request and binds to a volume that provides the storage.",
      },
    },
  ],
};
