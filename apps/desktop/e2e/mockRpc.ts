import type { Page, Route } from "@playwright/test";

type JsonRecord = Record<string, unknown>;

const now = new Date("2026-10-27T08:00:00Z").toISOString();

const overview = {
  contextName: "mock-cluster",
  totalNodes: 1,
  readyNodes: 1,
  totalPods: 2,
  runningPods: 2,
  pendingPods: 0,
  failedPods: 0,
  succeededPods: 0,
  totalCpuCores: 4,
  allocatedCpuCores: 1,
  cpuPercent: 25,
  totalMemoryGiB: 8,
  allocatedMemoryGiB: 2,
  memoryPercent: 25,
  podCapacity: 110,
  podPercent: 2,
  hasMetrics: false,
  nodes: [
    {
      name: "worker-1",
      status: "Ready",
      roles: ["worker"],
      version: "v1.30.0",
      architecture: "amd64",
      internalIP: "10.0.0.10",
      podCIDR: "10.244.1.0/24",
      podCIDRs: ["10.244.1.0/24"],
      cpuCapacity: "4 Cores",
      cpuCores: 4,
      cpuAllocated: "1000m",
      cpuPercent: 25,
      memoryCapacity: "8Gi",
      memoryGiB: 8,
      memoryAllocated: "2Gi",
      memoryPercent: 25,
      podCapacity: 110,
      activePods: 2,
    },
  ],
  warningEvents: [],
  workloads: {
    deployments: { total: 1, ready: 1, degraded: 0 },
    replicaSets: { total: 1, ready: 1, degraded: 0 },
    statefulSets: { total: 0, ready: 0, degraded: 0 },
    daemonSets: { total: 0, ready: 0, degraded: 0 },
    jobs: { total: 0, ready: 0, degraded: 0 },
    cronJobs: { total: 0, ready: 0, degraded: 0 },
  },
};

const fleetOverview = {
  clusters: [
    {
      contextName: "mock-cluster",
      cluster: "mock",
      server: "https://mock.example:6443",
      provider: "generic",
      authType: "cert",
      isCurrent: true,
      status: "healthy",
      totalNodes: overview.totalNodes,
      readyNodes: overview.readyNodes,
      totalPods: overview.totalPods,
      runningPods: overview.runningPods,
      pendingPods: overview.pendingPods,
      failedPods: overview.failedPods,
      degradedWorkloads: 0,
      degradedWorkloadsByKind: {
        deployments: 0,
        replicaSets: 0,
        statefulSets: 0,
        daemonSets: 0,
        jobs: 0,
        cronJobs: 0,
      },
      warningCount: 0,
      totalCpuCores: overview.totalCpuCores,
      cpuPercent: overview.cpuPercent,
      totalMemoryGiB: overview.totalMemoryGiB,
      memoryPercent: overview.memoryPercent,
      hasMetrics: overview.hasMetrics,
      fetchedAt: now,
    },
  ],
  totals: {
    total: 1,
    healthy: 1,
    degraded: 0,
    offline: 0,
    totalNodes: overview.totalNodes,
    readyNodes: overview.readyNodes,
    totalPods: overview.totalPods,
    runningPods: overview.runningPods,
    failedPods: overview.failedPods,
    degradedWorkloads: 0,
    warningCount: 0,
  },
  fetchedAt: now,
};

const pod = {
  name: "web-1",
  namespace: "production",
  status: "Running",
  ready: "1/1",
  restarts: 0,
  age: "5m",
  cpu: "10m",
  cpuPercent: 2,
  memory: "20Mi",
  memoryPercent: 3,
  nodeName: "worker-1",
  ip: "10.244.1.10",
  containers: [],
  creationTimestamp: now,
  labels: { app: "web" },
  annotations: {},
  qosClass: "Burstable",
  conditions: [{ type: "Ready", status: "True", reason: "ContainersReady" }],
};

const service = {
  name: "web",
  namespace: "production",
  type: "ClusterIP",
  status: "Active",
  readyEndpoints: 1,
  totalEndpoints: 1,
  clusterIP: "10.96.0.20",
  ports: [{ name: "http", protocol: "TCP", port: 80, targetPort: "8080" }],
  selector: { app: "web" },
  sessionAffinity: "None",
  age: "5m",
  creationTimestamp: now,
  labels: { app: "web" },
  annotations: {},
};

const headlessService = {
  ...service,
  name: "web-headless",
  clusterIP: "None",
  clusterIPs: ["None"],
  readyEndpoints: 2,
  totalEndpoints: 2,
};

const manualService = {
  ...service,
  name: "web-manual",
  clusterIP: "10.96.0.40",
  readyEndpoints: 1,
  totalEndpoints: 1,
  selector: {},
  ports: [{ name: "dns", protocol: "UDP", port: 53, targetPort: "53" }],
};

const pendingLoadBalancer = {
  ...service,
  name: "web-lb",
  type: "LoadBalancer",
  status: "Pending",
  clusterIP: "10.96.0.50",
  readyEndpoints: 0,
  totalEndpoints: 0,
  loadBalancerIPs: [],
};

const ingress = {
  name: "web-ingress",
  namespace: "production",
  className: "nginx",
  status: "Ready",
  hosts: ["app.example.com"],
  addresses: ["203.0.113.10"],
  paths: [
    {
      host: "app.example.com",
      path: "/",
      pathType: "Prefix",
      serviceName: "web",
      servicePort: "80",
    },
  ],
  tls: [
    {
      hosts: ["app.example.com"],
      secretName: "web-tls",
      status: "Valid",
      issuer: "CN=KubeView Test CA",
      subject: "CN=app.example.com",
      notAfter: "2027-10-27T08:00:00Z",
      dnsNames: ["app.example.com"],
      message: "",
    },
  ],
  defaultBackend: "",
  age: "5m",
  creationTimestamp: now,
};

const gateway = {
  kind: "Gateway",
  name: "edge",
  namespace: "infra",
  status: "Programmed",
  class: "nginx",
  hosts: ["edge.example.com"],
  addresses: ["203.0.113.20"],
  ruleCount: 0,
  listenerCount: 1,
  age: "5m",
  creationTimestamp: now,
};

const networkPolicy = {
  name: "web-allow",
  namespace: "production",
  status: "Ingress",
  podSelector: "app=web",
  policyTypes: ["Ingress"],
  ingressRules: 1,
  egressRules: 0,
  ingress: ["From all sources on all ports"],
  egress: [],
  ingressDetails: [
    {
      direction: "Ingress",
      peers: ["all sources"],
      ports: ["all ports"],
      description: "From all sources on all ports",
    },
  ],
  egressDetails: [],
  age: "5m",
  creationTimestamp: now,
};

const endpoint = {
  name: "web",
  namespace: "production",
  status: "Ready",
  addresses: [
    {
      ip: "10.244.1.10",
      nodeName: "worker-1",
      targetKind: "Pod",
      targetName: "web-1",
      ready: true,
    },
  ],
  ports: [{ name: "http", protocol: "TCP", port: 8080 }],
  readyCount: 1,
  notReadyCount: 0,
  age: "5m",
  creationTimestamp: now,
};

const portForward = {
  id: "pf-mock",
  contextName: "mock-cluster",
  namespace: "production",
  targetKind: "service",
  targetName: "web",
  targetPod: "web-1",
  remotePort: 8080,
  localPort: 18080,
  address: "127.0.0.1",
  status: "active",
  startedAt: now,
  activeConnections: 1,
  totalConnections: 3,
  bytesSent: 4096,
  bytesReceived: 8192,
};

const ciliumPolicy = {
  name: "allow-web",
  namespace: "production",
  endpointSelector: "app=web",
  ingressRules: 1,
  egressRules: 0,
  status: "Enforcing",
  age: "5m",
  creationTimestamp: now,
};

const ciliumEndpoint = {
  name: "web-1",
  namespace: "production",
  podName: "web-1",
  identityId: 1234,
  state: "ready",
  ipv4: "10.244.1.10",
  ingressPolicy: "Enforcing",
  egressPolicy: "Off",
  age: "5m",
  creationTimestamp: now,
};

const hubbleFlow = {
  time: now,
  verdict: "VERDICT_FORWARDED",
  type: "L3_L4",
  sourceNamespace: "production",
  sourcePod: "web-1",
  destinationNamespace: "production",
  destinationPod: "api-1",
  sourceIp: "10.244.1.10",
  destinationIp: "10.244.1.20",
  protocol: "TCP",
  sourcePort: "45678",
  destinationPort: "8080",
  nodeName: "worker-1",
  summary: "web-1 -> api-1 VERDICT_FORWARDED TCP/8080",
  rawJson: "{}",
};

const networkObservability = {
  cni: {
    provider: "cilium",
    displayName: "Cilium",
    version: "v1.16.0",
    detected: true,
    detectionSource: "DaemonSet kube-system/cilium",
    capabilities: [
      "overview",
      "standardNetworkPolicies",
      "services",
      "endpointSlices",
      "ciliumPolicies",
      "ciliumEndpoints",
      "hubbleFlows",
    ],
  },
  nodeCount: 1,
  readyNodeCount: 1,
  podCount: 2,
  runningPodCount: 2,
  serviceCount: 4,
  networkPolicyCount: 1,
  endpointSliceCount: 1,
  podCidrs: ["10.244.1.0/24"],
  ipFamilies: ["IPv4"],
};

const configMapSummary = {
  name: "app-config",
  namespace: "production",
  keys: ["app.conf"],
  dataKeyCount: 1,
  binaryKeyCount: 0,
  sizeBytes: 18,
  immutable: false,
  age: "5m",
  creationTimestamp: now,
  labels: { app: "web" },
  annotations: {},
};

const secretSummary = {
  name: "database-secret",
  namespace: "production",
  type: "Opaque",
  keys: ["password"],
  dataKeyCount: 1,
  sizeBytes: 22,
  immutable: false,
  age: "5m",
  creationTimestamp: now,
  labels: { app: "web" },
  annotations: {},
};

const persistentVolumeSummary = {
  name: "pv-data",
  capacity: "5Gi",
  accessModes: ["ReadWriteOnce"],
  reclaimPolicy: "Retain",
  status: "Bound",
  claim: "production/data",
  storageClass: "fast",
  volumeMode: "Filesystem",
  age: "5m",
  creationTimestamp: now,
  labels: {},
  annotations: {},
};

const storageClassSummary = {
  name: "fast",
  provisioner: "kubernetes.io/aws-ebs",
  reclaimPolicy: "Delete",
  volumeBindingMode: "WaitForFirstConsumer",
  allowVolumeExpansion: true,
  default: true,
  age: "5m",
  creationTimestamp: now,
  labels: {},
  annotations: {
    "storageclass.kubernetes.io/is-default-class": "true",
  },
};

const configMapYaml = `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  app.conf: enabled=true`;

const secretYaml = `apiVersion: v1
kind: Secret
metadata:
  name: database-secret
  namespace: production
type: Opaque
data:
  password: <redacted>`;

const persistentVolumeYaml = `apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-data
spec:
  capacity:
    storage: 5Gi
  storageClassName: fast`;

const storageClassYaml = `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: kubernetes.io/aws-ebs
reclaimPolicy: Delete`;

const configMapEditData = {
  name: "app-config",
  namespace: "production",
  resourceVersion: "1",
  immutable: false,
  data: { "app.conf": "enabled=true" },
  binaryData: {},
  age: "5m",
  creationTimestamp: now,
  labels: { app: "web" },
  annotations: {},
};

const secretEditData = {
  name: "database-secret",
  namespace: "production",
  resourceVersion: "1",
  immutable: false,
  type: "Opaque",
  entries: [{ key: "password", value: "super-secret-value", binary: false }],
  age: "5m",
  creationTimestamp: now,
  labels: { app: "web" },
  annotations: {},
};

const serviceAccountSummary = {
  name: "default",
  namespace: "production",
  secretNames: ["default-token"],
  imagePullSecretNames: [],
  automount: true,
  age: "5m",
  creationTimestamp: now,
  labels: {},
  annotations: {},
};

const roleSummary = {
  kind: "Role",
  name: "pod-reader",
  namespace: "production",
  roleRef: "",
  rules: [
    {
      verbs: ["get", "list"],
      apiGroups: [""],
      resources: ["pods"],
      resourceNames: [],
      nonResourceURLs: [],
    },
  ],
  subjects: [],
  age: "5m",
  creationTimestamp: now,
  labels: {},
  annotations: {},
};

const clusterRoleSummary = {
  ...roleSummary,
  kind: "ClusterRole",
  name: "view",
  namespace: "",
  rules: [
    {
      verbs: ["get"],
      apiGroups: [],
      resourceNames: [],
      nonResourceURLs: ["/healthz"],
    },
  ],
};

const roleBindingSummary = {
  kind: "RoleBinding",
  name: "read-pods",
  namespace: "production",
  roleRef: "Role/pod-reader",
  rules: [],
  subjects: [
    { kind: "ServiceAccount", name: "default", namespace: "production" },
  ],
  age: "5m",
  creationTimestamp: now,
  labels: {},
  annotations: {},
};

const crdSummary = {
  name: "widgets.example.com",
  group: "example.com",
  kind: "Widget",
  plural: "widgets",
  scope: "Namespaced",
  versions: [{ name: "v1", served: true, storage: true }],
  age: "5m",
  creationTimestamp: now,
  labels: {},
  annotations: {},
};

const serviceAccountYaml = `apiVersion: v1
kind: ServiceAccount
metadata:
  name: default
  namespace: production
secrets:
  - name: default-token`;

const roleYaml = `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]`;

const crdYaml = `apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: widgets.example.com
spec:
  group: example.com
  names:
    kind: Widget
    plural: widgets
  scope: Namespaced`;

const sampleYaml: Record<string, string> = {
  "services.yaml":
    "apiVersion: v1\nkind: Service\nmetadata:\n  name: web\n  namespace: production\n",
  "endpoints.yaml":
    "apiVersion: v1\nkind: Endpoints\nmetadata:\n  name: web\n  namespace: production\n",
  "ingresses.yaml":
    "apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: web-ingress\n  namespace: production\n",
  "gatewayresources.yaml":
    "apiVersion: gateway.networking.k8s.io/v1\nkind: Gateway\nmetadata:\n  name: edge\n  namespace: infra\n",
  "networkpolicies.yaml":
    "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: web-allow\n  namespace: production\n",
};

function resultFor(method: string, params?: JsonRecord): unknown {
  switch (method) {
    case "handshake":
      return {
        engineVersion: "mock",
        protocolVersion: "1.0.0",
        status: "ready",
        supportedApiVersions: ["v1"],
        streamPort: 0,
        streamToken: "",
      };
    case "clusters.listContexts":
      return {
        currentContext: "mock-cluster",
        configPath: "/tmp/mock-kubeconfig",
        contexts: [
          {
            name: "mock-cluster",
            cluster: "mock",
            server: "https://mock.example:6443",
            namespace: "default",
            isCurrent: true,
            provider: "generic",
            authType: "cert",
          },
        ],
      };
    case "clusters.switchContext": {
      const contextName =
        typeof params?.contextName === "string"
          ? params.contextName
          : "mock-cluster";
      return {
        activeContext: contextName,
        status: "ready",
        context: {
          name: contextName,
          cluster: contextName === "mock-cluster" ? "mock" : contextName,
          server: "https://mock.example:6443",
          user: "mock-user",
          namespace: "default",
          isCurrent: true,
          provider: "generic",
          authType: "cert",
        },
      };
    }
    case "clusters.diagnose":
      return {
        status: "connected",
        serverVersion: "v1.30.0",
        latencyMs: 12,
        stages: {
          network: { passed: true, latencyMs: 12 },
          auth: { passed: true },
          tls: { passed: true, latencyMs: 12 },
          rbac: { passed: true, details: { clusterAdmin: true } },
        },
      };
    case "clusters.listNamespaces":
      return { namespaces: ["default", "production", "kube-system", "infra"] };
    case "clusters.overview":
      return overview;
    case "clusters.fleetOverview":
      return fleetOverview;
    case "pods.list":
      return { items: [pod], totalCount: 1 };
    case "pods.diagnose":
      return {
        contextName: "mock-cluster",
        namespace: "production",
        podName: "web-1",
        generatedAt: now,
        severity: "critical",
        issueType: "crash",
        healthy: false,
        title: "CrashLoopBackOff",
        summary: "Container 'web' is crash-looping with 5 restart(s).",
        rootCause:
          "Application process in container 'web' repeatedly crashes on startup. Previous logs contain panic: failed to connect to database.",
        ownerKind: "Deployment",
        ownerName: "web",
        nodeName: "worker-1",
        conditions: [
          {
            type: "Ready",
            status: "False",
            lastTransitionTime: now,
            reason: "ContainersNotReady",
            message: "containers with unready status: [web]",
          },
        ],
        containers: [
          {
            name: "web",
            image: "example/web:v1",
            ready: false,
            restartCount: 5,
            state: "Waiting",
            stateReason: "CrashLoopBackOff",
            stateMessage: "back-off 5m0s restarting failed container=web",
            exitCode: 1,
            lastTerminatedReason: "Error",
            lastTerminatedMessage: "failed to connect to database",
            requests: { cpu: "100m", memory: "128Mi" },
            limits: { cpu: "500m", memory: "256Mi" },
            metricsAvailable: false,
            probes: [
              {
                kind: "readiness",
                configured: true,
                handler: "HTTP /healthz:8080",
                initialDelaySeconds: 5,
                timeoutSeconds: 1,
                periodSeconds: 10,
                failureThreshold: 3,
                status: "fail",
                message:
                  'Readiness probe failed: Get "http://10.244.1.10:8080/healthz": connection refused',
              },
            ],
            logExcerpt:
              "panic: failed to connect to database\n\tat main.main (main.go:42)",
            logSource: "previous",
          },
        ],
        events: [
          {
            type: "Warning",
            reason: "BackOff",
            message: "Back-off restarting failed container web",
            count: 5,
            lastTimestamp: now,
            source: "kubelet",
            involvedObjectKind: "Pod",
            involvedObjectName: "web-1",
            involvedObjectNamespace: "production",
          },
        ],
        evidence: [
          {
            id: "condition-ready",
            label: "Ready",
            status: "fail",
            summary: "Ready=False",
            details: [
              "ContainersNotReady: containers with unready status: [web]",
            ],
          },
          {
            id: "container-web",
            label: "Container web",
            status: "fail",
            summary: "Waiting · ready=false · restarts=5",
            details: ["reason: CrashLoopBackOff", "last exit code: 1"],
          },
          {
            id: "logs-web",
            label: "Logs web",
            status: "warning",
            summary: "Previous logs captured",
            details: ["panic: failed to connect to database"],
          },
          {
            id: "event-BackOff",
            label: "BackOff",
            status: "fail",
            summary: "Back-off restarting failed container web",
            details: ["kubelet · count=5"],
          },
        ],
        suggestedCommands: [
          {
            label: "Describe pod",
            command: "kubectl describe pod -n production web-1",
            description: "Show scheduler, container, probe, and event details.",
          },
          {
            label: "Previous logs · web",
            command:
              "kubectl logs -n production web-1 -c web --previous --tail=200",
            description: "Inspect logs from the last terminated instance.",
          },
          {
            label: "Pod events",
            command:
              "kubectl get events -n production --field-selector involvedObject.name=web-1 --sort-by=.lastTimestamp",
            description: "List the latest events for this pod.",
          },
        ],
        suggestedFixes: [
          {
            id: "inspect-crash-logs",
            title: "Inspect previous container logs",
            description:
              "Use the previous log excerpt and stack trace to identify the startup failure.",
            severity: "critical",
          },
          {
            id: "check-startup-dependencies",
            title: "Check startup dependencies",
            description:
              "Confirm environment variables, database connectivity, and startup probes are valid.",
            severity: "warning",
          },
        ],
      };
    case "pods.events":
      return { events: [] };
    case "networking.counts":
      return {
        services: 4,
        endpoints: 1,
        ingresses: 1,
        gatewayResources: 1,
        networkPolicies: 1,
        ciliumPolicies: 1,
        ciliumEndpoints: 1,
        activePortForwards: 1,
        configMaps: 1,
        secrets: 1,
        persistentVolumes: 1,
        storageClasses: 1,
        serviceAccounts: 1,
        roles: 1,
        clusterRoles: 1,
        roleBindings: 1,
        clusterRoleBindings: 0,
        crds: 1,
      };
    case "services.list":
      return {
        items: [service, headlessService, manualService, pendingLoadBalancer],
        totalCount: 4,
      };
    case "endpoints.list":
      return { items: [endpoint], totalCount: 1 };
    case "ingresses.list":
      return { items: [ingress], totalCount: 1 };
    case "gatewayresources.list":
      return { items: [gateway], totalCount: 1, available: true };
    case "networkpolicies.list":
      return { items: [networkPolicy], totalCount: 1 };
    case "networking.diagnoseService":
      return {
        service,
        dnsName: "web.production.svc.cluster.local",
        summary: "Healthy",
        generatedAt: now,
        checks: [
          {
            id: "selector",
            label: "Pod selector",
            status: "pass",
            message: "1 selected pod, 1 ready",
            details: ["production/web-1 ready=true phase=Running"],
          },
          {
            id: "endpoints",
            label: "Endpoints",
            status: "pass",
            message: "1 ready address, 0 not ready",
          },
          {
            id: "ports",
            label: "Target ports",
            status: "pass",
            message: "Every Service port maps to an endpoint port.",
          },
          {
            id: "dns",
            label: "DNS",
            status: "pass",
            message: "web.production.svc.cluster.local resolved.",
          },
        ],
      };
    case "portforwards.list":
      return { items: [portForward] };
    case "portforwards.start":
      return portForward;
    case "portforwards.stop":
      return { ...portForward, status: "stopped", activeConnections: 0 };
    case "networking.observability":
      return networkObservability;
    case "configmaps.list":
      return { items: [configMapSummary], totalCount: 1 };
    case "configmaps.yaml":
      return { yaml: configMapYaml };
    case "secrets.list":
      return { items: [secretSummary], totalCount: 1 };
    case "secrets.yaml":
      return { yaml: secretYaml };
    case "persistentvolumes.list":
      return { items: [persistentVolumeSummary], totalCount: 1 };
    case "persistentvolumes.yaml":
      return { yaml: persistentVolumeYaml };
    case "storageclasses.list":
      return { items: [storageClassSummary], totalCount: 1 };
    case "storageclasses.yaml":
      return { yaml: storageClassYaml };
    case "configmaps.editData":
      return configMapEditData;
    case "configmaps.apply":
      return { resourceVersion: "2" };
    case "secrets.reveal":
      return secretEditData;
    case "secrets.apply":
      return { resourceVersion: "2" };
    case "serviceaccounts.list":
      return { items: [serviceAccountSummary], totalCount: 1 };
    case "serviceaccounts.yaml":
      return { yaml: serviceAccountYaml };
    case "rbac.list":
      return {
        items: [roleSummary, clusterRoleSummary, roleBindingSummary],
        totalCount: 3,
      };
    case "rbac.yaml":
      return { yaml: roleYaml };
    case "crds.list":
      return { items: [crdSummary], totalCount: 1 };
    case "crds.yaml":
      return { yaml: crdYaml };
    case "crds.instances":
      return {
        items: [
          {
            name: "example-widget",
            namespace: "production",
            status: "Ready",
            age: "5m",
            creationTimestamp: now,
            labels: {},
            annotations: {},
          },
        ],
        totalCount: 1,
      };
    case "cilium.list":
      return {
        policies: [ciliumPolicy],
        endpoints: [ciliumEndpoint],
        status: {
          installed: true,
          version: "v1.16.0",
          networkPolicyCount: 1,
          endpointCount: 1,
          hubbleAvailable: true,
          hubbleRelayService: "kube-system/hubble-relay",
          hubbleRelayPort: 4245,
        },
      };
    case "cilium.hubbleFlows":
      return { flows: [hubbleFlow] };
    case "ingresses.apply":
    case "gatewayresources.apply":
      return { ...ingress };
    case "ingresses.delete":
    case "gatewayresources.delete":
      return { success: true };
    default:
      if (method.endsWith(".yaml")) {
        return {
          yaml: sampleYaml[method] ?? "apiVersion: v1\nkind: ConfigMap\n",
        };
      }
      if (method.endsWith(".list")) {
        return { items: [], totalCount: 0 };
      }
      return {};
  }
}

export interface MockRpcOptions {
  responses?: Record<string, unknown>;
}

export async function mockRpc(
  page: Page,
  options: MockRpcOptions = {},
): Promise<void> {
  await page.route("**/api/rpc", async (route: Route) => {
    let body: { method?: string; params?: JsonRecord } = {};
    try {
      body = route.request().postDataJSON() as typeof body;
    } catch {
      body = {};
    }
    const method = body.method ?? "";
    const hasOverride = Object.prototype.hasOwnProperty.call(
      options.responses ?? {},
      method,
    );
    const result = hasOverride
      ? options.responses?.[method]
      : resultFor(method, body.params);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result }),
    });
  });
}
