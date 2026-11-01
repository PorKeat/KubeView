import type { ResourceEditorTarget } from "@/stores/cluster/types/networking";
import { toManifestYaml } from "./manifestYaml";

export type CreateFormValues = Record<string, string>;

export interface CreateFormField {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea";
  placeholder?: string;
  hint?: string;
  options?: Array<{ label: string; value: string }>;
}

export interface CreateFormSpec {
  fields: CreateFormField[];
  defaults: CreateFormValues;
  suggestedName?: string;
  build: (
    values: CreateFormValues,
    target: ResourceEditorTarget,
  ) => Record<string, unknown>;
  validate?: (values: CreateFormValues) => string | null;
}

function text(values: CreateFormValues, key: string, fallback = ""): string {
  const value = (values[key] ?? "").trim();
  return value || fallback;
}

function integer(
  values: CreateFormValues,
  key: string,
  fallback: number,
): number {
  const parsed = Number((values[key] ?? "").trim());
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parsePairs(value: string | undefined): Record<string, string> {
  const pairs: Record<string, string> = {};
  for (const line of (value ?? "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const entry = trimmed.slice(separator + 1).trim();
    if (key) pairs[key] = entry;
  }
  return pairs;
}

function selectorFor(
  values: CreateFormValues,
  key: string,
  name: string,
): Record<string, string> {
  const selector = parsePairs(values[key]);
  return Object.keys(selector).length > 0 ? selector : { app: name };
}

function metadata(
  values: CreateFormValues,
  extraLabels?: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { name: values.name?.trim() ?? "" };
  const namespace = values.namespace?.trim();
  if (namespace) result.namespace = namespace;
  const labels = { ...parsePairs(values.labels), ...extraLabels };
  if (Object.keys(labels).length > 0) result.labels = labels;
  return result;
}

function container(values: CreateFormValues): Record<string, unknown> {
  const result: Record<string, unknown> = {
    name: text(values, "containerName", "main"),
    image: text(values, "image", "nginx:1.27-alpine"),
  };
  const port = integer(values, "containerPort", 0);
  if (port > 0) result.ports = [{ containerPort: port }];
  return result;
}

function podTemplate(values: CreateFormValues): Record<string, unknown> {
  return {
    metadata: { labels: { app: values.name?.trim() || "app" } },
    spec: { containers: [container(values)] },
  };
}

function workload(
  target: ResourceEditorTarget,
  values: CreateFormValues,
  spec: Record<string, unknown>,
): Record<string, unknown> {
  return {
    apiVersion: target.apiVersion,
    kind: target.kind,
    metadata: metadata(values),
    spec,
  };
}

const SERVICE_TYPES = ["ClusterIP", "NodePort", "LoadBalancer"];
const PROTOCOLS = ["TCP", "UDP", "SCTP"];
const ACCESS_MODES = [
  "ReadWriteOnce",
  "ReadOnlyMany",
  "ReadWriteMany",
  "ReadWriteOncePod",
];

function commonDefaults(target: ResourceEditorTarget): CreateFormValues {
  return {
    namespace: target.namespace || "",
  };
}

function createSpec(
  target: ResourceEditorTarget,
  fields: CreateFormField[],
  defaults: CreateFormValues,
  build: CreateFormSpec["build"],
  validate?: CreateFormSpec["validate"],
): CreateFormSpec {
  return {
    fields,
    defaults: { ...commonDefaults(target), ...defaults },
    build,
    validate,
  };
}

/**
 * Field definitions for every generic create flow. Common Name, Namespace, and
 * Labels inputs are rendered by the editor; these fields are kind-specific.
 */
export function createFormSpecFor(
  target: ResourceEditorTarget,
): CreateFormSpec {
  const { kind } = target;
  switch (kind) {
    case "Pod":
      return createSpec(
        target,
        [
          {
            key: "containerName",
            label: "Container name",
            placeholder: "main",
          },
          {
            key: "image",
            label: "Container image",
            placeholder: "nginx:1.27-alpine",
          },
          {
            key: "containerPort",
            label: "Container port",
            type: "number",
            placeholder: "80",
          },
        ],
        {
          containerName: "main",
          image: "nginx:1.27-alpine",
          containerPort: "80",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: { containers: [container(values)] },
        }),
      );

    case "Deployment":
    case "ReplicaSet":
      return createSpec(
        target,
        [
          {
            key: "replicas",
            label: "Replicas",
            type: "number",
            placeholder: "1",
          },
          {
            key: "containerName",
            label: "Container name",
            placeholder: "main",
          },
          {
            key: "image",
            label: "Container image",
            placeholder: "nginx:1.27-alpine",
          },
          {
            key: "containerPort",
            label: "Container port",
            type: "number",
            placeholder: "80",
          },
        ],
        {
          replicas: "1",
          containerName: "main",
          image: "nginx:1.27-alpine",
          containerPort: "80",
        },
        (values, current) =>
          workload(current, values, {
            replicas: integer(values, "replicas", 1),
            selector: {
              matchLabels: { app: values.name?.trim() || "app" },
            },
            template: podTemplate(values),
          }),
      );

    case "StatefulSet":
      return createSpec(
        target,
        [
          {
            key: "replicas",
            label: "Replicas",
            type: "number",
            placeholder: "1",
          },
          {
            key: "serviceName",
            label: "Headless service",
            placeholder: "my-service",
          },
          {
            key: "containerName",
            label: "Container name",
            placeholder: "main",
          },
          {
            key: "image",
            label: "Container image",
            placeholder: "nginx:1.27-alpine",
          },
          {
            key: "containerPort",
            label: "Container port",
            type: "number",
            placeholder: "80",
          },
        ],
        {
          replicas: "1",
          containerName: "main",
          image: "nginx:1.27-alpine",
          containerPort: "80",
        },
        (values, current) =>
          workload(current, values, {
            replicas: integer(values, "replicas", 1),
            serviceName: text(
              values,
              "serviceName",
              values.name?.trim() || "app",
            ),
            podManagementPolicy: "OrderedReady",
            selector: {
              matchLabels: { app: values.name?.trim() || "app" },
            },
            template: podTemplate(values),
          }),
      );

    case "DaemonSet":
      return createSpec(
        target,
        [
          {
            key: "containerName",
            label: "Container name",
            placeholder: "main",
          },
          {
            key: "image",
            label: "Container image",
            placeholder: "nginx:1.27-alpine",
          },
          {
            key: "containerPort",
            label: "Container port",
            type: "number",
            placeholder: "80",
          },
        ],
        {
          containerName: "main",
          image: "nginx:1.27-alpine",
          containerPort: "80",
        },
        (values, current) =>
          workload(current, values, {
            selector: {
              matchLabels: { app: values.name?.trim() || "app" },
            },
            template: podTemplate(values),
          }),
      );

    case "ReplicationController":
      return createSpec(
        target,
        [
          {
            key: "replicas",
            label: "Replicas",
            type: "number",
            placeholder: "1",
          },
          {
            key: "containerName",
            label: "Container name",
            placeholder: "main",
          },
          {
            key: "image",
            label: "Container image",
            placeholder: "nginx:1.27-alpine",
          },
          {
            key: "containerPort",
            label: "Container port",
            type: "number",
            placeholder: "80",
          },
        ],
        {
          replicas: "1",
          containerName: "main",
          image: "nginx:1.27-alpine",
          containerPort: "80",
        },
        (values, current) =>
          workload(current, values, {
            replicas: integer(values, "replicas", 1),
            selector: { app: values.name?.trim() || "app" },
            template: podTemplate(values),
          }),
      );

    case "Service":
      return createSpec(
        target,
        [
          {
            key: "serviceType",
            label: "Service type",
            type: "select",
            options: SERVICE_TYPES.map((value) => ({ label: value, value })),
          },
          {
            key: "selector",
            label: "Selector",
            placeholder: "app=web",
            hint: "One key=value per line. Defaults to app=<name>.",
          },
          {
            key: "port",
            label: "Service port",
            type: "number",
            placeholder: "80",
          },
          {
            key: "targetPort",
            label: "Target port",
            type: "number",
            placeholder: "8080",
          },
          {
            key: "protocol",
            label: "Protocol",
            type: "select",
            options: PROTOCOLS.map((value) => ({ label: value, value })),
          },
        ],
        {
          serviceType: "ClusterIP",
          port: "80",
          targetPort: "8080",
          protocol: "TCP",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            type: text(values, "serviceType", "ClusterIP"),
            selector: selectorFor(
              values,
              "selector",
              values.name?.trim() || "app",
            ),
            ports: [
              {
                name: "http",
                port: integer(values, "port", 80),
                targetPort: integer(values, "targetPort", 8080),
                protocol: text(values, "protocol", "TCP"),
              },
            ],
          },
        }),
      );

    case "Endpoints":
      return createSpec(
        target,
        [
          {
            key: "addresses",
            label: "Addresses",
            type: "textarea",
            placeholder: "10.0.0.10",
            hint: "One IP address per line.",
          },
          { key: "port", label: "Port", type: "number", placeholder: "80" },
          {
            key: "protocol",
            label: "Protocol",
            type: "select",
            options: PROTOCOLS.map((value) => ({ label: value, value })),
          },
        ],
        { addresses: "10.0.0.10", port: "80", protocol: "TCP" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          subsets: [
            {
              addresses: splitList(values.addresses).map((ip) => ({ ip })),
              ports: [
                {
                  port: integer(values, "port", 80),
                  protocol: text(values, "protocol", "TCP"),
                },
              ],
            },
          ],
        }),
      );

    case "EndpointSlice":
      return createSpec(
        target,
        [
          {
            key: "addressType",
            label: "Address type",
            type: "select",
            options: ["IPv4", "IPv6", "FQDN"].map((value) => ({
              label: value,
              value,
            })),
          },
          {
            key: "addresses",
            label: "Addresses",
            type: "textarea",
            placeholder: "10.0.0.10",
            hint: "One address per line.",
          },
          { key: "port", label: "Port", type: "number", placeholder: "80" },
          {
            key: "protocol",
            label: "Protocol",
            type: "select",
            options: PROTOCOLS.map((value) => ({ label: value, value })),
          },
          {
            key: "serviceName",
            label: "Service name",
            placeholder: "my-service",
            hint: "Adds the kubernetes.io/service-name label.",
          },
        ],
        {
          addressType: "IPv4",
          addresses: "10.0.0.10",
          port: "80",
          protocol: "TCP",
        },
        (values, current) => {
          const serviceName = text(values, "serviceName");
          return {
            apiVersion: current.apiVersion,
            kind: current.kind,
            metadata: metadata(
              values,
              serviceName
                ? { "kubernetes.io/service-name": serviceName }
                : undefined,
            ),
            addressType: text(values, "addressType", "IPv4"),
            endpoints: [
              {
                addresses: splitList(values.addresses).map(
                  (address) => address,
                ),
              },
            ],
            ports: [
              {
                name: "http",
                port: integer(values, "port", 80),
                protocol: text(values, "protocol", "TCP"),
              },
            ],
          };
        },
      );

    case "Ingress":
      return createSpec(
        target,
        [
          {
            key: "ingressClassName",
            label: "Ingress class",
            placeholder: "nginx",
          },
          { key: "host", label: "Host", placeholder: "example.local" },
          { key: "path", label: "Path", placeholder: "/" },
          {
            key: "pathType",
            label: "Path type",
            type: "select",
            options: ["Prefix", "Exact", "ImplementationSpecific"].map(
              (value) => ({
                label: value,
                value,
              }),
            ),
          },
          {
            key: "serviceName",
            label: "Backend service",
            placeholder: "my-service",
          },
          {
            key: "servicePort",
            label: "Service port",
            type: "number",
            placeholder: "80",
          },
        ],
        {
          ingressClassName: "nginx",
          host: "example.local",
          path: "/",
          pathType: "Prefix",
          servicePort: "80",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            ingressClassName: text(values, "ingressClassName", "nginx"),
            rules: [
              {
                host: text(values, "host", "example.local"),
                http: {
                  paths: [
                    {
                      path: text(values, "path", "/"),
                      pathType: text(values, "pathType", "Prefix"),
                      backend: {
                        service: {
                          name: text(
                            values,
                            "serviceName",
                            values.name?.trim() || "app",
                          ),
                          port: { number: integer(values, "servicePort", 80) },
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        }),
      );

    case "IngressClass":
      return createSpec(
        target,
        [
          {
            key: "controller",
            label: "Controller",
            placeholder: "example.com/ingress-controller",
          },
        ],
        { controller: "example.com/ingress-controller" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            controller: text(
              values,
              "controller",
              "example.com/ingress-controller",
            ),
          },
        }),
      );

    case "NetworkPolicy":
      return createSpec(
        target,
        [
          {
            key: "podSelector",
            label: "Pod selector",
            placeholder: "app=web",
            hint: "Defaults to app=<name>.",
          },
          {
            key: "ingressFrom",
            label: "Allow ingress from",
            placeholder: "app=client",
            hint: "Defaults to the same pod selector.",
          },
        ],
        {},
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            podSelector: {
              matchLabels: selectorFor(
                values,
                "podSelector",
                values.name?.trim() || "app",
              ),
            },
            policyTypes: ["Ingress"],
            ingress: [
              {
                from: [
                  {
                    podSelector: {
                      matchLabels: selectorFor(
                        values,
                        "ingressFrom",
                        values.name?.trim() || "app",
                      ),
                    },
                  },
                ],
              },
            ],
          },
        }),
      );

    case "ConfigMap":
      return createSpec(
        target,
        [
          {
            key: "data",
            label: "Data",
            type: "textarea",
            placeholder: "key=value",
            hint: "One key=value pair per line.",
          },
        ],
        { data: "key=value" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          data: parsePairs(values.data),
        }),
      );

    case "Secret":
      return createSpec(
        target,
        [
          {
            key: "secretType",
            label: "Secret type",
            type: "select",
            options: [
              "Opaque",
              "kubernetes.io/service-account-token",
              "kubernetes.io/dockerconfigjson",
              "kubernetes.io/tls",
              "kubernetes.io/basic-auth",
              "kubernetes.io/ssh-auth",
            ].map((value) => ({ label: value, value })),
          },
          {
            key: "data",
            label: "Data",
            type: "textarea",
            placeholder: "key=value",
            hint: "Written to stringData and base64 encoded by Kubernetes.",
          },
        ],
        { secretType: "Opaque", data: "key=value" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          type: text(values, "secretType", "Opaque"),
          stringData: parsePairs(values.data),
        }),
      );

    case "PersistentVolumeClaim":
      return createSpec(
        target,
        [
          {
            key: "accessMode",
            label: "Access mode",
            type: "select",
            options: ACCESS_MODES.map((value) => ({ label: value, value })),
          },
          { key: "storage", label: "Storage", placeholder: "1Gi" },
          {
            key: "storageClassName",
            label: "Storage class",
            placeholder: "standard",
          },
        ],
        {
          accessMode: "ReadWriteOnce",
          storage: "1Gi",
          storageClassName: "standard",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            accessModes: [text(values, "accessMode", "ReadWriteOnce")],
            resources: {
              requests: { storage: text(values, "storage", "1Gi") },
            },
            storageClassName: text(values, "storageClassName", "standard"),
          },
        }),
      );

    case "PersistentVolume":
      return createSpec(
        target,
        [
          { key: "storage", label: "Capacity", placeholder: "1Gi" },
          {
            key: "accessMode",
            label: "Access mode",
            type: "select",
            options: ACCESS_MODES.map((value) => ({ label: value, value })),
          },
          {
            key: "reclaimPolicy",
            label: "Reclaim policy",
            type: "select",
            options: ["Retain", "Delete", "Recycle"].map((value) => ({
              label: value,
              value,
            })),
          },
          {
            key: "storageClassName",
            label: "Storage class",
            placeholder: "manual",
          },
          {
            key: "hostPath",
            label: "Host path",
            placeholder: "/tmp/kubeview-data",
            hint: "Used by the default hostPath volume.",
          },
        ],
        {
          storage: "1Gi",
          accessMode: "ReadWriteOnce",
          reclaimPolicy: "Retain",
          storageClassName: "manual",
          hostPath: "/tmp/kubeview-data",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            capacity: { storage: text(values, "storage", "1Gi") },
            accessModes: [text(values, "accessMode", "ReadWriteOnce")],
            persistentVolumeReclaimPolicy: text(
              values,
              "reclaimPolicy",
              "Retain",
            ),
            storageClassName: text(values, "storageClassName", "manual"),
            hostPath: { path: text(values, "hostPath", "/tmp/kubeview-data") },
          },
        }),
      );

    case "StorageClass":
      return createSpec(
        target,
        [
          {
            key: "provisioner",
            label: "Provisioner",
            placeholder: "kubernetes.io/no-provisioner",
          },
          {
            key: "reclaimPolicy",
            label: "Reclaim policy",
            type: "select",
            options: ["Retain", "Delete", "Recycle"].map((value) => ({
              label: value,
              value,
            })),
          },
          {
            key: "volumeBindingMode",
            label: "Volume binding",
            type: "select",
            options: ["Immediate", "WaitForFirstConsumer"].map((value) => ({
              label: value,
              value,
            })),
          },
        ],
        {
          provisioner: "kubernetes.io/no-provisioner",
          reclaimPolicy: "Retain",
          volumeBindingMode: "WaitForFirstConsumer",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          provisioner: text(
            values,
            "provisioner",
            "kubernetes.io/no-provisioner",
          ),
          reclaimPolicy: text(values, "reclaimPolicy", "Retain"),
          volumeBindingMode: text(
            values,
            "volumeBindingMode",
            "WaitForFirstConsumer",
          ),
        }),
      );

    case "Namespace":
    case "ServiceAccount":
      return createSpec(target, [], {}, (values, current) => ({
        apiVersion: current.apiVersion,
        kind: current.kind,
        metadata: metadata(values),
      }));

    case "HorizontalPodAutoscaler":
      return createSpec(
        target,
        [
          {
            key: "targetKind",
            label: "Target kind",
            type: "select",
            options: ["Deployment", "StatefulSet", "ReplicaSet"].map(
              (value) => ({
                label: value,
                value,
              }),
            ),
          },
          {
            key: "targetName",
            label: "Target name",
            placeholder: "my-deployment",
          },
          {
            key: "minReplicas",
            label: "Min replicas",
            type: "number",
            placeholder: "1",
          },
          {
            key: "maxReplicas",
            label: "Max replicas",
            type: "number",
            placeholder: "5",
          },
          {
            key: "targetCPU",
            label: "CPU target (%)",
            type: "number",
            placeholder: "70",
          },
        ],
        {
          targetKind: "Deployment",
          minReplicas: "1",
          maxReplicas: "5",
          targetCPU: "70",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            scaleTargetRef: {
              apiVersion: "apps/v1",
              kind: text(values, "targetKind", "Deployment"),
              name: text(values, "targetName", values.name?.trim() || "app"),
            },
            minReplicas: integer(values, "minReplicas", 1),
            maxReplicas: integer(values, "maxReplicas", 5),
            metrics: [
              {
                type: "Resource",
                resource: {
                  name: "cpu",
                  target: {
                    type: "Utilization",
                    averageUtilization: integer(values, "targetCPU", 70),
                  },
                },
              },
            ],
          },
        }),
      );

    case "VerticalPodAutoscaler":
      return createSpec(
        target,
        [
          {
            key: "targetKind",
            label: "Target kind",
            type: "select",
            options: [
              "Deployment",
              "StatefulSet",
              "ReplicaSet",
              "DaemonSet",
            ].map((value) => ({ label: value, value })),
          },
          {
            key: "targetName",
            label: "Target name",
            placeholder: "my-deployment",
          },
          {
            key: "updateMode",
            label: "Update mode",
            type: "select",
            options: ["Off", "Initial", "Recreate", "Auto"].map((value) => ({
              label: value,
              value,
            })),
          },
        ],
        { targetKind: "Deployment", updateMode: "Off" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            targetRef: {
              apiVersion: "apps/v1",
              kind: text(values, "targetKind", "Deployment"),
              name: text(values, "targetName", values.name?.trim() || "app"),
            },
            updatePolicy: { updateMode: text(values, "updateMode", "Off") },
          },
        }),
      );

    case "PodDisruptionBudget":
      return createSpec(
        target,
        [
          {
            key: "strategy",
            label: "Budget type",
            type: "select",
            options: [
              { label: "minAvailable", value: "minAvailable" },
              { label: "maxUnavailable", value: "maxUnavailable" },
            ],
          },
          { key: "budget", label: "Value", type: "number", placeholder: "1" },
          {
            key: "selector",
            label: "Pod selector",
            placeholder: "app=web",
            hint: "Defaults to app=<name>.",
          },
        ],
        { strategy: "minAvailable", budget: "1" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            [text(values, "strategy", "minAvailable")]: integer(
              values,
              "budget",
              1,
            ),
            selector: {
              matchLabels: selectorFor(
                values,
                "selector",
                values.name?.trim() || "app",
              ),
            },
          },
        }),
      );

    case "ResourceQuota":
      return createSpec(
        target,
        [
          { key: "cpu", label: "CPU requests", placeholder: "2" },
          { key: "memory", label: "Memory requests", placeholder: "4Gi" },
          { key: "pods", label: "Max pods", type: "number", placeholder: "10" },
        ],
        { cpu: "2", memory: "4Gi", pods: "10" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            hard: {
              "requests.cpu": text(values, "cpu", "2"),
              "requests.memory": text(values, "memory", "4Gi"),
              pods: String(integer(values, "pods", 10)),
            },
          },
        }),
      );

    case "LimitRange":
      return createSpec(
        target,
        [
          { key: "defaultCpu", label: "Default CPU", placeholder: "500m" },
          {
            key: "defaultMemory",
            label: "Default memory",
            placeholder: "512Mi",
          },
          {
            key: "defaultRequestCpu",
            label: "Default request CPU",
            placeholder: "100m",
          },
          {
            key: "defaultRequestMemory",
            label: "Default request memory",
            placeholder: "128Mi",
          },
        ],
        {
          defaultCpu: "500m",
          defaultMemory: "512Mi",
          defaultRequestCpu: "100m",
          defaultRequestMemory: "128Mi",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            limits: [
              {
                type: "Container",
                default: {
                  cpu: text(values, "defaultCpu", "500m"),
                  memory: text(values, "defaultMemory", "512Mi"),
                },
                defaultRequest: {
                  cpu: text(values, "defaultRequestCpu", "100m"),
                  memory: text(values, "defaultRequestMemory", "128Mi"),
                },
              },
            ],
          },
        }),
      );

    case "PriorityClass":
      return createSpec(
        target,
        [
          {
            key: "value",
            label: "Priority value",
            type: "number",
            placeholder: "1000",
          },
          {
            key: "globalDefault",
            label: "Global default",
            type: "select",
            options: [
              { label: "No", value: "false" },
              { label: "Yes", value: "true" },
            ],
          },
          {
            key: "description",
            label: "Description",
            placeholder: "Used by important workloads",
          },
        ],
        { value: "1000", globalDefault: "false" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          value: integer(values, "value", 1000),
          globalDefault: values.globalDefault === "true",
          description: text(values, "description"),
        }),
      );

    case "RuntimeClass":
      return createSpec(
        target,
        [{ key: "handler", label: "Handler", placeholder: "runc" }],
        { handler: "runc" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          handler: text(values, "handler", "runc"),
        }),
      );

    case "Lease":
      return createSpec(
        target,
        [
          {
            key: "holderIdentity",
            label: "Holder identity",
            placeholder: "kubeview",
          },
          {
            key: "leaseDurationSeconds",
            label: "Lease duration (s)",
            type: "number",
            placeholder: "15",
          },
        ],
        { holderIdentity: "kubeview", leaseDurationSeconds: "15" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            holderIdentity: text(values, "holderIdentity", "kubeview"),
            leaseDurationSeconds: integer(values, "leaseDurationSeconds", 15),
          },
        }),
      );

    case "Role":
    case "ClusterRole":
      return createSpec(
        target,
        [
          {
            key: "apiGroups",
            label: "API groups",
            placeholder: '""',
            hint: 'Comma-separated; use "" for the core group.',
          },
          { key: "resources", label: "Resources", placeholder: "pods" },
          { key: "verbs", label: "Verbs", placeholder: "get, list, watch" },
        ],
        { apiGroups: "", resources: "pods", verbs: "get, list, watch" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          rules: [
            {
              apiGroups: splitList(values.apiGroups).length
                ? splitList(values.apiGroups)
                : [""],
              resources: splitList(values.resources).length
                ? splitList(values.resources)
                : ["pods"],
              verbs: splitList(values.verbs).length
                ? splitList(values.verbs)
                : ["get", "list", "watch"],
            },
          ],
        }),
      );

    case "RoleBinding":
    case "ClusterRoleBinding": {
      const bindingIsClusterRole = kind === "ClusterRoleBinding";
      return createSpec(
        target,
        [
          {
            key: "roleName",
            label: "Role name",
            placeholder: bindingIsClusterRole ? "cluster-admin" : "pod-reader",
          },
          {
            key: "subjectKind",
            label: "Subject kind",
            type: "select",
            options: ["ServiceAccount", "User", "Group"].map((value) => ({
              label: value,
              value,
            })),
          },
          { key: "subjectName", label: "Subject name", placeholder: "default" },
          {
            key: "subjectNamespace",
            label: "Subject namespace",
            placeholder: "default",
            hint: "Required for ServiceAccount subjects.",
          },
        ],
        {
          roleName: bindingIsClusterRole ? "view" : "pod-reader",
          subjectKind: "ServiceAccount",
          subjectName: "default",
          subjectNamespace: "default",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: bindingIsClusterRole ? "ClusterRole" : "Role",
            name: text(values, "roleName", values.name?.trim() || "role"),
          },
          subjects: [
            {
              kind: text(values, "subjectKind", "ServiceAccount"),
              name: text(values, "subjectName", "default"),
              ...(text(values, "subjectKind", "ServiceAccount") ===
              "ServiceAccount"
                ? { namespace: text(values, "subjectNamespace", "default") }
                : {}),
            },
          ],
        }),
      );
    }

    case "CustomResourceDefinition":
      return {
        ...createSpec(
          target,
          [
            { key: "group", label: "API group", placeholder: "example.com" },
            { key: "plural", label: "Plural", placeholder: "widgets" },
            { key: "singular", label: "Singular", placeholder: "widget" },
            { key: "crdKind", label: "Kind", placeholder: "Widget" },
            {
              key: "scope",
              label: "Scope",
              type: "select",
              options: ["Namespaced", "Cluster"].map((value) => ({
                label: value,
                value,
              })),
            },
            { key: "version", label: "Version", placeholder: "v1" },
          ],
          {
            group: "example.com",
            plural: "widgets",
            singular: "widget",
            crdKind: "Widget",
            scope: "Namespaced",
            version: "v1",
          },
          (values, current) => ({
            apiVersion: current.apiVersion,
            kind: current.kind,
            metadata: metadata(values),
            spec: {
              group: text(values, "group", "example.com"),
              names: {
                plural: text(values, "plural", "widgets"),
                singular: text(values, "singular", "widget"),
                kind: text(values, "crdKind", "Widget"),
              },
              scope: text(values, "scope", "Namespaced"),
              versions: [
                {
                  name: text(values, "version", "v1"),
                  served: true,
                  storage: true,
                  schema: {
                    openAPIV3Schema: {
                      type: "object",
                      properties: { spec: { type: "object" } },
                    },
                  },
                },
              ],
            },
          }),
          (values) => {
            const expected = `${text(values, "plural", "widgets")}.${text(
              values,
              "group",
              "example.com",
            )}`;
            return (values.name ?? "").trim() === expected
              ? null
              : `CustomResourceDefinition names must be <plural>.<group> (${expected}).`;
          },
        ),
        suggestedName: "widgets.example.com",
      };

    case "MutatingWebhookConfiguration":
    case "ValidatingWebhookConfiguration":
      return createSpec(
        target,
        [
          {
            key: "webhookName",
            label: "Webhook name",
            placeholder: "my-webhook",
          },
          {
            key: "serviceName",
            label: "Service name",
            placeholder: "webhook-service",
          },
          {
            key: "serviceNamespace",
            label: "Service namespace",
            placeholder: "default",
          },
          { key: "path", label: "Path", placeholder: "/validate" },
        ],
        { serviceName: "", serviceNamespace: "default", path: "/validate" },
        (values, current) => {
          const rawName = text(
            values,
            "webhookName",
            values.name?.trim() || "webhook",
          );
          const webhookName = rawName.includes(".")
            ? rawName
            : `${rawName}.example.com`;
          return {
            apiVersion: current.apiVersion,
            kind: current.kind,
            metadata: metadata(values),
            webhooks: [
              {
                name: webhookName,
                admissionReviewVersions: ["v1"],
                sideEffects: "None",
                failurePolicy: "Ignore",
                clientConfig: {
                  service: {
                    name: text(
                      values,
                      "serviceName",
                      values.name?.trim() || "webhook",
                    ),
                    namespace: text(values, "serviceNamespace", "default"),
                    path: text(values, "path", "/validate"),
                    port: 443,
                  },
                },
                rules: [
                  {
                    apiGroups: [""],
                    apiVersions: ["v1"],
                    operations: ["CREATE", "UPDATE"],
                    resources: ["pods"],
                  },
                ],
              },
            ],
          };
        },
      );

    case "ValidatingAdmissionPolicy":
      return createSpec(
        target,
        [
          { key: "apiGroups", label: "API groups", placeholder: '""' },
          { key: "apiVersions", label: "API versions", placeholder: "v1" },
          { key: "resources", label: "Resources", placeholder: "pods" },
          {
            key: "operations",
            label: "Operations",
            placeholder: "CREATE, UPDATE",
          },
          {
            key: "expression",
            label: "Validation expression",
            placeholder: "true",
            hint: "CEL expression evaluated by the API server.",
          },
        ],
        {
          apiGroups: "",
          apiVersions: "v1",
          resources: "pods",
          operations: "CREATE, UPDATE",
          expression: "true",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            matchConstraints: {
              resourceRules: [
                {
                  apiGroups: splitList(values.apiGroups).length
                    ? splitList(values.apiGroups)
                    : [""],
                  apiVersions: splitList(values.apiVersions).length
                    ? splitList(values.apiVersions)
                    : ["v1"],
                  operations: splitList(values.operations).length
                    ? splitList(values.operations)
                    : ["CREATE"],
                  resources: splitList(values.resources).length
                    ? splitList(values.resources)
                    : ["pods"],
                },
              ],
            },
            validations: [{ expression: text(values, "expression", "true") }],
          },
        }),
      );

    case "ValidatingAdmissionPolicyBinding":
      return createSpec(
        target,
        [
          {
            key: "policyName",
            label: "Policy name",
            placeholder: "my-policy",
          },
          {
            key: "validationActions",
            label: "Validation actions",
            placeholder: "Deny, Warn",
            hint: "Comma-separated: Deny, Warn, or Audit.",
          },
        ],
        { validationActions: "Deny" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            policyName: text(
              values,
              "policyName",
              values.name?.trim() || "policy",
            ),
            validationActions: splitList(values.validationActions).length
              ? splitList(values.validationActions)
              : ["Deny"],
          },
        }),
      );

    case "GatewayClass":
      return createSpec(
        target,
        [
          {
            key: "controllerName",
            label: "Controller name",
            placeholder: "example.com/gateway-controller",
          },
        ],
        { controllerName: "example.com/gateway-controller" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            controllerName: text(
              values,
              "controllerName",
              "example.com/gateway-controller",
            ),
          },
        }),
      );

    case "Gateway":
      return createSpec(
        target,
        [
          {
            key: "gatewayClassName",
            label: "Gateway class",
            placeholder: "my-gateway-class",
          },
          { key: "listenerName", label: "Listener name", placeholder: "http" },
          {
            key: "protocol",
            label: "Protocol",
            type: "select",
            options: ["HTTP", "HTTPS", "TLS", "TCP", "UDP"].map((value) => ({
              label: value,
              value,
            })),
          },
          { key: "port", label: "Port", type: "number", placeholder: "80" },
        ],
        {
          gatewayClassName: "",
          listenerName: "http",
          protocol: "HTTP",
          port: "80",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            gatewayClassName: text(
              values,
              "gatewayClassName",
              values.name?.trim() || "gateway",
            ),
            listeners: [
              {
                name: text(values, "listenerName", "http"),
                protocol: text(values, "protocol", "HTTP"),
                port: integer(values, "port", 80),
              },
            ],
          },
        }),
      );

    case "HTTPRoute":
      return createSpec(
        target,
        [
          {
            key: "parentRef",
            label: "Parent gateway",
            placeholder: "my-gateway",
          },
          { key: "hostname", label: "Hostname", placeholder: "example.local" },
          { key: "path", label: "Path", placeholder: "/" },
          {
            key: "pathType",
            label: "Path type",
            type: "select",
            options: ["PathPrefix", "Exact"].map((value) => ({
              label: value,
              value,
            })),
          },
          {
            key: "serviceName",
            label: "Backend service",
            placeholder: "my-service",
          },
          {
            key: "servicePort",
            label: "Service port",
            type: "number",
            placeholder: "80",
          },
        ],
        {
          path: "/",
          pathType: "PathPrefix",
          servicePort: "80",
        },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            parentRefs: [
              {
                name: text(
                  values,
                  "parentRef",
                  values.name?.trim() || "gateway",
                ),
              },
            ],
            ...(text(values, "hostname")
              ? { hostnames: [text(values, "hostname")] }
              : {}),
            rules: [
              {
                matches: [
                  {
                    path: {
                      type: text(values, "pathType", "PathPrefix"),
                      value: text(values, "path", "/"),
                    },
                  },
                ],
                backendRefs: [
                  {
                    name: text(
                      values,
                      "serviceName",
                      values.name?.trim() || "app",
                    ),
                    port: integer(values, "servicePort", 80),
                  },
                ],
              },
            ],
          },
        }),
      );

    case "GRPCRoute":
      return createSpec(
        target,
        [
          {
            key: "parentRef",
            label: "Parent gateway",
            placeholder: "my-gateway",
          },
          {
            key: "hostname",
            label: "Hostname",
            placeholder: "grpc.example.local",
          },
          {
            key: "serviceName",
            label: "Backend service",
            placeholder: "my-service",
          },
          {
            key: "servicePort",
            label: "Service port",
            type: "number",
            placeholder: "50051",
          },
        ],
        { servicePort: "50051" },
        (values, current) => ({
          apiVersion: current.apiVersion,
          kind: current.kind,
          metadata: metadata(values),
          spec: {
            parentRefs: [
              {
                name: text(
                  values,
                  "parentRef",
                  values.name?.trim() || "gateway",
                ),
              },
            ],
            ...(text(values, "hostname")
              ? { hostnames: [text(values, "hostname")] }
              : {}),
            rules: [
              {
                backendRefs: [
                  {
                    name: text(
                      values,
                      "serviceName",
                      values.name?.trim() || "app",
                    ),
                    port: integer(values, "servicePort", 50051),
                  },
                ],
              },
            ],
          },
        }),
      );

    default:
      return {
        ...createSpec(
          target,
          [
            {
              key: "specJson",
              label: "Spec (JSON)",
              type: "textarea",
              placeholder: '{\n  "key": "value"\n}',
              hint: "The CRD-specific spec as JSON. Use Advanced YAML for full control.",
            },
          ],
          { specJson: "{}" },
          (values, current) => {
            let spec: Record<string, unknown> = {};
            try {
              const parsed: unknown = JSON.parse(values.specJson || "{}");
              if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
              ) {
                spec = parsed as Record<string, unknown>;
              }
            } catch {
              spec = {};
            }
            return {
              apiVersion: current.apiVersion,
              kind: current.kind,
              metadata: metadata(values),
              spec,
            };
          },
          (values) => {
            try {
              const parsed: unknown = JSON.parse(values.specJson || "{}");
              if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
              ) {
                return "Spec must be a JSON object.";
              }
              return null;
            } catch {
              return "Spec is not valid JSON.";
            }
          },
        ),
      };
  }
}

/** Build the initial values for a create form, including common fields. */
export function initialCreateFormValues(
  target: ResourceEditorTarget,
): CreateFormValues {
  const spec = createFormSpecFor(target);
  return {
    name:
      target.name || spec.suggestedName || `my-${target.kind.toLowerCase()}`,
    namespace: target.namespace || "",
    labels: "",
    ...spec.defaults,
  };
}

/** Build the YAML manifest for current form values. */
export function buildCreateFormManifest(
  target: ResourceEditorTarget,
  values: CreateFormValues,
): string {
  const spec = createFormSpecFor(target);
  return toManifestYaml(spec.build(values, target));
}
