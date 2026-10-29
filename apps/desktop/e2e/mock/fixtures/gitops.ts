import { now } from "./shared";

const cleanDeploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: example/web:v1
`;

const changedServiceDesiredYaml = `apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: production
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
`;

const changedServiceLiveYaml = `apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: production
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 9090
`;

const missingConfigMapYaml = `apiVersion: v1
kind: ConfigMap
metadata:
  name: web-config
  namespace: production
data:
  APP_ENV: production
`;

export const gitOpsReport = {
  contextName: "mock-cluster",
  path: "/workspace/gitops",
  scannedAt: now,
  total: 3,
  clean: 1,
  changed: 1,
  missing: 1,
  errors: 0,
  resources: [
    {
      apiVersion: "apps/v1",
      kind: "Deployment",
      resource: "deployments",
      name: "web",
      namespace: "production",
      sourceFile: "apps/web/deployment.yaml",
      status: "clean",
      desiredYaml: cleanDeploymentYaml,
      liveYaml: cleanDeploymentYaml,
    },
    {
      apiVersion: "v1",
      kind: "Service",
      resource: "services",
      name: "web",
      namespace: "production",
      sourceFile: "apps/web/service.yaml",
      status: "changed",
      desiredYaml: changedServiceDesiredYaml,
      liveYaml: changedServiceLiveYaml,
    },
    {
      apiVersion: "v1",
      kind: "ConfigMap",
      resource: "configmaps",
      name: "web-config",
      namespace: "production",
      sourceFile: "apps/web/configmap.yaml",
      status: "missing",
      desiredYaml: missingConfigMapYaml,
    },
  ],
};
