import {
  now,
  overview,
  fleetOverview,
  pod,
  service,
  headlessService,
  manualService,
  pendingLoadBalancer,
  ingress,
  gateway,
  networkPolicy,
  endpoint,
  portForward,
  ciliumPolicy,
  ciliumEndpoint,
  hubbleFlow,
  networkObservability,
  configMapSummary,
  secretSummary,
  persistentVolumeSummary,
  storageClassSummary,
  configMapYaml,
  secretYaml,
  persistentVolumeYaml,
  storageClassYaml,
  configMapEditData,
  secretEditData,
  serviceAccountSummary,
  roleSummary,
  clusterRoleSummary,
  roleBindingSummary,
  crdSummary,
  serviceAccountYaml,
  roleYaml,
  crdYaml,
  sampleYaml,
  permissionEffective,
  permissionDecision,
  permissionSubject,
  gitOpsReport,
} from "./fixtures";

type JsonRecord = Record<string, unknown>;

export function resultFor(method: string, params?: JsonRecord): unknown {
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
    case "access.effective":
      return permissionEffective;
    case "access.currentIdentity":
      return permissionSubject;
    case "access.explain":
      return permissionDecision;
    case "gitops.scan":
      return gitOpsReport;
    case "resources.get": {
      const apiVersion = String(params?.apiVersion ?? "v1");
      const kind = String(params?.kind ?? "ConfigMap");
      const resource = String(params?.resource ?? "configmaps");
      const name = String(params?.name ?? "example");
      const namespace =
        typeof params?.namespace === "string" ? params.namespace : "";
      return {
        apiVersion,
        kind,
        resource,
        name,
        namespace: namespace || undefined,
        yaml: `apiVersion: ${apiVersion}\nkind: ${kind}\nmetadata:\n  name: ${name}${namespace ? `\n  namespace: ${namespace}` : ""}\n`,
      };
    }
    case "resources.apply": {
      const yaml = String(params?.yaml ?? "");
      const apiVersion =
        /^apiVersion:\s*(\S+)/m.exec(yaml)?.[1]?.trim() ?? "v1";
      const kind = /^kind:\s*(\S+)/m.exec(yaml)?.[1]?.trim() ?? "ConfigMap";
      const name = /^\s{2}name:\s*(\S+)/m.exec(yaml)?.[1]?.trim() ?? "example";
      const namespace =
        /^\s{2}namespace:\s*(\S+)/m.exec(yaml)?.[1]?.trim() ?? "";
      return {
        apiVersion,
        kind,
        resource: String(params?.resource ?? "configmaps"),
        name,
        namespace: namespace || undefined,
        created: false,
        dryRun: Boolean(params?.dryRun),
        yaml,
      };
    }
    case "resources.delete":
      return { deleted: true };
    case "resources.capabilities":
      return {
        get: true,
        create: true,
        update: true,
        delete: true,
        reasons: {},
      };
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
    case "simpleResources.list": {
      const kind =
        typeof params?.kind === "string" ? params.kind : "namespaces";
      const item = (
        name: string,
        namespace: string | undefined,
        status: string,
        statusTone: string,
        details: Record<string, string>,
      ) => ({
        name,
        namespace,
        status,
        statusTone,
        age: "3m",
        createdAt: now,
        details,
        labels: {},
        annotations: {},
      });

      if (kind === "namespaces") {
        return {
          kind,
          items: [
            item("default", undefined, "Active", "healthy", {
              phase: "Active",
            }),
            item("kube-system", undefined, "Active", "healthy", {
              phase: "Active",
            }),
            item("retiring", undefined, "Terminating", "warning", {
              phase: "Terminating",
            }),
          ],
          totalCount: 3,
        };
      }
      if (kind === "events") {
        return {
          kind,
          items: [
            item("web.1a2b", "default", "Warning", "critical", {
              reason: "BackOff",
              message: "Back-off restarting failed container web",
              type: "Warning",
              object: "Pod/web-1",
              count: "4",
            }),
            item("web.3c4d", "default", "Normal", "healthy", {
              reason: "Scheduled",
              message: "Successfully assigned default/web-1 to worker-1",
              type: "Normal",
              object: "Pod/web-1",
              count: "1",
            }),
            item("api.5e6f", "kube-system", "Warning", "critical", {
              reason: "FailedMount",
              message: "MountVolume.SetUp failed for volume config",
              type: "Warning",
              object: "Pod/api-0",
              count: "2",
            }),
          ],
          totalCount: 3,
        };
      }
      if (kind === "replicationcontrollers") {
        return {
          kind,
          items: [
            item("web-rc", "default", "1/2 ready", "warning", {
              desired: "2",
              ready: "1",
              available: "1",
              selector: "app=web",
            }),
          ],
          totalCount: 1,
        };
      }
      if (kind === "endpointslices") {
        return {
          kind,
          items: [
            item("web-abc", "default", "1 endpoints", "healthy", {
              service: "web",
              addressType: "IPv4",
              endpoints: "1",
              ports: "8080/TCP",
            }),
            item("web-def", "default", "0 endpoints", "warning", {
              service: "web",
              addressType: "IPv4",
              endpoints: "0",
              ports: "8081/TCP",
            }),
          ],
          totalCount: 2,
        };
      }
      if (kind === "ingressclasses") {
        return {
          kind,
          items: [
            item("nginx", undefined, "Default", "healthy", {
              controller: "k8s.io/ingress-nginx",
              default: "true",
            }),
            item("traefik", undefined, "Configured", "muted", {
              controller: "traefik.io/ingress-controller",
              default: "false",
            }),
          ],
          totalCount: 2,
        };
      }
      if (kind === "persistentvolumeclaims") {
        return {
          kind,
          items: [
            item("data", "default", "Bound", "healthy", {
              capacity: "2Gi",
              requested: "2Gi",
              accessModes: "ReadWriteOnce",
              storageClass: "fast",
              volume: "pv-data",
              volumeMode: "Filesystem",
            }),
            item("queue", "default", "Pending", "warning", {
              capacity: "0",
              requested: "1Gi",
              accessModes: "ReadWriteOnce",
              storageClass: "slow",
              volume: "",
              volumeMode: "Filesystem",
            }),
          ],
          totalCount: 2,
        };
      }
      return { kind, items: [], totalCount: 0 };
    }
    case "simpleResources.counts":
      return {
        namespaces: 3,
        events: 3,
        replicationControllers: 1,
        endpointSlices: 2,
        ingressClasses: 2,
        persistentVolumeClaims: 2,
      };
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
