import { now } from "./shared";

export const configMapSummary = {
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

export const secretSummary = {
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

export const persistentVolumeSummary = {
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

export const storageClassSummary = {
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

export const configMapYaml = `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  app.conf: enabled=true`;

export const secretYaml = `apiVersion: v1
kind: Secret
metadata:
  name: database-secret
  namespace: production
type: Opaque
data:
  password: <redacted>`;

export const persistentVolumeYaml = `apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-data
spec:
  capacity:
    storage: 5Gi
  storageClassName: fast`;

export const storageClassYaml = `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: kubernetes.io/aws-ebs
reclaimPolicy: Delete`;

export const configMapEditData = {
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

export const secretEditData = {
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

export const serviceAccountSummary = {
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

export const roleSummary = {
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

export const clusterRoleSummary = {
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

export const roleBindingSummary = {
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

export const crdSummary = {
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

export const serviceAccountYaml = `apiVersion: v1
kind: ServiceAccount
metadata:
  name: default
  namespace: production
secrets:
  - name: default-token`;

export const roleYaml = `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]`;

export const crdYaml = `apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: widgets.example.com
spec:
  group: example.com
  names:
    kind: Widget
    plural: widgets
  scope: Namespaced`;

export const sampleYaml: Record<string, string> = {
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
