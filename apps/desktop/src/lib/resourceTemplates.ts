import type { ResourceEditorTarget } from "@/stores/cluster/types/networking";

export interface WorkloadCreateValues {
  name: string;
  namespace: string;
  containerName: string;
  image: string;
  command: string;
  args: string;
  completions: string;
  parallelism: string;
  backoffLimit: string;
  restartPolicy: "Never" | "OnFailure";
  ttlSecondsAfterFinished: string;
  suspend: boolean;
  schedule: string;
  timeZone: string;
  concurrencyPolicy: "Allow" | "Forbid" | "Replace";
  startingDeadlineSeconds: string;
  successfulJobsHistoryLimit: string;
  failedJobsHistoryLimit: string;
}

export const DEFAULT_WORKLOAD_VALUES: WorkloadCreateValues = {
  name: "",
  namespace: "default",
  containerName: "job",
  image: "busybox:1.36",
  command: "sh",
  args: "-c, echo hello",
  completions: "",
  parallelism: "",
  backoffLimit: "3",
  restartPolicy: "Never",
  ttlSecondsAfterFinished: "",
  suspend: false,
  schedule: "*/5 * * * *",
  timeZone: "",
  concurrencyPolicy: "Forbid",
  startingDeadlineSeconds: "",
  successfulJobsHistoryLimit: "3",
  failedJobsHistoryLimit: "1",
};

function scalar(value: string): string {
  return JSON.stringify(value);
}

function numberLine(key: string, value: string, indent: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return `${indent}${key}: ${Math.floor(parsed)}`;
}

function splitArgs(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function containerLines(
  values: WorkloadCreateValues,
  indent: string,
): string[] {
  const lines = [
    `${indent}- name: ${scalar(values.containerName.trim() || "job")}`,
    `${indent}  image: ${scalar(values.image.trim() || "busybox:1.36")}`,
  ];
  if (values.command.trim()) {
    lines.push(
      `${indent}  command: [${splitArgs(values.command)
        .map(scalar)
        .join(", ")}]`,
    );
  }
  const args = splitArgs(values.args);
  if (args.length > 0) {
    lines.push(`${indent}  args: [${args.map(scalar).join(", ")}]`);
  }
  return lines;
}

export function buildJobManifest(values: WorkloadCreateValues): string {
  const lines = [
    "apiVersion: batch/v1",
    "kind: Job",
    "metadata:",
    `  name: ${scalar(values.name.trim())}`,
  ];
  if (values.namespace.trim()) {
    lines.push(`  namespace: ${scalar(values.namespace.trim())}`);
  }
  lines.push("spec:");
  const numeric = [
    numberLine("completions", values.completions, "  "),
    numberLine("parallelism", values.parallelism, "  "),
    numberLine("backoffLimit", values.backoffLimit, "  "),
    numberLine("ttlSecondsAfterFinished", values.ttlSecondsAfterFinished, "  "),
  ];
  for (const line of numeric) if (line) lines.push(line);
  if (values.suspend) lines.push("  suspend: true");
  lines.push(
    "  template:",
    "    spec:",
    `      restartPolicy: ${values.restartPolicy}`,
    "      containers:",
    ...containerLines(values, "        "),
  );
  return `${lines.join("\n")}\n`;
}

export function buildCronJobManifest(values: WorkloadCreateValues): string {
  const lines = [
    "apiVersion: batch/v1",
    "kind: CronJob",
    "metadata:",
    `  name: ${scalar(values.name.trim())}`,
  ];
  if (values.namespace.trim()) {
    lines.push(`  namespace: ${scalar(values.namespace.trim())}`);
  }
  lines.push(
    "spec:",
    `  schedule: ${scalar(values.schedule.trim() || "*/5 * * * *")}`,
  );
  if (values.timeZone.trim()) {
    lines.push(`  timeZone: ${scalar(values.timeZone.trim())}`);
  }
  lines.push(`  concurrencyPolicy: ${values.concurrencyPolicy}`);
  if (values.suspend) lines.push("  suspend: true");
  const numeric = [
    numberLine("startingDeadlineSeconds", values.startingDeadlineSeconds, "  "),
    numberLine(
      "successfulJobsHistoryLimit",
      values.successfulJobsHistoryLimit,
      "  ",
    ),
    numberLine("failedJobsHistoryLimit", values.failedJobsHistoryLimit, "  "),
  ];
  for (const line of numeric) if (line) lines.push(line);
  lines.push("  jobTemplate:", "    spec:");
  const backoff = numberLine("backoffLimit", values.backoffLimit, "      ");
  if (backoff) lines.push(backoff);
  lines.push(
    "      template:",
    "        spec:",
    `          restartPolicy: ${values.restartPolicy}`,
    "          containers:",
    ...containerLines(values, "            "),
  );
  return `${lines.join("\n")}\n`;
}

export function buildWorkloadManifest(
  kind: "Job" | "CronJob",
  values: WorkloadCreateValues,
): string {
  return kind === "CronJob"
    ? buildCronJobManifest(values)
    : buildJobManifest(values);
}

function manifestHeader(target: ResourceEditorTarget, name?: string): string {
  const lines = [
    `apiVersion: ${target.apiVersion}`,
    `kind: ${target.kind}`,
    "metadata:",
    `  name: ${name ?? target.name ?? `new-${target.kind.toLowerCase()}`}`,
  ];
  if (target.namespace) {
    lines.push(`  namespace: ${target.namespace}`);
  }
  return lines.join("\n");
}

function podSpec(name: string, image = "nginx:1.27-alpine"): string[] {
  return [
    "      containers:",
    `        - name: ${name}`,
    `          image: ${image}`,
    "          ports:",
    "            - containerPort: 80",
  ];
}

function workloadTemplate(
  target: ResourceEditorTarget,
  kind:
    | "Deployment"
    | "StatefulSet"
    | "DaemonSet"
    | "ReplicaSet"
    | "ReplicationController"
    | "Pod",
): string {
  const name = target.name || `new-${kind.toLowerCase()}`;
  const header = manifestHeader(target, name);
  if (kind === "Pod") {
    return `${header}
spec:
${podSpec("main").join("\n")}
`;
  }
  const selector =
    kind === "ReplicationController"
      ? ["  selector:", `    app: ${name}`]
      : ["  selector:", "    matchLabels:", `      app: ${name}`];
  const spec: string[] = [];
  if (kind === "Deployment" || kind === "StatefulSet") {
    spec.push("  replicas: 1");
  }
  if (kind === "StatefulSet") {
    spec.push("  serviceName: " + name);
    spec.push("  podManagementPolicy: OrderedReady");
  }
  spec.push(...selector);
  spec.push(
    "  template:",
    "    metadata:",
    "      labels:",
    `        app: ${name}`,
  );
  spec.push("    spec:");
  spec.push(...podSpec("main"));
  return `${header}
spec:
${spec.join("\n")}
`;
}

/** Starter manifests for every creatable resource kind. */
export function starterManifest(target: ResourceEditorTarget): string {
  if (target.kind === "Job" || target.kind === "CronJob") {
    return buildWorkloadManifest(target.kind, {
      ...DEFAULT_WORKLOAD_VALUES,
      name: target.name || `new-${target.kind.toLowerCase()}`,
      namespace: target.namespace || "default",
    });
  }

  const name = target.name || `new-${target.kind.toLowerCase()}`;
  const header = manifestHeader(target, name);

  switch (target.kind) {
    case "Namespace":
      return `${header}
  labels:
    app.kubernetes.io/managed-by: kubeview
`;
    case "Pod":
    case "Deployment":
    case "StatefulSet":
    case "DaemonSet":
    case "ReplicaSet":
    case "ReplicationController":
      return workloadTemplate(target, target.kind);
    case "Service":
      return `${header}
spec:
  type: ClusterIP
  selector:
    app: ${name}
  ports:
    - name: http
      port: 80
      targetPort: 8080
      protocol: TCP
`;
    case "Endpoints":
      return `${header}
subsets:
  - addresses:
      - ip: 10.0.0.10
    ports:
      - port: 80
        protocol: TCP
`;
    case "EndpointSlice":
      return `${header}
addressType: IPv4
endpoints:
  - addresses:
      - 10.0.0.10
ports:
  - name: http
    port: 80
    protocol: TCP
`;
    case "Ingress":
      return `${header}
spec:
  ingressClassName: nginx
  rules:
    - host: example.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${name}
                port:
                  number: 80
`;
    case "IngressClass":
      return `${header}
spec:
  controller: example.com/ingress-controller
`;
    case "NetworkPolicy":
      return `${header}
spec:
  podSelector:
    matchLabels:
      app: ${name}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: ${name}
`;
    case "ConfigMap":
      return `${header}
data:
  key: value
`;
    case "Secret":
      return `${header}
type: Opaque
stringData:
  key: value
`;
    case "PersistentVolumeClaim":
      return `${header}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: standard
`;
    case "PersistentVolume":
      return `${header}
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: manual
  hostPath:
    path: /tmp/kubeview-data
`;
    case "StorageClass":
      return `${header}
provisioner: kubernetes.io/no-provisioner
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
`;
    case "ServiceAccount":
      return `${header}
`;
    case "HorizontalPodAutoscaler":
      return `${header}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${name}
  minReplicas: 1
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
`;
    case "VerticalPodAutoscaler":
      return `${header}
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${name}
  updatePolicy:
    updateMode: "Off"
`;
    case "PodDisruptionBudget":
      return `${header}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: ${name}
`;
    case "ResourceQuota":
      return `${header}
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    pods: "10"
`;
    case "LimitRange":
      return `${header}
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
`;
    case "PriorityClass":
      return `${header}
value: 1000
globalDefault: false
description: Managed by KubeView
`;
    case "RuntimeClass":
      return `${header}
handler: runc
`;
    case "Lease":
      return `${header}
spec:
  holderIdentity: kubeview
  leaseDurationSeconds: 15
`;
    case "Role":
      return `${header}
rules:
  - apiGroups:
      - ""
    resources:
      - pods
    verbs:
      - get
      - list
      - watch
`;
    case "ClusterRole":
      return `${header}
rules:
  - apiGroups:
      - ""
    resources:
      - pods
    verbs:
      - get
      - list
      - watch
`;
    case "RoleBinding":
      return `${header}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ${name}
subjects:
  - kind: ServiceAccount
    name: default
    namespace: ${target.namespace || "default"}
`;
    case "ClusterRoleBinding":
      return `${header}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ${name}
subjects:
  - kind: ServiceAccount
    name: default
    namespace: ${target.namespace || "default"}
`;
    case "CustomResourceDefinition":
      return `${manifestHeader(target, target.name || "widgets.example.com")}
spec:
  group: example.com
  names:
    plural: widgets
    singular: widget
    kind: Widget
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                size:
                  type: string
`;
    case "GatewayClass":
      return `${header}
spec:
  controllerName: example.com/gateway-controller
`;
    case "Gateway":
      return `${header}
spec:
  gatewayClassName: ${name}
  listeners:
    - name: http
      protocol: HTTP
      port: 80
`;
    case "HTTPRoute":
      return `${header}
spec:
  parentRefs:
    - name: ${name}
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: ${name}
          port: 80
`;
    case "GRPCRoute":
      return `${header}
spec:
  parentRefs:
    - name: ${name}
  rules:
    - backendRefs:
        - name: ${name}
          port: 50051
`;
    case "MutatingWebhookConfiguration":
    case "ValidatingWebhookConfiguration":
      return `${header}
webhooks: []
# Add webhook entries with clientConfig.service or clientConfig.url.
`;
    case "ValidatingAdmissionPolicy":
      return `${header}
spec:
  matchConstraints:
    resourceRules:
      - apiGroups:
          - ""
        apiVersions:
          - v1
        operations:
          - CREATE
        resources:
          - pods
  validations:
    - expression: "true"
`;
    case "ValidatingAdmissionPolicyBinding":
      return `${header}
spec:
  policyName: ${name}
  validationActions:
    - Deny
`;
    default:
      return `${header}
spec: {}
# Add the fields required by this resource's schema.
`;
  }
}
