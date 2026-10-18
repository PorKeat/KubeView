import { create } from "zustand";

export interface ClusterContextInfo {
  name: string;
  cluster: string;
  server: string;
  provider: "kind" | "eks" | "gke" | "aks" | "minikube" | "generic";
  status: "connected" | "offline" | "checking";
  latencyMs: number;
}

export interface SelectedResource {
  kind: string;
  name: string;
  namespace: string;
  status: string;
  data?: Record<string, unknown>;
}

interface ClusterState {
  currentContext: string;
  availableContexts: ClusterContextInfo[];
  currentNamespace: string;
  availableNamespaces: string[];
  connectionStatus: "connected" | "checking" | "offline";
  serverVersion: string;
  latencyMs: number;
  rbacMode: "cluster-admin" | "namespace-scoped";
  selectedResource: SelectedResource | null;
  isInspectorOpen: boolean;
  setCurrentContext: (context: string) => void;
  setCurrentNamespace: (namespace: string) => void;
  setConnectionStatus: (status: "connected" | "checking" | "offline") => void;
  setServerInfo: (version: string, latency: number) => void;
  openInspector: (resource: SelectedResource) => void;
  closeInspector: () => void;
}

export const useClusterStore = create<ClusterState>((set) => ({
  currentContext: "kind-kubeview",
  availableContexts: [
    {
      name: "kind-kubeview",
      cluster: "kind-kubeview",
      server: "https://127.0.0.1:51443",
      provider: "kind",
      status: "connected",
      latencyMs: 12,
    },
    {
      name: "minikube",
      cluster: "minikube",
      server: "https://192.168.49.2:8443",
      provider: "minikube",
      status: "connected",
      latencyMs: 18,
    },
    {
      name: "aws-eks-us-east-1-prod",
      cluster: "arn:aws:eks:us-east-1:123456789012:cluster/prod",
      server: "https://A1B2C3D4.gr7.us-east-1.eks.amazonaws.com",
      provider: "eks",
      status: "connected",
      latencyMs: 44,
    },
    {
      name: "gke-staging-cluster",
      cluster: "gke_prod-project_us-central1_staging",
      server: "https://34.120.55.91",
      provider: "gke",
      status: "connected",
      latencyMs: 56,
    },
  ],
  currentNamespace: "all",
  availableNamespaces: [
    "all",
    "default",
    "kube-system",
    "production",
    "staging",
    "monitoring",
    "ingress-nginx",
    "cert-manager",
  ],
  connectionStatus: "connected",
  serverVersion: "v1.34.1",
  latencyMs: 14,
  rbacMode: "cluster-admin",
  selectedResource: null,
  isInspectorOpen: false,
  setCurrentContext: (context) => set({ currentContext: context }),
  setCurrentNamespace: (namespace) => set({ currentNamespace: namespace }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setServerInfo: (version, latency) => set({ serverVersion: version, latencyMs: latency }),
  openInspector: (resource) => set({ selectedResource: resource, isInspectorOpen: true }),
  closeInspector: () => set({ selectedResource: null, isInspectorOpen: false }),
}));
